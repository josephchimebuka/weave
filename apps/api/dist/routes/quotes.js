"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paycrest_service_1 = require("../services/paycrest.service");
const chainrails_service_1 = require("../services/chainrails.service");
const nearintents_service_1 = require("../services/nearintents.service");
const auth_1 = require("../middleware/auth");
const assets_1 = require("../lib/assets");
const router_service_1 = require("../services/router.service");
const router = (0, express_1.Router)();
const SENDER_FEE_BPS = Number(process.env.SENDER_FEE_BPS ?? 75);
const APP_FEE_BPS = Number(process.env.APP_FEE_BPS ?? 10);
const SLIPPAGE_BUFFER_BPS = Number(process.env.SLIPPAGE_BUFFER_BPS ?? 200);
// Round UP to 3 significant figures so the number we show the user is also
// what we quote to NEAR Intents. Truncating in the widget's formatter caused
// underpayment (deposit < minAmountIn → INCOMPLETE_DEPOSIT); rounding up on
// the server keeps display and execution in lockstep and errs on the side of
// the merchant receiving slightly more than requested rather than less.
function ceilToSigFigs(n, sig = 3) {
    if (!Number.isFinite(n) || n === 0)
        return n;
    const magnitude = Math.floor(Math.log10(Math.abs(n)));
    const factor = Math.pow(10, sig - 1 - magnitude);
    return Math.ceil(n * factor - 1e-9) / factor;
}
// GET /api/v1/quotes?from=crypto:BASE:USDC&to=fiat:NGN&amount=100
// Optional: amountIn=source|dest (default: source)
router.get('/', auth_1.requireApiKey, async (req, res) => {
    const from = String(req.query.from ?? '');
    const to = String(req.query.to ?? '');
    const amount = Number(req.query.amount);
    const amountIn = (String(req.query.amountIn ?? 'source'));
    if (!from || !to || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'from, to, amount required' });
    }
    try {
        const src = (0, assets_1.parseAsset)(from);
        const dst = (0, assets_1.parseAsset)(to);
        // Probe Paycrest when any side touches fiat. The live rate drives both
        // the conversion below and the figure the widget displays.
        const fiatCurrency = src.kind === 'fiat' ? src.currency : dst.kind === 'fiat' ? dst.currency : null;
        let sellRate = 1, buyRate = 1;
        if (fiatCurrency) {
            const rate = await paycrest_service_1.paycrest.getRate('base', 'USDC', 1, fiatCurrency);
            sellRate = Number(rate.sell.rate) || 1;
            buyRate = Number(rate.buy.rate) || 1;
        }
        // Normalize both sides of the quote into USD-equivalent (USDC) so we can
        // stack per-hop bridge fees cleanly, then reproject. For dest-anchored
        // offramps we gross up so the merchant receives *exactly* `amount` after
        // every downstream cut: Paycrest's sender fee (= our SENDER_FEE_BPS, which
        // Paycrest collects for us), our APP_FEE_BPS, and the NEAR Intents swap
        // spread (absorbed by SLIPPAGE_BUFFER_BPS).
        const feeRate = (SENDER_FEE_BPS + APP_FEE_BPS) / 10000;
        const slippageBuffer = SLIPPAGE_BUFFER_BPS / 10000;
        const usdEquivalent = (() => {
            if (src.kind === 'crypto' && dst.kind === 'fiat') {
                if (amountIn === 'source')
                    return amount;
                // Dest-anchored: `amount` is the fiat the merchant must receive.
                const netUsd = amount / sellRate;
                return (netUsd / (1 - feeRate)) * (1 + slippageBuffer);
            }
            if (src.kind === 'fiat' && dst.kind === 'crypto') {
                // Onramp: source is fiat; dest is USDC-equivalent.
                return amountIn === 'source' ? amount / buyRate : amount;
            }
            return amount;
        })();
        const plan = (0, router_service_1.planRoute)({ sourceAsset: from, destAsset: to, amount: usdEquivalent });
        // Bridge-fee snapshot. ChainRails gives us a live figure; for NEAR Intents
        // we book the slippage buffer as bridge fee so the breakdown reflects the
        // gross-up we just applied.
        let bridgeFeeUsd = 0;
        for (const step of plan.steps) {
            if (step.provider === 'chainrails') {
                try {
                    const from = (0, assets_1.parseAsset)(step.fromAsset);
                    const to = (0, assets_1.parseAsset)(step.toAsset);
                    if (from.kind !== 'crypto' || to.kind !== 'crypto')
                        continue;
                    const q = await chainrails_service_1.chainRails.getBestQuote({
                        sourceChain: from.chain,
                        sourceToken: from.token,
                        destinationChain: to.chain,
                        destinationToken: to.token,
                        amount: usdEquivalent,
                    });
                    bridgeFeeUsd += Number(q.totalFeeFormatted) || 0;
                }
                catch {
                    // Best-effort: missing bridge quote shouldn't block the overall quote.
                }
            }
            else if (step.provider === 'nearintents') {
                bridgeFeeUsd += usdEquivalent * slippageBuffer;
            }
        }
        const senderFeeUsd = usdEquivalent * (SENDER_FEE_BPS / 10000);
        const appFeeUsd = usdEquivalent * (APP_FEE_BPS / 10000);
        const netUsd = usdEquivalent - senderFeeUsd - appFeeUsd - bridgeFeeUsd;
        // Final display figure in the destination asset.
        const estimatedDest = dst.kind === 'fiat' ? netUsd * sellRate : netUsd;
        // Source-asset-denominated deposit amount. `usdEquivalent` is USD, but the
        // widget needs to tell the user "deposit X SOL" — and the NEAR Intents
        // swap (EXACT_INPUT) is fed that same source-token amount. For USDC/USDT
        // sources the live price ≈ $1 so this ≈ usdEquivalent; for SOL/ETH/etc
        // it's a meaningful conversion. Falls back to usdEquivalent when the
        // source isn't on NEAR Intents (e.g. direct USDC-on-Base same-asset).
        let sourceAmount = usdEquivalent;
        if (src.kind === 'crypto') {
            try {
                const token = await nearintents_service_1.nearIntents.resolveToken(from);
                if (token.price > 0)
                    sourceAmount = usdEquivalent / token.price;
            }
            catch { }
        }
        res.json({
            success: true,
            data: {
                estimatedDest,
                route: plan,
                breakdown: {
                    usdEquivalent,
                    sourceAmount,
                    senderFeeUsd,
                    appFeeUsd,
                    bridgeFeeUsd,
                    netUsd,
                    sellRate: fiatCurrency ? sellRate : null,
                    buyRate: fiatCurrency ? buyRate : null,
                },
            },
        });
    }
    catch (err) {
        console.error('quote error:', err.message);
        res.status(502).json({ success: false, error: err.message });
    }
});
exports.default = router;
