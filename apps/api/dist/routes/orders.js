"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const assets_1 = require("../lib/assets");
const router_service_1 = require("../services/router.service");
const executor_service_1 = require("../services/executor.service");
const instruments_1 = require("../lib/instruments");
const paycrest_service_1 = require("../services/paycrest.service");
const nearintents_service_1 = require("../services/nearintents.service");
const router = (0, express_1.Router)();
// POST /api/v1/orders — direction-agnostic order creation.
router.post('/', auth_1.requireApiKey, async (req, res) => {
    const body = req.body;
    if (!body?.source || !body?.amount) {
        return res.status(400).json({ success: false, error: 'Missing source, amount' });
    }
    if (!Number.isFinite(body.amount) || body.amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    try {
        const client = await prisma_1.prisma.client.findUnique({ where: { id: req.clientId } });
        if (!client)
            return res.status(401).json({ success: false, error: 'Unknown client' });
        // Pure-infra: we don't own end-user identity. The merchant is the owner of
        // the instrument record; userId on Order stays null until a future licensed
        // mode reintroduces end-user accounts.
        const sourceInstrument = await (0, instruments_1.resolveInstrument)(body.source, 'merchant', client.id);
        let destInstrument;
        if (body.dest) {
            destInstrument = await (0, instruments_1.resolveInstrument)(body.dest, 'merchant', client.id);
        }
        else {
            if (!client.defaultPayoutInstrumentId) {
                return res.status(400).json({ success: false, error: 'No dest instrument and client has no default payout' });
            }
            destInstrument = await prisma_1.prisma.instrument.findUnique({ where: { id: client.defaultPayoutInstrumentId } });
            if (!destInstrument)
                return res.status(500).json({ success: false, error: 'Default payout instrument missing' });
        }
        // 2. Plan route across provider edges. Flow defaults to 'external' so
        //    NEAR Intents handles the cross-chain leg via deposit address; pass
        //    'self' to bias toward ChainRails (wired-in-wallet flow) once ready.
        const plan = (0, router_service_1.planRoute)({
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
        const srcP = (0, assets_1.parseAsset)(sourceInstrument.assetKey);
        const dstP = (0, assets_1.parseAsset)(destInstrument.assetKey);
        let quoteRate = null;
        let usdEquivalent = body.amount;
        try {
            const fiat = srcP.kind === 'fiat' ? srcP.currency : dstP.kind === 'fiat' ? dstP.currency : null;
            if (fiat) {
                const r = await paycrest_service_1.paycrest.getRate('base', 'USDC', 1, fiat);
                quoteRate = Number(srcP.kind === 'fiat' ? r.buy.rate : r.sell.rate) || null;
                if (srcP.kind === 'fiat' && quoteRate)
                    usdEquivalent = body.amount / quoteRate;
            }
            if (srcP.kind === 'crypto') {
                const token = await nearintents_service_1.nearIntents.resolveToken(sourceInstrument.assetKey);
                if (token.price > 0)
                    usdEquivalent = body.amount * token.price;
            }
        }
        catch { }
        // 4. Create the Order row before executing providers — gives us an id to
        //    use as the reference and lets us attach RouteStep rows to it.
        const order = await prisma_1.prisma.order.create({
            data: {
                clientId: client.id,
                sourceInstrumentId: sourceInstrument.id,
                destInstrumentId: destInstrument.id,
                sourceAssetKey: sourceInstrument.assetKey,
                destAssetKey: destInstrument.assetKey,
                sourceAmount: body.amount,
                status: 'awaiting_deposit',
                routePlan: plan,
                quoteRate,
                reference: body.reference,
            },
        });
        // 5. Execute: create provider resources (reverse order), persist RouteSteps,
        //    return nextAction for the widget.
        // Prefer the explicit user-provided refundAddress. The source instrument's
        // walletAddress is a fallback for the 'self' flow where the user's connected
        // wallet IS both sender and refund target.
        const refundAddress = srcP.kind === 'crypto'
            ? (body.refundAddress || sourceInstrument.walletAddress || '')
            : undefined;
        const refundAccount = srcP.kind === 'fiat' ? ((0, instruments_1.bankFromInstrument)(sourceInstrument) ?? undefined) : undefined;
        const destBank = dstP.kind === 'fiat' ? ((0, instruments_1.bankFromInstrument)(destInstrument) ?? undefined) : undefined;
        const destWallet = dstP.kind === 'crypto' ? (destInstrument.walletAddress ?? '') : undefined;
        const execResult = await (0, executor_service_1.executeOrder)({
            orderId: order.id,
            plan,
            sourceAmount: body.amount,
            usdEquivalent,
            reference: order.id,
            merchantMemo: `Weave ${order.id}`,
            refundAddress,
            refundAccount,
            destBank,
            destWallet,
        });
        // 6. Roll final fee + destAmount snapshot onto the Order.
        const updated = await prisma_1.prisma.order.update({
            where: { id: order.id },
            data: {
                destAmount: execResult.destAmount,
                senderFeeUsd: execResult.feeSummary.senderFeeUsd,
                appFeeUsd: execResult.feeSummary.appFeeUsd,
                bridgeFeeUsd: execResult.feeSummary.bridgeFeeUsd,
            },
            include: { steps: { orderBy: { sequence: 'asc' } } },
        });
        res.json({
            success: true,
            data: {
                order: updated,
                nextAction: execResult.nextAction,
                firstStep: execResult.firstStep,
            },
        });
    }
    catch (err) {
        console.error('create order error:', err.message);
        res.status(502).json({ success: false, error: err.message });
    }
});
// Paycrest raw status mapping. `pending` is overloaded — for onramp it means
// "awaiting user fiat deposit"; for offramp it means "crypto received, settling".
const PAYCREST_STATUS_OFFRAMP = {
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
const PAYCREST_STATUS_ONRAMP = {
    ...PAYCREST_STATUS_OFFRAMP,
    initiated: 'awaiting_deposit',
    pending: 'awaiting_deposit',
};
const TERMINAL = new Set(['completed', 'failed', 'refunded']);
// GET /api/v1/orders/:id — poll fallback kicks in when the webhook is late.
router.get('/:id', auth_1.requireApiKey, async (req, res) => {
    try {
        let order = await prisma_1.prisma.order.findFirst({
            where: { id: req.params.id, clientId: req.clientId },
            include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
        });
        if (!order)
            return res.status(404).json({ success: false, error: 'Order not found' });
        let paycrestStatus = null;
        let nearStatus = null;
        if (!TERMINAL.has(order.status)) {
            // Find the earliest not-done step that has a Paycrest externalId — that's
            // the one currently gating order progress.
            const activePaycrestStep = order.steps.find(s => s.provider === 'paycrest' && s.status !== 'done' && s.externalId);
            if (activePaycrestStep?.externalId) {
                try {
                    const pc = await paycrest_service_1.paycrest.getOrder(activePaycrestStep.externalId);
                    paycrestStatus = pc.status ?? null;
                    const srcKind = (0, assets_1.parseAsset)(order.sourceAssetKey).kind;
                    const map = srcKind === 'fiat' ? PAYCREST_STATUS_ONRAMP : PAYCREST_STATUS_OFFRAMP;
                    const mapped = map[pc.status];
                    if (mapped && mapped !== order.status) {
                        order = await prisma_1.prisma.order.update({
                            where: { id: order.id },
                            data: { status: mapped },
                            include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
                        });
                    }
                }
                catch (e) {
                    console.warn('paycrest poll failed:', e.message);
                }
            }
            // Same shape for NEAR Intents: safety net for the nearintents_poller
            // worker so a stale GET-by-id still forces a status sync.
            const activeNearStep = order.steps.find(s => s.provider === 'nearintents' && s.status !== 'done' && s.depositAddress);
            if (activeNearStep?.depositAddress) {
                try {
                    const st = await nearintents_service_1.nearIntents.getStatus(activeNearStep.depositAddress, activeNearStep.depositMemo ?? undefined);
                    nearStatus = st.status;
                    const outcome = (0, nearintents_service_1.classifyNearStatus)(st.status);
                    const bridged = outcome === 'done' || order.steps.some(s => s.status === 'done' && s.provider === 'nearintents');
                    const anyFail = outcome === 'failed';
                    const nextStatus = anyFail ? 'failed' : bridged ? 'processing' : order.status;
                    if (nextStatus !== order.status) {
                        order = await prisma_1.prisma.order.update({
                            where: { id: order.id },
                            data: { status: nextStatus },
                            include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
                        });
                    }
                }
                catch (e) {
                    console.warn('nearintents poll failed:', e.message);
                }
            }
        }
        res.json({ success: true, data: { ...order, paycrestStatus, nearStatus } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/v1/orders — list for the merchant.
router.get('/', auth_1.requireApiKey, async (req, res) => {
    try {
        const orders = await prisma_1.prisma.order.findMany({
            where: { clientId: req.clientId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { steps: { orderBy: { sequence: 'asc' } } },
        });
        res.json({ success: true, data: orders });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
