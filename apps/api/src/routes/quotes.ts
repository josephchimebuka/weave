import { Router } from 'express';
import { paycrest, rateUnavailable } from '../services/paycrest.service';
import { chainRails } from '../services/chainrails.service';
import { nearIntents } from '../services/nearintents.service';
import { paystack } from '../services/paystack.service';
import { requireAuth } from '../middleware/auth';
import { Decimal } from 'decimal.js';
import { parseAsset } from '../lib/assets';
import { planRoute, type RoutePlan } from '../services/router.service';
import { sandboxFiatRate } from '../services/sandbox-executor';
import { fetchCryptoUsdPrice } from '../lib/crypto-usd-price';
import { estimateFiatFromUsdOfframp } from '../lib/offramp-estimate';
import { lifi } from '../services/lifi.service';
import { resolveDestAnchoredUsd } from '../services/offramp-pricing';

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
        const rate = sandboxFiatRate(fiatCurrency);
        return { sellRate: rate, buyRate: rate, sellQuoted: true, buyQuoted: true };
      }
      let rate: Awaited<ReturnType<typeof paycrest.getRate>>;
      try {
        rate = await paycrest.getRate('base', 'USDC', 1, fiatCurrency);
      } catch (err: any) {
        if (process.env.NODE_ENV !== 'production' && fiatCurrency === 'NGN') {
          console.warn('[quotes] Paycrest unavailable in dev, using NGN fallback:', err.message);
          return { sellRate: 1515, buyRate: 1515, sellQuoted: true, buyQuoted: true };
        }
        throw err;
      }
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

    const [{ sellRate, buyRate, sellQuoted, buyQuoted }, srcPrice] = await Promise.all([
      fetchFiatRate(),
      src.kind === 'crypto' ? fetchCryptoUsdPrice(from) : Promise.resolve(1),
    ]);

    const flow = (String(req.query.flow ?? 'external')) as 'self' | 'external' | 'stellar';
    // Dest-anchored offramps need the route BEFORE they can be priced (the fee
    // depends on which hops are in it), so plan early and reuse it below.
    let earlyPlan: RoutePlan | undefined;

    const usdEquivalent = await (async () => {
      if (src.kind === 'crypto' && dst.kind === 'fiat') {
        if (amountIn === 'source') return amount * srcPrice;

        // Dest-anchored: `amount` is the exact fiat the merchant MUST receive. Priced
        // by the same function `/orders` uses, so the amount quoted is the amount charged.
        earlyPlan = planRoute({ sourceAsset: from, destAsset: to, amount, flow });
        return resolveDestAnchoredUsd({ targetFiat: amount, sellRate, plan: earlyPlan, sandbox: req.sandboxMode });
      }
      if (src.kind === 'fiat' && dst.kind === 'crypto') {
        // Onramp: source is fiat; dest is USDC-equivalent.
        return amountIn === 'source' ? new Decimal(amount).div(buyRate).toNumber() : amount;
      }
      return amount * srcPrice;
    })();

    const MIN_CRYPTO_PAYMENT_USD = Number(process.env.MIN_CRYPTO_PAYMENT_USD ?? 0.5);
    if (src.kind === 'crypto' && usdEquivalent < MIN_CRYPTO_PAYMENT_USD) {
      return res.status(400).json({
        success: false,
        error: `This amount is below the $${MIN_CRYPTO_PAYMENT_USD.toFixed(2)} minimum for crypto payments.`,
      });
    }

    const plan = earlyPlan ?? planRoute({ sourceAsset: from, destAsset: to, amount: usdEquivalent, flow });

    // Bridge-fee snapshot. ChainRails gives us a live figure; for NEAR Intents
    // we book the slippage buffer as bridge fee so the breakdown reflects the
    // gross-up we just applied.
    // Each step's fee lookup targets a different provider/hop and doesn't
    // depend on any other step's result — safe to fetch concurrently.
    let bridgeFeeUsd = 0;
    await Promise.all(plan.steps.map(async (step) => {
      if (step.provider === 'chainrails') {
        try {
          const fromA = parseAsset(step.fromAsset);
          const toA   = parseAsset(step.toAsset);
          if (fromA.kind !== 'crypto' || toA.kind !== 'crypto') return;
          const q = await chainRails.getBestQuote({
            sourceChain:      fromA.chain,
            sourceToken:      fromA.token,
            destinationChain: toA.chain,
            destinationToken: toA.token,
            amount:           usdEquivalent,
          });
          bridgeFeeUsd += Number(q.totalFeeFormatted) || 0;
        } catch {
          // Best-effort: missing bridge quote shouldn't block the overall quote.
        }
      }
    }));

    const isPurePaystack = plan.steps.length === 1 && plan.steps[0].provider === 'paystack';

    let paycrestFeeUsd = 0; // Paycrest's per-order fee (protocol-set, read live); only for crypto → fiat
    let paycrestFeeKnown: boolean | null = null; // false = Paycrest hasn't shown us its fee yet
    let senderFeeUsd = usdEquivalent * (SENDER_FEE_BPS / 10000);
    let appFeeUsd    = usdEquivalent * (APP_FEE_BPS    / 10000);
    let netUsd       = usdEquivalent - senderFeeUsd - appFeeUsd - bridgeFeeUsd;
    let finalSourceAmount = usdEquivalent;

    if (src.kind === 'crypto' && dst.kind === 'fiat' && !isPurePaystack) {
      // Stellar-origin hops cost a live, size-dependent amount (0.25% via CCTP from
      // ~$2, ~7.9% over Layerswap at $0.80) — price the real route, not a guess.
      const stellarBridgeFeeUsd = await lifi.stellarBridgeFeeForPlan(plan, usdEquivalent, { sandbox: req.sandboxMode });
      // Source-anchored NEAR hops are priced live too. (Dest-anchored keeps the flat
      // buffer: for exact-output orders it is partly an appFee paid to Weave.)
      const nearCostBps = amountIn === 'source'
        ? await nearIntents.costBpsForPlan(plan, usdEquivalent, { sandbox: req.sandboxMode })
        : undefined;
      const paycrestFee = await paycrest.feeForPlan(plan, { sandbox: req.sandboxMode });
      paycrestFeeKnown = paycrestFee ? paycrestFee.known : null;
      const est = estimateFiatFromUsdOfframp(usdEquivalent, sellRate, plan, { stellarBridgeFeeUsd, nearCostBps, paycrestFeeUsd: paycrestFee?.feeUsd });
      bridgeFeeUsd = est.bridgeFeeUsd;
      paycrestFeeUsd = est.paycrestFeeUsd;
      senderFeeUsd = est.senderFeeUsd;
      appFeeUsd = est.appFeeUsd;
      netUsd = est.netUsd;
    }

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
          paycrestFeeUsd,
          paycrestFeeKnown,
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
