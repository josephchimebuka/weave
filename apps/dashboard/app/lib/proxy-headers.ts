import { headers } from 'next/headers';

/**
 * Build the header set for a server-side proxy call to the Express API.
 *
 * The dashboard talks to the API as Next-server → Express, so by default the API
 * only sees the Node `fetch` context: no `user-agent` and a Cloudflare/proxy IP.
 * That made every dashboard-originated audit row classify as device "Unknown"
 * with a Cloudflare IP. Forwarding the *browser's* `user-agent` and client IP
 * from the incoming request restores accurate device/IP in the audit trail —
 * the API's audit recorder already reads `req.headers['user-agent']` / `req.ip`.
 *
 * Note: `user-agent` is inherently client-declared (browsers set their own), so
 * forwarding it introduces no new trust assumption. The IP is forwarded for audit
 * *display* only and is never used for an authorization decision.
 */
export async function proxyHeaders(
  token: string | null | undefined,
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const h = await headers();
  const out: Record<string, string> = { 'x-session-token': token ?? '', ...extra };

  const ua = h.get('user-agent');
  if (ua) out['user-agent'] = ua;

  // Prefer the platform's connecting-IP header; fall back to the left-most XFF hop.
  const ip = h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (ip) out['x-forwarded-for'] = ip;

  return out;
}
