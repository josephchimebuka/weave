// Configuration for Weave-as-a-Stellar-anchor (SEP-1 / SEP-10 / SEP-24).
//
// NOT getanchor.co. Every `anchor*` field elsewhere in this codebase refers to
// the Nigerian BaaS rail; everything here is namespaced `stellar-anchor` / `sep`.
//
// Weave exposes the NGN corridor to any SEP-24-capable wallet or platform
// (Pollar's ramp modal in particular): the wallet authenticates the user's
// Stellar account with SEP-10, then opens our hosted interactive page where the
// user deposits NGN (→ USDC on Stellar, into their own account) or withdraws
// USDC (→ NGN bank). Each interactive session wraps exactly one Weave Order.

import { Keypair, Networks } from '@stellar/stellar-sdk';

export type StellarNetworkName = 'mainnet' | 'testnet';

// Circle-issued USDC on Stellar. The only asset this anchor moves.
export const STELLAR_USDC_ISSUER: Record<StellarNetworkName, string> = {
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
};

// The Stellar network FOLLOWS THE CREDENTIALS, exactly like the rest of Weave:
// live keys (pk_live_/sk_live_) → mainnet, sandbox keys (pk_test_/sk_test_) →
// testnet. There is no global network switch. Every Stellar-touching code path
// asks for `stellarNet(order.sandboxMode)`.
export interface StellarNet {
  network: StellarNetworkName;
  passphrase: string;
  horizonUrl: string;
  usdcIssuer: string;
}
export function stellarNet(sandbox: boolean): StellarNet {
  const network: StellarNetworkName = sandbox ? 'testnet' : 'mainnet';
  return {
    network,
    passphrase: network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
    horizonUrl: network === 'testnet'
      ? (process.env.STELLAR_HORIZON_TESTNET_URL || 'https://horizon-testnet.stellar.org')
      : (process.env.STELLAR_HORIZON_URL || 'https://horizon.stellar.org'),
    usdcIssuer: STELLAR_USDC_ISSUER[network],
  };
}

// When true, the ANCHOR on this host is a sandbox anchor: its interactive pages
// use the anchor merchant's pk_test_ key (sandbox orders → testnet), and its
// stellar.toml / SEP-10 advertise the testnet passphrase. One network per
// domain is a Stellar constraint, so this is the anchor-level analogue of the
// per-credential rule above.
export const STELLAR_ANCHOR_SANDBOX = process.env.STELLAR_ANCHOR_SANDBOX === 'true';

const ANCHOR_NET = stellarNet(STELLAR_ANCHOR_SANDBOX);
export const STELLAR_NETWORK: StellarNetworkName = ANCHOR_NET.network;
export const STELLAR_NETWORK_PASSPHRASE = ANCHOR_NET.passphrase;
export const HORIZON_URL = ANCHOR_NET.horizonUrl;

// The domain whose /.well-known/stellar.toml advertises this anchor. Wallets
// pass it back as `home_domain` in SEP-10, and it is baked into the challenge.
// Defaults to the API host so a single deployment serves toml + auth + SEP-24.
export const STELLAR_ANCHOR_HOME_DOMAIN: string = (() => {
  if (process.env.STELLAR_ANCHOR_HOME_DOMAIN) return process.env.STELLAR_ANCHOR_HOME_DOMAIN;
  try { return new URL(process.env.API_BASE || 'http://localhost:4000').host; } catch { return 'localhost:4000'; }
})();

// Public origin (scheme + host) used to build absolute URLs in stellar.toml.
export const STELLAR_ANCHOR_ORIGIN: string = (() => {
  try { const u = new URL(process.env.API_BASE || 'http://localhost:4000'); return `${u.protocol}//${u.host}`; } catch { return 'http://localhost:4000'; }
})();

export const SEP10_AUTH_URL   = `${STELLAR_ANCHOR_ORIGIN}/api/v1/sep10/auth`;
export const SEP24_SERVER_URL = `${STELLAR_ANCHOR_ORIGIN}/api/v1/sep24`;

// SEP-10 challenge validity + JWT lifetime.
export const SEP10_CHALLENGE_TIMEOUT_S = 300;
export const SEP10_JWT_TTL_S = 24 * 60 * 60;

// Signing key for SEP-10 challenges (SIGNING_KEY in stellar.toml). Kept
// separate in intent from the treasury key, though a deployment may reuse one
// keypair via WEAVE_STELLAR_SECRET_KEY.
export const STELLAR_ANCHOR_SIGNING_SECRET: string =
  process.env.STELLAR_ANCHOR_SIGNING_SECRET || process.env.WEAVE_STELLAR_SECRET_KEY || '';

export function anchorSigningKeypair(): Keypair {
  if (!STELLAR_ANCHOR_SIGNING_SECRET) throw new Error('STELLAR_ANCHOR_SIGNING_SECRET (or WEAVE_STELLAR_SECRET_KEY) is not set');
  return Keypair.fromSecret(STELLAR_ANCHOR_SIGNING_SECRET);
}

export function anchorSigningPublicKey(): string | null {
  try { return anchorSigningKeypair().publicKey(); } catch { return null; }
}

// HMAC secret for the SEP-10 JWTs we mint. Falls back to ADMIN_SECRET so a
// deployment that already has one boots; set a dedicated value in production.
export const SEP10_JWT_SECRET: string =
  process.env.STELLAR_ANCHOR_JWT_SECRET || process.env.ADMIN_SECRET || '';

// Which Weave merchant owns anchor-originated orders (see ensureStellarAnchorMerchant).
export const STELLAR_ANCHOR_MERCHANT_EMAIL =
  (process.env.STELLAR_ANCHOR_MERCHANT_EMAIL || 'stellar-anchor@paywithweave.com').toLowerCase();

// Corridor limits advertised in SEP-24 /info (NGN for deposit-in / withdraw-out).
export const SEP24_NGN_MIN = Number(process.env.SEP24_NGN_MIN ?? 1000);
export const SEP24_NGN_MAX = Number(process.env.SEP24_NGN_MAX ?? 5_000_000);
export const SEP24_USDC_MIN = Number(process.env.SEP24_USDC_MIN ?? 1);
export const SEP24_USDC_MAX = Number(process.env.SEP24_USDC_MAX ?? 5000);
