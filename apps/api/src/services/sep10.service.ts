// SEP-10 Stellar Web Authentication.
//
// The wallet asks for a challenge transaction for its account, signs it, and
// posts it back; we verify the signatures against the account's on-chain
// signers (or its master key when the account doesn't exist yet) and mint a
// JWT the wallet then presents to every SEP-24 endpoint. Spec:
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Horizon, StrKey, WebAuth } from '@stellar/stellar-sdk';
import {
  HORIZON_URL,
  SEP10_AUTH_URL,
  SEP10_CHALLENGE_TIMEOUT_S,
  SEP10_JWT_SECRET,
  SEP10_JWT_TTL_S,
  STELLAR_ANCHOR_HOME_DOMAIN,
  STELLAR_NETWORK_PASSPHRASE,
  anchorSigningKeypair,
} from '../lib/stellar-anchor-config';

export interface Sep10Claims {
  iss: string;
  sub: string;        // "G..." or "G...:memo"
  iat: number;
  exp: number;
  jti: string;        // challenge tx hash — one JWT per challenge
  client_domain?: string;
}

export interface Sep10Identity {
  account: string;
  memo: string | null;
  clientDomain: string | null;
}

// The `web_auth_domain` bound into the challenge: host of the auth endpoint.
const WEB_AUTH_DOMAIN = new URL(SEP10_AUTH_URL).host;

export function buildChallenge(params: {
  account: string;
  memo?: string;
  homeDomain?: string;
  clientDomain?: string;
}): { transaction: string; network_passphrase: string } {
  const { account, memo, homeDomain } = params;
  if (!StrKey.isValidEd25519PublicKey(account) && !StrKey.isValidMed25519PublicKey(account)) {
    throw new Error('account is not a valid Stellar public key');
  }
  if (memo !== undefined && !/^\d+$/.test(memo)) {
    throw new Error('memo must be an unsigned 64-bit integer string');
  }
  if (homeDomain && homeDomain !== STELLAR_ANCHOR_HOME_DOMAIN) {
    throw new Error(`home_domain must be ${STELLAR_ANCHOR_HOME_DOMAIN}`);
  }
  // SEP-10 client-domain verification (optional, for non-custodial wallets)
  // needs the client's SIGNING_KEY from its stellar.toml. Pollar's custodial
  // signer doesn't use it; we accept the param and leave co-signing out for v1.
  const tx = WebAuth.buildChallengeTx(
    anchorSigningKeypair(),
    account,
    STELLAR_ANCHOR_HOME_DOMAIN,
    SEP10_CHALLENGE_TIMEOUT_S,
    STELLAR_NETWORK_PASSPHRASE,
    WEB_AUTH_DOMAIN,
    memo,
  );
  return { transaction: tx, network_passphrase: STELLAR_NETWORK_PASSPHRASE };
}

/**
 * Verify a signed challenge and mint the session JWT. Signers are checked
 * against the account's Horizon record when it exists (medium threshold);
 * an account that doesn't exist yet (deferred-funded wallets) must be signed
 * by its master key.
 */
export async function verifyChallengeAndMintJwt(signedXdr: string): Promise<{ token: string; identity: Sep10Identity }> {
  if (!SEP10_JWT_SECRET) throw new Error('SEP-10 JWT secret is not configured');
  const server = anchorSigningKeypair();

  const { tx, clientAccountID, memo } = WebAuth.readChallengeTx(
    signedXdr,
    server.publicKey(),
    STELLAR_NETWORK_PASSPHRASE,
    [STELLAR_ANCHOR_HOME_DOMAIN],
    WEB_AUTH_DOMAIN,
  );

  const horizon = new Horizon.Server(HORIZON_URL);
  let account: Horizon.AccountResponse | null = null;
  try {
    account = await horizon.loadAccount(clientAccountID);
  } catch (err: any) {
    if (err?.response?.status !== 404 && err?.name !== 'NotFoundError') throw err;
  }

  if (account) {
    WebAuth.verifyChallengeTxThreshold(
      signedXdr,
      server.publicKey(),
      STELLAR_NETWORK_PASSPHRASE,
      account.thresholds.med_threshold,
      account.signers,
      [STELLAR_ANCHOR_HOME_DOMAIN],
      WEB_AUTH_DOMAIN,
    );
  } else {
    // Account not on-chain yet: only its master key can have signed.
    WebAuth.verifyChallengeTxSigners(
      signedXdr,
      server.publicKey(),
      STELLAR_NETWORK_PASSPHRASE,
      [clientAccountID],
      [STELLAR_ANCHOR_HOME_DOMAIN],
      WEB_AUTH_DOMAIN,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const sub = memo ? `${clientAccountID}:${memo}` : clientAccountID;
  const claims: Sep10Claims = {
    iss: SEP10_AUTH_URL,
    sub,
    iat: now,
    exp: now + SEP10_JWT_TTL_S,
    jti: Buffer.from(tx.hash()).toString('hex'),
  };
  const token = jwt.sign(claims, SEP10_JWT_SECRET, { algorithm: 'HS256' });
  return { token, identity: { account: clientAccountID, memo: memo ?? null, clientDomain: null } };
}

/** Parse + verify a SEP-10 bearer JWT. Returns null when invalid/expired. */
export function verifySep10Jwt(token: string): Sep10Identity | null {
  if (!SEP10_JWT_SECRET) return null;
  try {
    const c = jwt.verify(token, SEP10_JWT_SECRET, { algorithms: ['HS256'], issuer: SEP10_AUTH_URL }) as Sep10Claims;
    const [account, memo] = String(c.sub).split(':');
    if (!StrKey.isValidEd25519PublicKey(account) && !StrKey.isValidMed25519PublicKey(account)) return null;
    return { account, memo: memo ?? null, clientDomain: c.client_domain ?? null };
  } catch {
    return null;
  }
}

/** One-time bearer for the hosted interactive page. Returned in the URL; only its hash is stored. */
export function mintInteractiveToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashInteractiveToken(token) };
}

export function hashInteractiveToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
