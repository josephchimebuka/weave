import { Router } from 'express';
import { paycrest, rateUnavailable } from '../services/paycrest.service';
import { chainRails } from '../services/chainrails.service';
import { nearIntents } from '../services/nearintents.service';
import { paystack } from '../services/paystack.service';
import { requireAuth } from '../middleware/auth';
import { Decimal } from 'decimal.js';
import { parseAsset } from '../lib/assets';
import { planRoute } from '../services/router.service';
import { SANDBOX_NGN_RATE } from '../services/sandbox-executor';

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
router.get('/', requireAuth, async (req, res) => {
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

    // Normalize both sides of the quote into USD-equivalent (USDC) so we can
    // stack per-hop bridge fees cleanly, then reproject. For dest-anchored
    // offramps we gross up so the merchant receives *exactly* `amount` after
    // every downstream cut: Paycrest's sender fee (= our SENDER_FEE_BPS, which
    // Paycrest collects for us), our APP_FEE_BPS, and the NEAR Intents swap
    // spread (absorbed by SLIPPAGE_BUFFER_BPS).
    const feeRate        = (SENDER_FEE_BPS + APP_FEE_BPS) / 10000;
    const slippageBuffer = SLIPPAGE_BUFFER_BPS / 10000;

    // The fiat rate (Paycrest) and the source asset's USD price (Coinbase/NEAR)
    // are independent lookups — neither reads the other's result — so fetch
    // them concurrently instead of one after the other.
    async function fetchFiatRate(): Promise<{ sellRate: number; buyRate: number; sellQuoted: boolean; buyQuoted: boolean }> {
      if (!fiatCurrency) return { sellRate: 1, buyRate: 1, sellQuoted: false, buyQuoted: false };
      if (req.sandboxMode) {
        // Sandbox quotes use the fixed rate so display matches sandbox execution.
        return { sellRate: SANDBOX_NGN_RATE, buyRate: SANDBOX_NGN_RATE, sellQuoted: true, buyQuoted: true };
      }
      const rate = await paycrest.getRate('base', 'USDC', 1, fiatCurrency);
      // Paycrest returns ONLY the legs it currently has a provider for: a
      // currency it can pay out but not collect comes back with `sell` and no
      // `buy` at all. Read the leg this direction actually needs — reading both
      // blindly took every NGN quote down, in both directions, the day the
      // naira onramp provider went away. Never default a missing leg to 1:
      // a ₦2,000 onramp would price as 2,000 USDC.
      const sell = Number(rate?.sell?.rate);
      const buy  = Number(rate?.buy?.rate);
      if (src.kind === 'fiat' && !buy)  throw new Error(rateUnavailable(fiatCurrency, 'deposits'));
      if (dst.kind === 'fiat' && !sell) throw new Error(rateUnavailable(fiatCurrency, 'payouts'));
      // The unused leg carries a 1 placeholder so the maths below stays total;
      // `*Quoted` keeps the response honest about which one Paycrest priced.
      return { sellRate: sell || 1, buyRate: buy || 1, sellQuoted: !!sell, buyQuoted: !!buy };
    }

    async function fetchSrcPrice(): Promise<number> {
      if (src.kind !== 'crypto') return 1;
      const sym = src.token.toUpperCase();
      if (sym === 'USDC' || sym === 'USDT') return 1;
      try {
        // Try Coinbase public API first for common assets
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const cb = await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`, { signal: controller.signal })
          .then(r => r.json())
          .finally(() => clearTimeout(timeoutId));
        if (cb?.data?.amount) return Number(cb.data.amount);
        // Fallback to Near Intents
        const token = await nearIntents.resolveToken(from);
        return token.price > 0 ? token.price : 1;
      } catch {
        try {
          const token = await nearIntents.resolveToken(from);
          return token.price > 0 ? token.price : 1;
        } catch {
          return 1;
        }
      }
    }

    const [{ sellRate, buyRate, sellQuoted, buyQuoted }, srcPrice] = await Promise.all([fetchFiatRate(), fetchSrcPrice()]);

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

    // Reject sub-minimum crypto-funded quotes up-front so the widget can warn the
    // payer before they attempt the order (mirrors the guard in POST /orders).
    const MIN_CRYPTO_PAYMENT_USD = Number(process.env.MIN_CRYPTO_PAYMENT_USD ?? 0.5);
    if (src.kind === 'crypto' && usdEquivalent < MIN_CRYPTO_PAYMENT_USD) {
      return res.status(400).json({
        success: false,
        error: `This amount is below the $${MIN_CRYPTO_PAYMENT_USD.toFixed(2)} minimum for crypto payments.`,
      });
    }

    const plan = planRoute({ sourceAsset: from, destAsset: to, amount: usdEquivalent });

    // Bridge-fee snapshot. ChainRails gives us a live figure; for NEAR Intents
    // we book the slippage buffer as bridge fee so the breakdown reflects the
    // gross-up we just applied.
    // Each step's fee lookup targets a different provider/hop and doesn't
    // depend on any other step's result — safe to fetch concurrently.
    let bridgeFeeUsd = 0;
    await Promise.all(plan.steps.map(async (step) => {
      if (step.provider === 'chainrails') {
        try {
          const from = parseAsset(step.fromAsset);
          const to   = parseAsset(step.toAsset);
          if (from.kind !== 'crypto' || to.kind !== 'crypto') return;
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
      } else if (step.provider === 'lifi') {
        // LI.FI fixed fee on the CCTP route (25 bps) — no slippage on a 1:1 USDC burn/mint.
        bridgeFeeUsd += usdEquivalent * 0.0025;
      }
    }));

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
          sellRate: sellQuoted ? sellRate : null,
          buyRate:  buyQuoted  ? buyRate  : null,
        },
      },
    });
  } catch (err: any) {
    console.error('quote error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
