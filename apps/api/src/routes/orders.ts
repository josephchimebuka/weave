import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireApiKey } from '../middleware/auth';
import { parseAsset } from '../lib/assets';
import { planRoute } from '../services/router.service';
import { executeOrder } from '../services/executor.service';
import { resolveInstrument, bankFromInstrument, type InstrumentRef } from '../lib/instruments';
import { paycrest } from '../services/paycrest.service';

const router = Router();

interface CreateOrderBody {
  source:     InstrumentRef;   // how the user pays (wallet or bank)
  dest?:      InstrumentRef;   // merchant payout; falls back to Client.defaultPayoutInstrumentId
  amount:     number;          // denominated in the source asset
  reference?: string;          // optional merchant-supplied ref
}

// POST /api/v1/orders — direction-agnostic order creation.
router.post('/', requireApiKey, async (req, res) => {
  const body = req.body as CreateOrderBody;
  if (!body?.source || !body?.amount) {
    return res.status(400).json({ success: false, error: 'Missing source, amount' });
  }
  if (!Number.isFinite(body.amount) || body.amount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' });
  }

  try {
    const client = await prisma.client.findUnique({ where: { id: req.clientId } });
    if (!client) return res.status(401).json({ success: false, error: 'Unknown client' });

    // Pure-infra: we don't own end-user identity. The merchant is the owner of
    // the instrument record; userId on Order stays null until a future licensed
    // mode reintroduces end-user accounts.
    const sourceInstrument = await resolveInstrument(body.source, 'merchant', client.id);

    let destInstrument;
    if (body.dest) {
      destInstrument = await resolveInstrument(body.dest, 'merchant', client.id);
    } else {
      if (!client.defaultPayoutInstrumentId) {
        return res.status(400).json({ success: false, error: 'No dest instrument and client has no default payout' });
      }
      destInstrument = await prisma.instrument.findUnique({ where: { id: client.defaultPayoutInstrumentId } });
      if (!destInstrument) return res.status(500).json({ success: false, error: 'Default payout instrument missing' });
    }

    // 2. Plan route across provider edges.
    const plan = planRoute({
      sourceAsset: sourceInstrument.assetKey,
      destAsset:   destInstrument.assetKey,
      amount:      body.amount,
    });

    // 3. Snapshot a Paycrest rate when the route touches fiat (for the quote
    //    figure the widget shows). Best-effort — non-fiat routes skip it.
    let quoteRate: number | null = null;
    try {
      const srcP = parseAsset(sourceInstrument.assetKey);
      const dstP = parseAsset(destInstrument.assetKey);
      const fiat = srcP.kind === 'fiat' ? srcP.currency : dstP.kind === 'fiat' ? dstP.currency : null;
      if (fiat) {
        const r = await paycrest.getRate('base', 'USDC', 1, fiat);
        quoteRate = Number(srcP.kind === 'fiat' ? r.buy.rate : r.sell.rate) || null;
      }
    } catch {}

    // 4. Create the Order row before executing providers — gives us an id to
    //    use as the reference and lets us attach RouteStep rows to it.
    const order = await prisma.order.create({
      data: {
        clientId:           client.id,
        sourceInstrumentId: sourceInstrument.id,
        destInstrumentId:   destInstrument.id,
        sourceAssetKey:     sourceInstrument.assetKey,
        destAssetKey:       destInstrument.assetKey,
        sourceAmount:       body.amount,
        status:             'awaiting_deposit',
        routePlan:           plan as any,
        quoteRate,
        reference:          body.reference,
      },
    });

    // 5. Execute: create provider resources (reverse order), persist RouteSteps,
    //    return nextAction for the widget.
    const srcP = parseAsset(sourceInstrument.assetKey);
    const dstP = parseAsset(destInstrument.assetKey);

    const refundAddress = srcP.kind === 'crypto' ? (sourceInstrument.walletAddress ?? '') : undefined;
    const refundAccount = srcP.kind === 'fiat'   ? (bankFromInstrument(sourceInstrument) ?? undefined) : undefined;
    const destBank      = dstP.kind === 'fiat'   ? (bankFromInstrument(destInstrument)   ?? undefined) : undefined;
    const destWallet    = dstP.kind === 'crypto' ? (destInstrument.walletAddress ?? '') : undefined;

    const execResult = await executeOrder({
      orderId:       order.id,
      plan,
      sourceAmount:  body.amount,
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
    res.status(502).json({ success: false, error: err.message });
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
const TERMINAL = new Set(['completed', 'failed', 'refunded']);

// GET /api/v1/orders/:id — poll fallback kicks in when the webhook is late.
router.get('/:id', requireApiKey, async (req, res) => {
  try {
    let order = await prisma.order.findFirst({
      where:   { id: req.params.id, clientId: req.clientId },
      include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    let paycrestStatus: string | null = null;
    if (!TERMINAL.has(order.status)) {
      // Find the earliest not-done step that has a Paycrest externalId — that's
      // the one currently gating order progress.
      const activePaycrestStep = order.steps.find(s => s.provider === 'paycrest' && s.status !== 'done' && s.externalId);
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
    }

    res.json({ success: true, data: { ...order, paycrestStatus } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/orders — list for the merchant.
router.get('/', requireApiKey, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where:   { clientId: req.clientId },
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
