import { parseAsset } from './assets';
import { nearIntents } from '../services/nearintents.service';

/** USD price for one unit of a crypto asset — matches `/quotes` pricing. */
export async function fetchCryptoUsdPrice(assetKey: string): Promise<number> {
  const src = parseAsset(assetKey);
  if (src.kind !== 'crypto') return 1;
  const sym = src.token.toUpperCase();
  if (sym === 'USDC' || sym === 'USDT') return 1;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const cb = await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`, { signal: controller.signal })
      .then(r => r.json())
      .finally(() => clearTimeout(timeoutId));
    if (cb?.data?.amount) return Number(cb.data.amount);
    const token = await nearIntents.resolveToken(assetKey);
    return token.price > 0 ? token.price : 1;
  } catch {
    try {
      const token = await nearIntents.resolveToken(assetKey);
      return token.price > 0 ? token.price : 1;
    } catch {
      return 1;
    }
  }
}
