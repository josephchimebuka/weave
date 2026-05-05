import { Router } from 'express';
import { paycrest } from '../services/paycrest.service';
import { chainRails } from '../services/chainrails.service';
import { nearIntents } from '../services/nearintents.service';
import { paystack } from '../services/paystack.service';
import { requireApiKey } from '../middleware/auth';
import { Decimal } from 'decimal.js';
import { parseAsset } from '../lib/assets';
import { planRoute } from '../services/router.service';

const router = Router();

const SENDER_FEE_BPS       = Number(process.env.SENDER_FEE_BPS       ?? 75);
const APP_FEE_BPS          = Number(process.env.APP_FEE_BPS          ?? 10);
const SLIPPAGE_BUFFER_BPS  = Number(process.env.SLIPPAGE_BUFFER_BPS  ?? 200);

// Round UP to 3 significant figures so the number we show the user is also
// what we quote to NEAR Intents. Truncating in the widget's formatter caused
// underpayment (deposit < minAmountIn → INCOMPLETE_DEPOSIT); rounding up on
// the server keeps display and execution in lockstep and errs on the side of
// the merchant receiving slightly more than requested rather than less.
function ceilToSigFigs(n: number, sig = 3): number {
  if (!Number.isFinite(n) || n === 0) return n;
  const magnitude = Math.floor(Math.log10(Math.abs(n)));
  const factor    = Math.pow(10, sig - 1 - magnitude);
  return Math.ceil(n * factor - 1e-9) / factor;
}

// GET /api/v1/quotes?from=crypto:BASE:USDC&to=fiat:NGN&amount=100
// Optional: amountIn=source|dest (default: source)
router.get('/', requireApiKey, async (req, res) => {
  const from     = String(req.query.from ?? '');
  const to       = String(req.query.to   ?? '');
  const amount   = Number(req.query.amount);
  const amountIn = (String(req.query.amountIn ?? 'source')) as 'source' | 'dest';

  if (!from || !to || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: 'from, to, amount required' });
  }

  try {
    const src = parseAsset(from);
    const dst = parseAsset(to);

    // Probe Paycrest when any side touches fiat. The live rate drives both
    // the conversion below and the figure the widget displays.
    const fiatCurrency = src.kind === 'fiat' ? src.currency : dst.kind === 'fiat' ? dst.currency : null;
    let sellRate = 1, buyRate = 1;
    if (fiatCurrency) {
      const rate = await paycrest.getRate('base', 'USDC', 1, fiatCurrency);
      sellRate = Number(rate.sell.rate) || 1;
      buyRate  = Number(rate.buy.rate)  || 1;
    }

    // Normalize both sides of the quote into USD-equivalent (USDC) so we can
    // stack per-hop bridge fees cleanly, then reproject. For dest-anchored
    // offramps we gross up so the merchant receives *exactly* `amount` after
    // every downstream cut: Paycrest's sender fee (= our SENDER_FEE_BPS, which
    // Paycrest collects for us), our APP_FEE_BPS, and the NEAR Intents swap
    // spread (absorbed by SLIPPAGE_BUFFER_BPS).
    const feeRate        = (SENDER_FEE_BPS + APP_FEE_BPS) / 10000;
    const slippageBuffer = SLIPPAGE_BUFFER_BPS / 10000;
    // 1. Get prices for all assets involved
    let srcPrice = 1;
    if (src.kind === 'crypto') {
      const sym = src.token.toUpperCase();
      if (sym === 'USDC' || sym === 'USDT') {
        srcPrice = 1;
      } else {
        try {
          // Try Coinbase public API first for common assets
          const cb = await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`).then(r => r.json());
          if (cb?.data?.amount) {
            srcPrice = Number(cb.data.amount);
          } else {
            // Fallback to Near Intents
            const token = await nearIntents.resolveToken(from);
            if (token.price > 0) srcPrice = token.price;
          }
        } catch (err) {
          try {
            const token = await nearIntents.resolveToken(from);
            if (token.price > 0) srcPrice = token.price;
          } catch {}
        }
      }
    }

    const usdEquivalent = (() => {
      if (src.kind === 'crypto' && dst.kind === 'fiat') {
        if (amountIn === 'source') return amount * srcPrice;
        
        // Dest-anchored: `amount` is the exact fiat the merchant MUST receive.
        const targetFiat = new Decimal(amount);
        const sr = new Decimal(sellRate);
        
        // Match the linear subtraction in line 115: netUsd = usdEquivalent * (1 - fees)
        // So usdEquivalent = netUsd / (1 - fees)
        const totalFeeRate = new Decimal(SENDER_FEE_BPS + APP_FEE_BPS + SLIPPAGE_BUFFER_BPS).div(10000);
        const netUsdc = targetFiat.div(sr);
        
        return netUsdc.div(new Decimal(1).minus(totalFeeRate)).toNumber();
      }
      if (src.kind === 'fiat' && dst.kind === 'crypto') {
        // Onramp: source is fiat; dest is USDC-equivalent.
        return amountIn === 'source' ? new Decimal(amount).div(buyRate).toNumber() : amount;
      }
      return amount * srcPrice;
    })();

    const plan = planRoute({ sourceAsset: from, destAsset: to, amount: usdEquivalent });

    // Bridge-fee snapshot. ChainRails gives us a live figure; for NEAR Intents
    // we book the slippage buffer as bridge fee so the breakdown reflects the
    // gross-up we just applied.
    let bridgeFeeUsd = 0;
    for (const step of plan.steps) {
      if (step.provider === 'chainrails') {
        try {
          const from = parseAsset(step.fromAsset);
          const to   = parseAsset(step.toAsset);
          if (from.kind !== 'crypto' || to.kind !== 'crypto') continue;
          const q = await chainRails.getBestQuote({
            sourceChain:      from.chain,
            sourceToken:      from.token,
            destinationChain: to.chain,
            destinationToken: to.token,
            amount:           usdEquivalent,
          });
          bridgeFeeUsd += Number(q.totalFeeFormatted) || 0;
        } catch {
          // Best-effort: missing bridge quote shouldn't block the overall quote.
        }
      } else if (step.provider === 'nearintents') {
        bridgeFeeUsd += usdEquivalent * slippageBuffer;
      }
    }

    const isPurePaystack = plan.steps.length === 1 && plan.steps[0].provider === 'paystack';

    let senderFeeUsd = usdEquivalent * (SENDER_FEE_BPS / 10000);
    let appFeeUsd    = usdEquivalent * (APP_FEE_BPS    / 10000);
    let netUsd       = usdEquivalent - senderFeeUsd - appFeeUsd - bridgeFeeUsd;
    let finalSourceAmount = usdEquivalent;

    if (isPurePaystack) {
      // Use the actual Paystack gross-up logic for accurate display
      const { chargeAmountNgn, weaveFeeNgn, paystackFeeNgn } = paystack.grossUp(amountIn === 'dest' ? amount : amount, sellRate);
      finalSourceAmount = chargeAmountNgn;
      senderFeeUsd = paystackFeeNgn / sellRate;
      appFeeUsd = weaveFeeNgn / sellRate;
      bridgeFeeUsd = 0;
      netUsd = (amountIn === 'dest' ? amount : (chargeAmountNgn - weaveFeeNgn - paystackFeeNgn)) / sellRate;
    }

    // Final display figure in the destination asset.
    const estimatedDest = dst.kind === 'fiat' ? netUsd * sellRate : netUsd;

    // Source-asset-denominated deposit amount. `usdEquivalent` is USD, but the
    // widget needs to tell the user "deposit X SOL" — and the NEAR Intents
    // swap (EXACT_INPUT) is fed that same source-token amount. For USDC/USDT
    // sources the live price ≈ $1 so this ≈ usdEquivalent; for SOL/ETH/etc
    // it's a meaningful conversion. Falls back to usdEquivalent when the
    // source isn't on NEAR Intents (e.g. direct USDC-on-Base same-asset).
    // Source-asset-denominated deposit amount.
    let sourceAmount = finalSourceAmount;
    if (src.kind === 'crypto' && srcPrice > 0 && !isPurePaystack) {
      sourceAmount = usdEquivalent / srcPrice;
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
          buyRate:  fiatCurrency ? buyRate  : null,
        },
      },
    });
  } catch (err: any) {
    console.error('quote error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
