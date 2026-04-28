import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { parseAsset } from '../lib/assets';
import { planRoute, type Flow } from '../services/router.service';
import { executeOrder } from '../services/executor.service';
import { resolveInstrument, bankFromInstrument, type InstrumentRef } from '../lib/instruments';
import { paycrest } from '../services/paycrest.service';
import { nearIntents, classifyNearStatus } from '../services/nearintents.service';
import { Decimal } from 'decimal.js';

const router = Router();

interface CreateOrderBody {
  source:     InstrumentRef;   
  dest?:      InstrumentRef;   
  amount:     number;          
  amountIn?:  'source' | 'dest';
  reference?: string;          
  flow?:      Flow;            
  // Explicit refund destination on the origin chain. In the external flow we
  // don't know who'll actually pay the deposit address, so the widget collects
  // a refund wallet from the user and sends it here. Takes precedence over the
  // source instrument's walletAddress when both are set.
  refundAddress?: string;
}

// POST /api/v1/orders — direction-agnostic order creation.
router.post('/', requireAuth, async (req, res) => {
  const body = req.body as CreateOrderBody;
  if (!body?.source || !body?.amount) {
    return res.status(400).json({ success: false, error: 'Missing source, amount' });
  }
  if (!Number.isFinite(body.amount) || body.amount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' });
  }

  try {
    // Validate inline source shape early so we return a clean 400
    if ('inline' in body.source) {
      const d = body.source.inline;
      if (!d?.kind || !d?.assetKey) {
        return res.status(400).json({ success: false, error: 'source.inline requires kind and assetKey' });
      }
      if (d.kind === 'bank_account' && (!d.bankInstitution || !d.bankAccountIdentifier || !d.bankAccountName)) {
        return res.status(400).json({ success: false, error: 'source.inline bank_account requires bankInstitution, bankAccountIdentifier, bankAccountName' });
      }
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(401).json({ success: false, error: 'Unknown merchant' });

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
      destAsset:   destInstrument.assetKey,
      amount:      body.amount,
      flow:        body.flow ?? 'external',
    });

    // 3. Snapshot a Paycrest rate when the route touches fiat (for the quote
    //    figure the widget shows) AND compute the USD-equivalent of the
    //    source-asset-denominated amount the widget sent. The executor needs
    //    both: sourceAmount drives the first-hop deposit, usdEquivalent drives
    //    the USDC-on-Base intermediate legs.
    const SENDER_FEE_BPS = Number(process.env.SENDER_FEE_BPS ?? 75);
    const APP_FEE_BPS    = Number(process.env.APP_FEE_BPS    ?? 10);
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
        buyRate  = Number(r.buy.rate)  || 1;
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
            const sr = new Decimal(sellRate);
            const br = new Decimal(buyRate);
            
            // 1. USDC needed for offramp
            const senderFeePct = new Decimal(SENDER_FEE_BPS).div(10000);
            const netUsdc = targetFiat.div(sr);
            const targetUsdc = netUsdc.div(new Decimal(1).minus(senderFeePct));
            
            // 2. Add bridge/slippage buffers if any (usually 0 for fiat-to-fiat via Paycrest)
            const appFeePct = new Decimal(APP_FEE_BPS).div(10000);
            const totalUsdc = targetUsdc.div(new Decimal(1).minus(appFeePct));
            
            // 3. Convert total USDC to source fiat
            sourceAmount = totalUsdc.mul(br).toNumber();
            usdEquivalent = totalUsdc.toNumber();
            appFeeBps = APP_FEE_BPS;
            destAmountFiat = body.amount;
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
      
      if (srcP.kind === 'crypto' && body.amountIn === 'dest' && !sourceAmount) {
        const token = await nearIntents.resolveToken(sourceInstrument.assetKey);
        if (token.price > 0) sourceAmount = usdEquivalent / token.price;
      }
    } catch {}

    // 4. Create or Reuse the Order row (Idempotency)
    // If the merchant provided a reference, check for an existing order first.
    let order: any;
    if (body.reference) {
      order = await prisma.order.findFirst({
        where: {
          merchantId: merchant.id,
          reference:  body.reference,
          // Only reuse if it's the same amount and asset to avoid collisions
          sourceAmount,
          sourceAssetKey: sourceInstrument.assetKey,
        },
        include: { steps: { orderBy: { sequence: 'asc' } } }
      });
    }

    if (!order) {
      try {
        order = await prisma.order.create({
          data: {
            merchantId:         merchant.id,
            sourceInstrumentId: sourceInstrument.id,
            destInstrumentId:   destInstrument.id,
            sourceAssetKey:     sourceInstrument.assetKey,
            destAssetKey:       destInstrument.assetKey,
            sourceAmount,
            status:             'awaiting_deposit',
            routePlan:          plan as any,
            quoteRate,
            reference:          body.reference,
          },
        });
        console.log(`[orders] created new order: ${order.id}`);
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
    const refundAccount = srcP.kind === 'fiat'   ? (bankFromInstrument(sourceInstrument) ?? undefined) : undefined;
    const destBank      = dstP.kind === 'fiat'   ? (bankFromInstrument(destInstrument)   ?? undefined) : undefined;
    const destWallet    = dstP.kind === 'crypto' ? (destInstrument.walletAddress ?? '') : undefined;

    const execResult = await executeOrder({
      orderId:       order.id,
      plan,
      sourceAmount,
      usdEquivalent,
      destAmountFiat,
      appFeeBps,
      reference:     order.id,
      merchantMemo:  `Weave ${order.id}`,
      refundAddress,
      refundAccount,
      destBank,
      destWallet,
    });

    // 6. Roll final fee + destAmount snapshot onto the Order.
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        destAmount:   execResult.destAmount,
        senderFeeUsd: execResult.feeSummary.senderFeeUsd,
        appFeeUsd:    execResult.feeSummary.appFeeUsd,
        bridgeFeeUsd: execResult.feeSummary.bridgeFeeUsd,
      },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });

    res.json({
      success: true,
      data: {
        order:       updated,
        nextAction:  execResult.nextAction,
        firstStep:   execResult.firstStep,
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
  initiated:  'awaiting_deposit',
  deposited:  'processing',
  pending:    'processing',
  fulfilling: 'processing',
  fulfilled:  'processing',
  validated:  'processing',
  settling:   'processing',
  settled:    'completed',
  cancelled:  'failed',
  expired:    'failed',
  refunding:  'refunded',
  refunded:   'refunded',
};
const PAYCREST_STATUS_ONRAMP: Record<string, string> = {
  ...PAYCREST_STATUS_OFFRAMP,
  initiated: 'awaiting_deposit',
  pending:   'awaiting_deposit',
};
const TERMINAL = new Set(['completed', 'failed', 'refunded', 'expired']);

// GET /api/v1/orders/:id — poll fallback kicks in when the webhook is late.
router.get('/:id', requireAuth, async (req, res) => {
  try {
    let order = await prisma.order.findFirst({
      where:   { id: req.params.id, merchantId: req.merchantId },
      include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    let paycrestStatus: string | null = null;
    let nearStatus:     string | null = null;
    if (!TERMINAL.has(order.status)) {
      // Find the earliest not-done step that has a Paycrest externalId — that's
      // the one currently gating order progress.
      const activePaycrestStep = order.steps.find((s: any) => s.provider === 'paycrest' && s.status !== 'done' && s.externalId);
      if (activePaycrestStep?.externalId) {
        try {
          const pc = await paycrest.getOrder(activePaycrestStep.externalId);
          paycrestStatus = pc.status ?? null;

          const srcKind = parseAsset(order.sourceAssetKey).kind;
          const map     = srcKind === 'fiat' ? PAYCREST_STATUS_ONRAMP : PAYCREST_STATUS_OFFRAMP;
          const mapped  = map[pc.status];
          if (mapped && mapped !== order.status) {
            order = await prisma.order.update({
              where:   { id: order.id },
              data:    { status: mapped },
              include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
            });
          }
        } catch (e: any) {
          console.warn('paycrest poll failed:', e.message);
        }
      }

      // Same shape for NEAR Intents: safety net for the nearintents_poller
      // worker so a stale GET-by-id still forces a status sync.
      const activeNearStep = order.steps.find((s: any) => s.provider === 'nearintents' && s.status !== 'done' && s.depositAddress);
      if (activeNearStep?.depositAddress) {
        try {
          const st = await nearIntents.getStatus(activeNearStep.depositAddress, activeNearStep.depositMemo ?? undefined);
          nearStatus = st.status;
          const outcome = classifyNearStatus(st.status);
          const bridged = outcome === 'done' || order.steps.some((s: any) => s.status === 'done' && s.provider === 'nearintents');
          const anyFail = outcome === 'failed' || outcome === 'refunded';
          const nearProcessing = st.status === 'PROCESSING';
          const nextStatus = outcome === 'refunded' ? 'refunded' : anyFail ? 'failed' : (nearProcessing || bridged) ? 'processing' : order.status;
          if (nextStatus !== order.status) {
            order = await prisma.order.update({
              where:   { id: order.id },
              data:    { status: nextStatus },
              include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
            });
          }
        } catch (e: any) {
          console.warn('nearintents poll failed:', e.message);
        }
      }
    }

    res.json({ success: true, data: { ...order, paycrestStatus, nearStatus } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/orders — list for the merchant.
router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where:   { merchantId: req.merchantId },
      orderBy: { createdAt: 'desc' },
      take:    50,
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
