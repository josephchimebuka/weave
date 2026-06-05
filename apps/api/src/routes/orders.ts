import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { parseAsset } from '../lib/assets';
import { planRoute, type Flow } from '../services/router.service';
import { executeOrder, syncOrder, toDepositInstruction } from '../services/executor.service';
import { resolveInstrument, bankFromInstrument, type InstrumentRef } from '../lib/instruments';
import { paycrest } from '../services/paycrest.service';
import { nearIntents, classifyNearStatus } from '../services/nearintents.service';
import { Decimal } from 'decimal.js';

const router = Router();

// Prisma Decimal fields serialize to strings in JSON. Convert them to numbers
// at the API boundary so dashboard and widget consumers don't need to change.
function serializeOrder(order: any) {
  const decNum = (v: any) => v != null ? Number(v) : v;
  return {
    ...order,
    sourceAmount: decNum(order.sourceAmount),
    destAmount:   decNum(order.destAmount),
    quoteRate:    decNum(order.quoteRate),
    senderFeeUsd: decNum(order.senderFeeUsd),
    appFeeUsd:    decNum(order.appFeeUsd),
    bridgeFeeUsd: decNum(order.bridgeFeeUsd),
    steps: order.steps?.map((s: any) => ({
      ...s,
      amountIn:  decNum(s.amountIn),
      amountOut: decNum(s.amountOut),
      feeUsd:    decNum(s.feeUsd),
    })),
  };
}

interface CreateOrderBody {
  source: InstrumentRef;
  dest?: InstrumentRef;
  amount: number;
  amountIn?: 'source' | 'dest';
  reference?: string;
  flow?: Flow;
  // Explicit refund destination on the origin chain. In the external flow we
  // don't know who'll actually pay the deposit address, so the widget collects
  // a refund wallet from the user and sends it here. Takes precedence over the
  // source instrument's walletAddress when both are set.
  refundAddress?: string;
  sessionId?: string;
  // Optional payer identity, pure passthrough — Weave does not verify any of
  // these. Echoed on the order, in webhooks, and on receipts.
  customer?: { email?: string; name?: string; externalId?: string };
}

// Whitelist customer fields and reject if shape is wrong. Returns sanitized
// value or null. Throws on invalid shape so route returns a 400.
function sanitizeCustomer(raw: unknown): { email?: string; name?: string; externalId?: string } | null {
  if (raw == null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('customer must be an object');
  }
  const out: { email?: string; name?: string; externalId?: string } = {};
  const c = raw as Record<string, unknown>;
  if (c.email !== undefined) {
    if (typeof c.email !== 'string' || c.email.length > 320) throw new Error('customer.email must be a string up to 320 chars');
    out.email = c.email;
  }
  if (c.name !== undefined) {
    if (typeof c.name !== 'string' || c.name.length > 200) throw new Error('customer.name must be a string up to 200 chars');
    out.name = c.name;
  }
  if (c.externalId !== undefined) {
    if (typeof c.externalId !== 'string' || c.externalId.length > 200) throw new Error('customer.externalId must be a string up to 200 chars');
    out.externalId = c.externalId;
  }
  return Object.keys(out).length ? out : null;
}

// POST /api/v1/orders — direction-agnostic order creation.
router.post('/', requireAuth, async (req, res) => {
  const body = req.body as CreateOrderBody;
  const amount = Number(body?.amount);

  if (!body?.source || body?.amount === undefined) {
    return res.status(400).json({ success: false, error: 'Missing source, amount' });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' });
  }
  
  // Re-assign as number to body for downstream usage
  body.amount = amount;
  if (body.reference && body.reference.length > 100) {
    return res.status(400).json({ success: false, error: 'Reference too long' });
  }

  // Sanitize merchant-supplied customer info (pure passthrough — we never verify).
  // Validate up-front so a malformed shape returns 400 cleanly.
  let customer: { email?: string; name?: string; externalId?: string } | null;
  try {
    customer = sanitizeCustomer(body.customer);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }

  try {
    // Validate inline source shape early so we return a clean 400
    if ('inline' in body.source) {
      const d = body.source.inline;
      if (!d?.kind || !d?.assetKey) {
        return res.status(400).json({ success: false, error: 'source.inline requires kind and assetKey' });
      }
      // Bank details are optional at this layer — Paystack DVA flows don't need
      // them (payer just transfers to the DVA). The executor enforces them when
      // the route requires a Paycrest refund account.
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(401).json({ success: false, error: 'Unknown merchant' });

    // Unverified merchants (no email verification) cannot place orders.
    if (!merchant.emailVerifiedAt && merchant.kycLevel === 'none') {
      return res.status(403).json({
        success: false,
        error:   'Email verification required before placing orders.',
        code:    'EMAIL_VERIFICATION_REQUIRED',
      });
    }

    // Basic-tier merchants (email verified, not yet fully KYB'd) are capped at
    // 30 non-failed orders per rolling 30-day window to limit compliance exposure.
    if (merchant.kycLevel === 'basic') {
      const BASIC_MONTHLY_LIMIT = 30;
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const count = await prisma.order.count({
        where: { merchantId: req.merchantId, status: { not: 'failed' }, createdAt: { gte: since } },
      });
      if (count >= BASIC_MONTHLY_LIMIT) {
        return res.status(403).json({
          success: false,
          error:   'Monthly order limit reached for your account tier. Complete business verification (KYB) to continue.',
          code:    'TIER_LIMIT_EXCEEDED',
        });
      }
    }

    const sourceInstrument = await resolveInstrument(body.source, merchant.id);

    let destInstrument;
    if (body.dest) {
      destInstrument = await resolveInstrument(body.dest, merchant.id);
    } else {
      if (!merchant.defaultPayoutInstrumentId) {
        return res.status(400).json({ success: false, error: 'No dest instrument and merchant has no default payout configured' });
      }
      destInstrument = await prisma.instrument.findUnique({ where: { id: merchant.defaultPayoutInstrumentId } });
      if (!destInstrument) return res.status(500).json({ success: false, error: 'Default payout instrument missing' });
    }

    // 2. Plan route across provider edges. Flow defaults to 'external' so
    //    NEAR Intents handles the cross-chain leg via deposit address; pass
    //    'self' to bias toward ChainRails (wired-in-wallet flow) once ready.
    const plan = planRoute({
      sourceAsset: sourceInstrument.assetKey,
      destAsset: destInstrument.assetKey,
      amount: body.amount,
      flow: body.flow ?? 'external',
    });

    // 3. Snapshot a Paycrest rate when the route touches fiat (for the quote
    //    figure the widget shows) AND compute the USD-equivalent of the
    //    source-asset-denominated amount the widget sent. The executor needs
    //    both: sourceAmount drives the first-hop deposit, usdEquivalent drives
    //    the USDC-on-Base intermediate legs.
    const SENDER_FEE_BPS = Number(process.env.SENDER_FEE_BPS ?? 75);
    const APP_FEE_BPS = Number(process.env.APP_FEE_BPS ?? 10);
    const SLIPPAGE_BUFFER_BPS = Number(process.env.SLIPPAGE_BUFFER_BPS ?? 200);

    const srcP = parseAsset(sourceInstrument.assetKey);
    const dstP = parseAsset(destInstrument.assetKey);
    let quoteRate: number | null = null;
    let usdEquivalent = body.amount;
    let sourceAmount = body.amountIn === 'dest' ? 0 : body.amount;
    let destAmountFiat: number | undefined = undefined;
    let appFeeBps: number | undefined = undefined;

    try {
      const fiat = srcP.kind === 'fiat' ? srcP.currency : dstP.kind === 'fiat' ? dstP.currency : null;
      let sellRate = 1; let buyRate = 1;
      if (fiat) {
        const r = await paycrest.getRate('base', 'USDC', 1, fiat);
        sellRate = Number(r.sell.rate) || 1;
        buyRate = Number(r.buy.rate) || 1;
        quoteRate = srcP.kind === 'fiat' ? buyRate : sellRate;
      }

      if (body.amountIn === 'dest') {
        if (srcP.kind === 'crypto' && dstP.kind === 'fiat') {
          // Offramp: User pays crypto (sourceAmount), Merchant gets target fiat (body.amount)
          destAmountFiat = body.amount;
          const targetFiat = new Decimal(body.amount);
          const sr = new Decimal(sellRate);
          const senderFeePct = new Decimal(SENDER_FEE_BPS).div(10000);

          const netUsdc = targetFiat.div(sr);
          const targetUsdc = netUsdc.div(new Decimal(1).minus(senderFeePct));

          const hasSwap = plan.steps.some(s => s.provider === 'nearintents');
          const appFeePct = new Decimal(APP_FEE_BPS).div(10000);
          const slippagePct = hasSwap ? new Decimal(SLIPPAGE_BUFFER_BPS).div(10000) : new Decimal(0);
          const totalUsdc = targetUsdc.div(new Decimal(1).minus(appFeePct).minus(slippagePct));

          usdEquivalent = totalUsdc.toNumber();
          appFeeBps = APP_FEE_BPS + (hasSwap ? SLIPPAGE_BUFFER_BPS : 0);
        } else if (srcP.kind === 'fiat' && dstP.kind === 'crypto') {
          // Onramp: User pays fiat (sourceAmount), Merchant gets target crypto value (body.amount in fiat)
          const targetFiat = new Decimal(body.amount);
          const br = new Decimal(buyRate);
          const feePct = new Decimal(SENDER_FEE_BPS + APP_FEE_BPS).div(10000);

          // Total fiat needed = Target / (1 - fee%)
          const totalFiat = targetFiat.div(new Decimal(1).minus(feePct));
          sourceAmount = totalFiat.toNumber();
          usdEquivalent = totalFiat.div(br).toNumber();
          appFeeBps = APP_FEE_BPS;
        } else if (srcP.kind === 'fiat' && dstP.kind === 'fiat') {
          // Fiat to Fiat: User pays fiat (sourceAmount), Merchant gets target fiat (body.amount)
          const targetFiat = new Decimal(body.amount);
          
          const isPurePaystack = plan.steps.length === 1 && plan.steps[0].provider === 'paystack';

          if (isPurePaystack) {
            // Paystack handles its own gross-up in the executor.
            // We set sourceAmount = target, and the executor will turn 700 -> 714
            sourceAmount = targetFiat.toNumber();
            usdEquivalent = targetFiat.div(sellRate).toNumber(); // for reporting
            appFeeBps = 0; // handled by paystack.grossUp
            destAmountFiat = body.amount;
          } else {
            const sr = new Decimal(sellRate);
            const br = new Decimal(buyRate);

            // 1. USDC needed for offramp
            const senderFeePct = new Decimal(SENDER_FEE_BPS).div(10000);
            const netUsdc = targetFiat.div(sr);
            const targetUsdc = netUsdc.div(new Decimal(1).minus(senderFeePct));

            // 2. Add bridge/slippage buffers if any
            const appFeePct = new Decimal(APP_FEE_BPS).div(10000);
            const totalUsdc = targetUsdc.div(new Decimal(1).minus(appFeePct));

            // 3. Convert total USDC to source fiat
            sourceAmount = totalUsdc.mul(br).toNumber();
            usdEquivalent = totalUsdc.toNumber();
            appFeeBps = APP_FEE_BPS;
            destAmountFiat = body.amount;
          }
        }
      } else {
        // Standard 'amountIn === source' logic
        if (srcP.kind === 'crypto') {
          const token = await nearIntents.resolveToken(sourceInstrument.assetKey);
          if (token.price > 0) usdEquivalent = body.amount * token.price;
        } else if (srcP.kind === 'fiat') {
          sourceAmount = body.amount;
          usdEquivalent = body.amount / buyRate;
        }
      }

      if (srcP.kind === 'crypto' && body.amountIn === 'dest' && (!sourceAmount || sourceAmount === 0)) {
        try {
          const token = await nearIntents.resolveToken(sourceInstrument.assetKey);
          if (token.price > 0) {
            sourceAmount = usdEquivalent / token.price;
          } else if (sourceInstrument.assetKey.toUpperCase().includes('USD')) {
            sourceAmount = usdEquivalent;
          }
        } catch (err: any) {
          console.warn(`[orders] failed to resolve price for ${sourceInstrument.assetKey}, using fallback:`, err.message);
          if (sourceInstrument.assetKey.toUpperCase().includes('USD')) {
            sourceAmount = usdEquivalent;
          }
        }
      }
    } catch (err: any) {
      console.error(`[orders] calculation error:`, err.message);
    }

    // 4. Create or Reuse the Order row (Idempotency)
    // If the merchant provided a reference, check for an existing order first.
    let order: any;

    // Auto-link to Checkout Session if provided
    let checkoutSession = null;
    if (body.sessionId) {
      checkoutSession = await prisma.checkoutSession.findUnique({
        where: { id: body.sessionId, merchantId: merchant.id }
      });
    }

    if (body.reference) {
      order = await prisma.order.findFirst({
        where: {
          merchantId: merchant.id,
          reference: body.reference,
          sandboxMode: req.sandboxMode ?? false,
          // Only reuse if it's the same amount and asset to avoid collisions
          sourceAmount,
          sourceAssetKey: sourceInstrument.assetKey,
        },
        include: { steps: { orderBy: { sequence: 'asc' } } }
      });
    }

    if (!order) {
      // Resolve customer identity: body wins, fall back to the session's customer
      // when the order was triggered from a hosted checkout. Pure passthrough —
      // never verified; echoed in webhooks and emails.
      const resolvedCustomer = customer ?? (checkoutSession?.customer as any) ?? undefined;

      try {
        order = await prisma.order.create({
          data: {
            merchantId: merchant.id,
            sourceInstrumentId: sourceInstrument.id,
            destInstrumentId: destInstrument.id,
            sourceAssetKey: sourceInstrument.assetKey,
            destAssetKey: destInstrument.assetKey,
            sourceAmount,
            status: 'awaiting_deposit',
            routePlan: plan as any,
            quoteRate,
            reference: body.reference || (checkoutSession ? checkoutSession.reference : null),
            customer: resolvedCustomer,
            sandboxMode: req.sandboxMode ?? false,
          },
        });
        console.log(`[orders] created new order: ${order.id}`);

        // Link to checkout session if it exists and isn't already linked
        if (checkoutSession && !checkoutSession.orderId) {
          await prisma.checkoutSession.update({
            where: { id: checkoutSession.id },
            data: { 
              orderId: order.id,
              status: 'processing' 
            }
          });
          console.log(`[orders] linked session ${checkoutSession.id} to order ${order.id}`);
        }
      } catch (createErr: any) {
        // P2002 = unique constraint violation — concurrent request with the same reference
        if (createErr?.code === 'P2002' && body.reference) {
          const existing = await prisma.order.findFirst({
            where: { merchantId: merchant.id, reference: body.reference },
          });
          if (existing) {
            return res.status(409).json({
              success: false,
              error: 'An order with this reference already exists',
              data: { orderId: existing.id },
            });
          }
        }
        throw createErr;
      }
    } else {
      console.log(`[orders] reusing existing order for ref ${body.reference}: ${order.id}`);
    }

    // 5. Execute: create provider resources (reverse order), persist RouteSteps,
    //    return nextAction for the widget.

    // Prefer the explicit user-provided refundAddress. The source instrument's
    // walletAddress is a fallback for the 'self' flow where the user's connected
    // wallet IS both sender and refund target.
    const refundAddress = srcP.kind === 'crypto'
      ? (body.refundAddress || sourceInstrument.walletAddress || '')
      : undefined;
    const refundAccount = srcP.kind === 'fiat' ? (bankFromInstrument(sourceInstrument) ?? undefined) : undefined;
    const destBank = dstP.kind === 'fiat' ? (bankFromInstrument(destInstrument) ?? undefined) : undefined;
    const destWallet = dstP.kind === 'crypto' ? (destInstrument.walletAddress ?? '') : undefined;

    const execResult = await executeOrder({
      orderId: order.id,
      merchantId: order.merchantId,
      plan,
      sourceAmount,
      usdEquivalent,
      destAmountFiat,
      appFeeBps,
      reference: order.id,
      merchantMemo: `Weave ${order.id}`,
      refundAddress,
      refundAccount,
      destBank,
      destWallet,
      sandboxMode: req.sandboxMode ?? false,
    });

    // 6. Roll final fee + destAmount snapshot onto the Order.
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        sourceAmount: execResult.steps[0].amountIn, // Corrected amount including fees
        destAmount: execResult.destAmount,
        senderFeeUsd: execResult.feeSummary.senderFeeUsd,
        appFeeUsd: execResult.feeSummary.appFeeUsd,
        bridgeFeeUsd: execResult.feeSummary.bridgeFeeUsd,
      },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });

    // (Session linking already handled inline after order creation above.)

    res.json({
      success: true,
      data: {
        order: serializeOrder(updated),
        // `depositInstruction` is the framework-agnostic shape — preferred for
        // server-to-server integrations. `nextAction` retains the widget-facing
        // shape (with `screen` labels) for backward compatibility.
        depositInstruction: toDepositInstruction(execResult.nextAction),
        nextAction: execResult.nextAction,
        firstStep: execResult.firstStep,
      },
    });
  } catch (err: any) {
    console.error('create order error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Paycrest raw status mapping. `pending` is overloaded — for onramp it means
// "awaiting user fiat deposit"; for offramp it means "crypto received, settling".
const PAYCREST_STATUS_OFFRAMP: Record<string, string> = {
  initiated: 'awaiting_deposit',
  deposited: 'processing',
  pending: 'processing',
  fulfilling: 'processing',
  fulfilled: 'processing',
  validated: 'processing',
  settling: 'processing',
  settled: 'completed',
  cancelled: 'failed',
  expired: 'failed',
  refunding: 'refunded',
  refunded: 'refunded',
};
const PAYCREST_STATUS_ONRAMP: Record<string, string> = {
  ...PAYCREST_STATUS_OFFRAMP,
  initiated: 'awaiting_deposit',
  pending: 'awaiting_deposit',
};
const TERMINAL = new Set(['completed', 'failed', 'refunded', 'expired']);

// GET /api/v1/orders/:id — poll fallback kicks in when the webhook is late.
router.get('/:id', requireAuth, async (req, res) => {
  try {
    let order = await prisma.order.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId, sandboxMode: req.sandboxMode ?? false },
      include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    let paycrestStatus: string | null = null;
    let nearStatus: string | null = null;
    if (!TERMINAL.has(order.status)) {
      try {
        await syncOrder(order.id);
        // Refetch to get the latest state after sync
        const fresh = await prisma.order.findUnique({
          where: { id: req.params.id },
          include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
        });
        if (fresh) order = fresh;
      } catch (err: any) {
        console.warn(`[orders] sync failed for ${order.id}:`, err.message);
      }
    }

    res.json({ success: true, data: { ...serializeOrder(order), paycrestStatus, nearStatus } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/orders — list for the merchant.
router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { merchantId: req.merchantId, sandboxMode: req.sandboxMode ?? false },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    res.json({ success: true, data: orders.map(serializeOrder) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
