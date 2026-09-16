import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

// Lists deposit accounts in the Anchor SANDBOX org so we can pick one to use as the
// fee-skim platform account (ANCHOR_PLATFORM_ACCOUNT_ID_TEST). Any account that is NOT a
// merchant's own collection account works.
async function main() {
  const base = process.env.ANCHOR_SANDBOX_API_BASE || 'https://api.sandbox.getanchor.co';
  const key = process.env.ANCHOR_API_KEY_TEST || '';
  if (!key) { console.error('ANCHOR_API_KEY_TEST not set'); process.exit(1); }

  const res = await fetch(`${base}/api/v1/accounts?page=0&size=50`, {
    headers: { 'x-anchor-key': key, accept: 'application/json' },
  });
  const json: any = await res.json();
  if (!res.ok) { console.error('list failed', res.status, JSON.stringify(json)); process.exit(1); }

  const merchants = await prisma.merchant.findMany({
    where: { anchorAccountId: { not: null } },
    select: { anchorAccountId: true, name: true },
  });
  const merchantAccts = new Map(merchants.map((m) => [m.anchorAccountId, m.name]));

  const items: any[] = json.data ?? [];
  console.log(`${items.length} deposit accounts in sandbox org:\n`);
  for (const a of items) {
    const at = a.attributes ?? {};
    const owned = merchantAccts.has(a.id) ? `  ← merchant "${merchantAccts.get(a.id)}" (do NOT use)` : '  ← free for platform';
    console.log(`  ${a.id}  name=${at.accountName ?? '?'}  bal=${at.availableBalance ?? at.balance ?? '?'}${owned}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
