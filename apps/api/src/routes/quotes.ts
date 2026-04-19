import { Router } from 'express';
import { paycrest } from '../services/paycrest.service';
import { chainRails } from '../services/chainrails.service';
import { requireApiKey } from '../middleware/auth';
import { parseAsset } from '../lib/assets';
import { planRoute } from '../services/router.service';

const router = Router();

const SENDER_FEE_BPS = Number(process.env.SENDER_FEE_BPS ?? 75);
const APP_FEE_BPS    = Number(process.env.APP_FEE_BPS    ?? 10);

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
    // stack per-hop bridge fees cleanly, then reproject.
    const usdEquivalent = (() => {
      if (src.kind === 'crypto' && dst.kind === 'fiat') {
        // Offramp: source is USDC-equivalent; dest is fiat.
        return amountIn === 'source' ? amount : amount / sellRate;
      }
      if (src.kind === 'fiat' && dst.kind === 'crypto') {
        // Onramp: source is fiat; dest is USDC-equivalent.
        return amountIn === 'source' ? amount / buyRate : amount;
      }
      // Same kind on both sides — treat as 1:1 until we add FX routes.
      return amount;
    })();

    const plan = planRoute({ sourceAsset: from, destAsset: to, amount: usdEquivalent });

    // Bridge-fee snapshot from ChainRails when the route includes it.
    let bridgeFeeUsd = 0;
    for (const step of plan.steps) {
      if (step.provider !== 'chainrails') continue;
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
    }

    const senderFeeUsd = usdEquivalent * (SENDER_FEE_BPS / 10000);
    const appFeeUsd    = usdEquivalent * (APP_FEE_BPS    / 10000);
    const netUsd       = usdEquivalent - senderFeeUsd - appFeeUsd - bridgeFeeUsd;

    // Final display figure in the destination asset.
    const estimatedDest = dst.kind === 'fiat' ? netUsd * sellRate : netUsd;

    res.json({
      success: true,
      data: {
        estimatedDest,
        route: plan,
        breakdown: {
          usdEquivalent,
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
    res.status(502).json({ success: false, error: err.message });
  }
});

export default router;
