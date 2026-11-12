import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireApiKey } from '../middleware/auth';
import { parseAsset } from '../lib/assets';
import { planRoute, type Flow } from '../services/router.service';
import { executeOrder, syncOrder, toDepositInstruction, buildLifiApproveTx, buildLifiBridgeTx, recordLifiSubmission } from '../services/executor.service';
import { recordServerEvent, recordOrderEvent } from '../services/order-event.service';
import { deviceTypeFromUA } from '../lib/user-agent';
import { SANDBOX_NGN_RATE } from '../services/sandbox-executor';
import { resolveInstrument, bankFromInstrument, type InstrumentRef } from '../lib/instruments';
import { paycrest, rateUnavailable } from '../services/paycrest.service';
import { nearIntents, classifyNearStatus } from '../services/nearintents.service';
import { fetchCryptoUsdPrice } from '../lib/crypto-usd-price';
import { estimateFiatFromUsdOfframp } from '../lib/offramp-estimate';
import { lifi } from '../services/lifi.service';
import { resolveDestAnchoredUsd } from '../services/offramp-pricing';
import { Decimal } from 'decimal.js';
import { basicMonthlyOrderLimit, isWeaveDemoPublishableKey } from '../lib/flags';

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

// Normalize an email for identity comparison: trimmed + lowercased, or null
// when absent/blank. Used to gate session-scoped order resume so a different
// payer on a shared device never inherits the previous payer's pending order.
function normalizeEmail(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null;
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

    // Auth already loaded the merchant for API-key/session requests — only
    // secret-key (server-to-server) auth needs this extra round trip.
    const merchant = req.merchant ?? await prisma.merchant.findUnique({ where: { id: req.merchantId } });
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
    // N non-failed orders per rolling 30-day window to limit compliance exposure.
    // The public /demo checkout key is exempt (see WEAVE_DEMO_PUBLISHABLE_KEY).
    const demoPublishableKey = (req.headers['x-api-key'] as string | undefined)?.trim();
    if (merchant.kycLevel === 'basic' && !isWeaveDemoPublishableKey(demoPublishableKey)) {
      const BASIC_MONTHLY_LIMIT = basicMonthlyOrderLimit();
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

    if (!body.dest && !merchant.defaultPayoutInstrumentId) {
      return res.status(400).json({ success: false, error: 'No dest instrument and merchant has no default payout configured' });
    }

    // Independent reads (none depends on another's result) — run concurrently
    // instead of as three separate sequential round trips. checkoutSession is
    // pulled forward from where it's used further below for the same reason.
    const [sourceInstrument, destInstrument, checkoutSession] = await Promise.all([
      resolveInstrument(body.source, merchant.id),
      body.dest
        ? resolveInstrument(body.dest, merchant.id)
        : prisma.instrument.findUnique({ where: { id: merchant.defaultPayoutInstrumentId! } }),
      body.sessionId
        ? prisma.checkoutSession.findUnique({ where: { id: body.sessionId, merchantId: merchant.id } })
        : Promise.resolve(null),
    ]);
    if (!destInstrument) return res.status(500).json({ success: false, error: 'Default payout instrument missing' });

    // 2. Plan route across provider edges. Flow defaults to 'external' so
    //    NEAR Intents handles the cross-chain leg via deposit address; pass
    //    'self' to bias toward ChainRails (wired-in-wallet flow) once ready.
    //    sourceWallet tells the planner whether a signature can be collected
    //    from the payer: it is set when the caller names the paying wallet
    //    (corridor, the SEP-24 ramp) and empty in anonymous deposit flows
    //    (payment links, cash-out links), where signing rails are unusable.
    const plan = planRoute({
      sourceAsset: sourceInstrument.assetKey,
      destAsset: destInstrument.assetKey,
      amount: body.amount,
      flow: body.flow ?? 'external',
      sourceWallet: sourceInstrument.walletAddress || undefined,
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
    // A corridor Paycrest has no provider for is a real, reportable condition —
    // not a calculation slip — so it is tracked outside the try below, whose
    // catch only logs. Without this the order would be created with the rate
    // snapshot silently missing and (for amountIn:'dest') sourceAmount still 0.
    let closedCorridor: string | null = null;

    try {
      const fiat = srcP.kind === 'fiat' ? srcP.currency : dstP.kind === 'fiat' ? dstP.currency : null;
      let sellRate = 1; let buyRate = 1;
      if (fiat) {
        if (req.sandboxMode) {
          sellRate = buyRate = quoteRate = SANDBOX_NGN_RATE;
        } else {
          try {
            const r = await paycrest.getRate('base', 'USDC', 1, fiat);
            const sell = Number(r?.sell?.rate);
            const buy  = Number(r?.buy?.rate);
            if (srcP.kind === 'fiat' && !buy)  closedCorridor = rateUnavailable(fiat, 'deposits');
            if (dstP.kind === 'fiat' && !sell) closedCorridor = rateUnavailable(fiat, 'payouts');
            if (closedCorridor) throw new Error(closedCorridor);
            sellRate = sell || 1;
            buyRate = buy || 1;
            quoteRate = srcP.kind === 'fiat' ? buyRate : sellRate;
          } catch (err: any) {
            if (process.env.NODE_ENV !== 'production' && fiat === 'NGN' && !closedCorridor) {
              console.warn('[orders] Paycrest unavailable in dev, using NGN fallback:', err.message);
              sellRate = buyRate = 1515;
              quoteRate = srcP.kind === 'fiat' ? buyRate : sellRate;
            } else {
              throw err;
            }
          }
        }
      }

      if (body.amountIn === 'dest') {
        if (srcP.kind === 'crypto' && dstP.kind === 'fiat') {
          // Offramp: User pays crypto (sourceAmount), Merchant gets target fiat (body.amount)
          destAmountFiat = body.amount;
          const targetFiat = new Decimal(body.amount);
          const hasSwap = plan.steps.some(s => s.provider === 'nearintents');

          // Same function `/quotes` prices with — includes the live Stellar bridge cost.
          usdEquivalent = await resolveDestAnchoredUsd({
            targetFiat: body.amount, sellRate, plan, sandbox: req.sandboxMode,
          });
          // Sizes the exact-output Paycrest order (and NEAR's appFee): unchanged.
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
          const isPureBachs    = plan.steps.length === 1 && plan.steps[0].provider === 'bachs';

          if (isPurePaystack) {
            // Paystack handles its own gross-up in the executor.
            // We set sourceAmount = target, and the executor will turn 700 -> 714
            sourceAmount = targetFiat.toNumber();
            usdEquivalent = targetFiat.div(sellRate).toNumber(); // for reporting
            appFeeBps = 0; // handled by paystack.grossUp
            destAmountFiat = body.amount;
          } else if (isPureBachs) {
            // Bachs split: the payer pays a grossed-up amount so the vendor nets
            // exactly the target after Weave's fee (the fee comes out of the split,
            // not added on top in the executor). vendorShare = collected × (1−fee)
            // = target ⇒ collected = target / (1−fee). No rate needed for the
            // source leg (pure NGN); sellRate only feeds usdEquivalent reporting.
            const feePct = new Decimal(SENDER_FEE_BPS + APP_FEE_BPS).div(10000);
            sourceAmount = targetFiat.div(new Decimal(1).minus(feePct)).toNumber();
            usdEquivalent = new Decimal(sourceAmount).div(sellRate).toNumber();
            appFeeBps = 0; // realized in the split
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
          const srcPrice = await fetchCryptoUsdPrice(sourceInstrument.assetKey);
          usdEquivalent = body.amount * srcPrice;
          if (dstP.kind === 'fiat') {
            const stellarBridgeFeeUsd = await lifi.stellarBridgeFeeForPlan(plan, usdEquivalent, { sandbox: req.sandboxMode });
            const nearCostBps = await nearIntents.costBpsForPlan(plan, usdEquivalent, { sandbox: req.sandboxMode });
            const paycrestFee = await paycrest.feeForPlan(plan, { sandbox: req.sandboxMode });
            const est = estimateFiatFromUsdOfframp(usdEquivalent, sellRate, plan, { stellarBridgeFeeUsd, nearCostBps, paycrestFeeUsd: paycrestFee?.feeUsd });
            destAmountFiat = est.estimatedDest;
            appFeeBps = est.appFeeBps;
          }
        } else if (srcP.kind === 'fiat') {
          sourceAmount = body.amount;
          usdEquivalent = body.amount / buyRate;
        }
      }

      if (srcP.kind === 'crypto' && body.amountIn === 'dest' && (!sourceAmount || sourceAmount === 0)) {
        // Convert USD → the payer's token with the SAME price source `/quotes` uses
        // (fetchCryptoUsdPrice). This branch used NEAR's own token price, so the order
        // asked for a slightly different amount than the quote showed (0.05% on USDC,
        // more on volatile tokens).
        const srcPrice = await fetchCryptoUsdPrice(sourceInstrument.assetKey);
        sourceAmount = srcPrice > 0 ? usdEquivalent / srcPrice : usdEquivalent;
      }
    } catch (err: any) {
      if (!closedCorridor) console.error(`[orders] calculation error:`, err.message);
    }

    // Refuse rather than price the order off rates we never got.
    if (closedCorridor) return res.status(400).json({ success: false, error: closedCorridor });

    // Safety net: a pure-Paystack order (same-currency NGN→NGN, single step) prices
    // its source leg 1:1 with the target and needs no rate. If the rate snapshot above
    // threw (common in sandbox, where live Paycrest may be unreachable), sourceAmount is
    // still its 0 default — and Paystack rejects a 0 charge with "Invalid Amount Sent".
    // Pin it to the requested amount so the charge is always well-formed.
    const isPurePaystack = plan.steps.length === 1 && plan.steps[0].provider === 'paystack';
    const isPureBachs    = plan.steps.length === 1 && plan.steps[0].provider === 'bachs';
    if ((isPurePaystack || isPureBachs) && (!sourceAmount || sourceAmount <= 0)) {
      // Rate fetch failed (common in sandbox) → pin the source leg so the charge
      // is well-formed. Paystack charges 1:1 (grosses up in the executor); Bachs
      // grosses up here so the vendor still nets the target after the split fee.
      if (isPureBachs) {
        const feePct = (SENDER_FEE_BPS + APP_FEE_BPS) / 10000;
        sourceAmount = body.amount / (1 - feePct);
      } else {
        sourceAmount = body.amount;
      }
      if (destAmountFiat === undefined) destAmountFiat = body.amount;
    }

    // Minimum for crypto-funded payments. Sub-dollar crypto legs get swallowed by
    // provider dust floors and swap/bridge fees (NEAR Intents especially), so a
    // $0.20 payment would "succeed" but deliver nothing. Reject up-front with a
    // clear, payer-actionable message rather than letting it fail mid-route.
    const MIN_CRYPTO_PAYMENT_USD = Number(process.env.MIN_CRYPTO_PAYMENT_USD ?? 0.5);
    if (srcP.kind === 'crypto' && usdEquivalent < MIN_CRYPTO_PAYMENT_USD) {
      return res.status(400).json({
        success: false,
        error: `This amount is below the $${MIN_CRYPTO_PAYMENT_USD.toFixed(2)} minimum for crypto payments.`,
      });
    }

    // 4. Create or Reuse the Order row (Idempotency)
    // If the merchant provided a reference, check for an existing order first.
    // (sourceInstrument, destInstrument, checkoutSession already resolved above.)
    let order: any;

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

    // Session-scoped idempotency. A checkout session represents ONE payment
    // intent, so at most one live order may hang off it. If the session already
    // points at a non-terminal order, resume it instead of minting a duplicate
    // — guarded by payer email so a different payer on a shared device (or a
    // misbehaving client) can never inherit the previous payer's order. When
    // either email is unknown (the hosted flow doesn't collect one at the
    // widget), fall back to the session id alone, since merchants create one
    // session per payer.
    if (!order && checkoutSession?.orderId) {
      const linked = await prisma.order.findUnique({
        where: { id: checkoutSession.orderId },
        include: { steps: { orderBy: { sequence: 'asc' } } },
      });
      if (linked && ['awaiting_deposit', 'processing'].includes(linked.status)) {
        const sessionEmail = normalizeEmail((checkoutSession.customer as any)?.email);
        const incomingEmail = normalizeEmail(customer?.email);
        const emailMismatch = !!sessionEmail && !!incomingEmail && sessionEmail !== incomingEmail;
        if (emailMismatch) {
          console.log(`[orders] session ${checkoutSession.id} email mismatch — starting a fresh order (silent)`);
        } else {
          order = linked;
          console.log(`[orders] resuming session-linked order ${linked.id} for session ${checkoutSession.id}`);
        }
      }
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
        recordServerEvent(order.id, 'order.created', 'Order created', {
          sourceAsset: sourceInstrument.assetKey,
          destAsset: destInstrument.assetKey,
          amount: sourceAmount,
          sandbox: req.sandboxMode ?? false,
          // Payer context — the widget's request. Drives the device/IP tiles.
          ip: req.ip ?? null,
          userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
        });

        // Link the session to this order. Re-link (not just first-link) so the
        // silent-fresh path — where a mismatched payer's order was previously
        // linked — repoints the session at the current payer's new order.
        if (checkoutSession && checkoutSession.orderId !== order.id) {
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
    // The wallet that signs (as opposed to the one we refund to). Only set
    // when the caller named it; the planner has already ruled out signing
    // rails when it is absent.
    const sourceWallet = srcP.kind === 'crypto' ? (sourceInstrument.walletAddress || undefined) : undefined;
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
      // The payer's email (same one used for the success receipt) — Paystack uses
      // it as the customer email so charges aren't attributed to the merchant.
      payerEmail: (order.customer as any)?.email,
      refundAddress,
      sourceWallet,
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
        // syncOrder returns the raw provider statuses it polled. The widget
        // keys intermediate UI on these (NEAR 'incomplete_deposit' → underpayment
        // warning; Paycrest 'fulfilled' → advance stage), so surface them.
        // Pass the order we already fetched above so syncOrder doesn't re-query
        // it, and only pay for a refetch when a step actually transitioned —
        // most polls land between provider updates and change nothing.
        const synced = await syncOrder(order.id, { status: order.status, sandboxMode: order.sandboxMode, steps: order.steps, bachsSplitStatus: order.bachsSplitStatus });
        paycrestStatus = synced.paycrestStatus;
        nearStatus = synced.nearStatus;
        if (synced.changed) {
          const fresh = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
          });
          if (fresh) order = fresh;
        }
      } catch (err: any) {
        console.warn(`[orders] sync failed for ${order.id}:`, err.message);
      }
    }

    res.json({ success: true, data: { ...serializeOrder(order), paycrestStatus, nearStatus } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── LI.FI Stellar leg: bridge XDR + submission hash ──────────────────────────
// The payer's wallet signs the `approve` XDR returned at creation, then asks
// for the bridge XDR here (LI.FI can only simulate it once the allowance is
// on-chain), signs it, and reports the resulting Stellar tx hash.

async function loadLifiStep(req: any, res: any) {
  const seq = Number(req.params.seq);
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, merchantId: req.merchantId, sandboxMode: req.sandboxMode ?? false },
    select: { id: true, status: true },
  });
  if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return null; }
  const step = await prisma.routeStep.findUnique({ where: { orderId_sequence: { orderId: order.id, sequence: seq } } });
  if (!step || step.provider !== 'lifi') { res.status(404).json({ success: false, error: 'No LI.FI step at that sequence' }); return null; }
  if (['done', 'failed'].includes(step.status)) { res.status(409).json({ success: false, error: `Step already ${step.status}` }); return null; }
  return step;
}

router.post('/:id/steps/:seq/approve-tx', requireAuth, async (req, res) => {
  try {
    const step = await loadLifiStep(req, res);
    if (!step) return;
    // { standing: true } → approve a bounded standing allowance so later sends need one signature.
    res.json({ success: true, data: await buildLifiApproveTx(step, { standing: req.body?.standing === true }) });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not build the approval transaction' });
  }
});

router.post('/:id/steps/:seq/bridge-tx', requireAuth, async (req, res) => {
  try {
    const step = await loadLifiStep(req, res);
    if (!step) return;
    const { unsignedXdr } = await buildLifiBridgeTx(step);
    res.json({ success: true, data: { unsignedXdr } });
  } catch (err: any) {
    // Simulation failure before the allowance lands is the common case — tell the client to retry.
    const allowance = /allowance/i.test(err.message ?? '');
    res.status(allowance ? 409 : 502).json({
      success: false,
      error: allowance ? 'Approval not confirmed on-chain yet — retry in a few seconds.' : (err.message || 'Could not build the bridge transaction'),
      code: allowance ? 'ALLOWANCE_PENDING' : 'BRIDGE_TX_FAILED',
    });
  }
});

router.post('/:id/steps/:seq/submitted', requireAuth, async (req, res) => {
  try {
    const step = await loadLifiStep(req, res);
    if (!step) return;
    await recordLifiSubmission(step, String(req.body?.txHash ?? ''));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/v1/orders/:id/events — the payment session timeline for the merchant
// dashboard. Merchant-scoped; returns events (oldest-first) + a derived summary.
router.get('/:id/events', requireAuth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId, sandboxMode: req.sandboxMode ?? false },
      select: { id: true, createdAt: true, updatedAt: true },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const events = await prisma.orderEvent.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });

    // Derived summary (computed, never stored) — mirrors the Paystack-style tiles.
    const attempts = events.filter((e) => e.type === 'auth_window.opened' || e.type === 'retry').length;
    const errors = events.filter((e) => e.type === 'error.shown' || e.type === 'order.failed').length;
    const first = events[0]?.createdAt ?? order.createdAt;
    const last = events.length ? events[events.length - 1].createdAt : order.updatedAt;
    const durationSec = Math.max(0, Math.round((new Date(last).getTime() - new Date(first).getTime()) / 1000));

    // Device + IP: prefer the customer's browser context (captured on a client
    // event) over order.created — which for API/server-created orders is the
    // merchant's backend, not the payer. Fall back to order.created otherwise.
    const clientCtx = [...events].reverse().find(
      (e) => e.source === 'client' && (e.metadata as Record<string, unknown> | null)?.userAgent,
    );
    const ctxSource = clientCtx ?? events.find((e) => e.type === 'order.created');
    const cm = (ctxSource?.metadata ?? {}) as Record<string, unknown>;
    const ip = cm.ip ? String(cm.ip) : null;
    const device = deviceTypeFromUA(cm.userAgent ? String(cm.userAgent) : null);

    res.json({
      success: true,
      data: { events, summary: { eventCount: events.length, attempts, errors, durationSec, device, ip } },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Whitelisted client event types → server-owned label builders. The server
// controls the label (clients can't inject arbitrary text); only bounded,
// sanitized bits of metadata flow through.
const CLIENT_EVENT_LABELS: Record<string, (m: Record<string, unknown>) => string> = {
  'checkout.opened':    () => 'Checkout opened',
  'method.selected':    (m) => `Set payment method to: ${clip(m.method, 40) || 'unknown'}`,
  'chain.selected':     (m) => `Selected ${clip(m.chain, 40) || 'chain'}`,
  'auth_window.opened': () => 'Third-party authentication window opened',
  'auth_window.closed': () => 'Third-party authentication window closed',
  'retry':              () => 'Payment retried',
  'error.shown':        (m) => `Error shown${m.message ? `: ${clip(m.message, 120)}` : ''}`,
};

function clip(v: unknown, max: number): string {
  if (v == null) return '';
  return String(v).slice(0, max);
}

// POST /api/v1/orders/:id/events — the widget appends client-side session events
// (method chosen, auth window open/close, retries). Untrusted: forced to
// source="client", server-owned labels, type-whitelisted, batch-capped.
router.post('/:id/events', requireApiKey, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId, sandboxMode: req.sandboxMode ?? false },
      select: { id: true },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const raw = Array.isArray(req.body?.events) ? req.body.events : [];
    if (raw.length === 0) return res.status(400).json({ success: false, error: 'events array required' });
    if (raw.length > 50) return res.status(400).json({ success: false, error: 'too many events (max 50)' });

    // This request IS the customer's browser (the widget), so it carries the real
    // payer device/IP — unlike order.created, which for API/server-created orders
    // is the merchant's backend. Stamp it server-side (client can't spoof it).
    const clientIp = req.ip ?? null;
    const clientUa = (req.headers['user-agent'] as string | undefined) ?? null;

    let recorded = 0;
    for (const ev of raw) {
      const type = String(ev?.type ?? '');
      const build = CLIENT_EVENT_LABELS[type];
      if (!build) continue; // silently drop unknown types
      const metadata = (ev?.metadata && typeof ev.metadata === 'object' && !Array.isArray(ev.metadata))
        ? ev.metadata as Record<string, unknown>
        : {};
      // Client-reported timestamp is informational; server createdAt is authoritative.
      const occurredAt = ev?.occurredAt ? new Date(ev.occurredAt) : new Date();
      recordOrderEvent({
        orderId: order.id,
        type,
        label: build(metadata),
        source: 'client',
        // Server-set ip/userAgent LAST so client-supplied metadata can't spoof them.
        metadata: { ...metadata, ip: clientIp, userAgent: clientUa },
        occurredAt: isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
      });
      recorded++;
    }

    res.json({ success: true, data: { recorded } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/orders — paginated, server-filtered list for the merchant.
// Params: limit (default 25, max 500), offset, status, direction, q, fromDate,
// toDate. Returns { orders, total, limit, offset, aggregates } — the aggregates
// span the merchant's WHOLE set (not the page) so the stat cards stay accurate.
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const status = req.query.status && req.query.status !== 'all' ? String(req.query.status) : undefined;
    const direction = req.query.direction && req.query.direction !== 'all' ? String(req.query.direction) : undefined;
    const q = req.query.q ? String(req.query.q).trim() : '';
    const fromDate = req.query.fromDate ? new Date(String(req.query.fromDate)) : null;
    const toDate = req.query.toDate ? new Date(String(req.query.toDate)) : null;

    const base = { merchantId: req.merchantId, sandboxMode: req.sandboxMode ?? false };
    const where: any = { ...base };
    if (status) where.status = status;
    if (fromDate && !isNaN(fromDate.getTime())) where.createdAt = { ...(where.createdAt ?? {}), gte: fromDate };
    if (toDate && !isNaN(toDate.getTime())) where.createdAt = { ...(where.createdAt ?? {}), lte: toDate };
    // Direction derives from asset kinds — the two common corridors map cleanly.
    if (direction === 'offramp') { where.sourceAssetKey = { startsWith: 'crypto:' }; where.destAssetKey = { startsWith: 'fiat:' }; }
    else if (direction === 'onramp') { where.sourceAssetKey = { startsWith: 'fiat:' }; where.destAssetKey = { startsWith: 'crypto:' }; }
    if (q) {
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q, mode: 'insensitive' } },
        { sourceInstrument: { bankAccountName: { contains: q, mode: 'insensitive' } } },
        { destInstrument: { bankAccountName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [orders, total, completedCount, todayAgg, pendingAgg] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit, include: { steps: { orderBy: { sequence: 'asc' } } } }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...base, status: 'completed' } }),
      prisma.order.aggregate({ _sum: { destAmount: true }, where: { ...base, status: 'completed', createdAt: { gte: startOfToday } } }),
      prisma.order.aggregate({ _sum: { destAmount: true }, where: { ...base, status: { in: ['awaiting_deposit', 'processing', 'bridging'] } } }),
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(serializeOrder),
        total,
        limit,
        offset,
        aggregates: {
          completedCount,
          todayNetSum: Number(todayAgg._sum.destAmount ?? 0),
          pendingNetSum: Number(pendingAgg._sum.destAmount ?? 0),
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
