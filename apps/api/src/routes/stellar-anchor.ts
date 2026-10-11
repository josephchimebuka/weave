// Weave as a Stellar anchor: SEP-1 (stellar.toml), SEP-10 (web auth) and
// SEP-24 (hosted deposit / withdrawal). Mounted twice from index.ts:
//   tomlRouter   → GET /.well-known/stellar.toml        (must live at the domain root)
//   sep10Router  → /api/v1/sep10/auth
//   sep24Router  → /api/v1/sep24/*
// NOT getanchor.co — see lib/stellar-anchor-config.ts.

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import {
  SEP10_AUTH_URL,
  SEP24_SERVER_URL,
  STELLAR_ANCHOR_HOME_DOMAIN,
  STELLAR_ANCHOR_SANDBOX,
  STELLAR_NETWORK,
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_USDC_ISSUER,
  anchorSigningPublicKey,
} from '../lib/stellar-anchor-config';
import {
  buildChallenge,
  hashInteractiveToken,
  mintInteractiveToken,
  verifyChallengeAndMintJwt,
  verifySep10Jwt,
  type Sep10Identity,
} from '../services/sep10.service';
import {
  anchorPublishableKey,
  linkOrderToAnchorTx,
  sep24Info,
  serializeSep24Transaction,
  syncAnchorTxFromOrder,
  type Sep24Kind,
} from '../services/sep24.service';
import { recordAudit } from '../services/audit.service';

// SEP endpoints are called cross-origin by wallets — allow any origin here.
function openCors(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

// SEP-24 interactive POSTs may arrive as multipart/form-data or JSON.
const formOrJson = multer().none();

// ── SEP-1: stellar.toml ─────────────────────────────────────────────────────

export const tomlRouter = Router();
tomlRouter.get('/.well-known/stellar.toml', openCors, (_req, res) => {
  const signingKey = anchorSigningPublicKey();
  if (!signingKey) return res.status(503).type('text/plain').send('# anchor signing key not configured\n');
  const issuer = STELLAR_USDC_ISSUER[STELLAR_NETWORK];
  const dashboard = (process.env.DASHBOARD_URL || 'http://localhost:3001').replace(/\/$/, '');
  const toml = `# Weave — Stellar anchor for the Nigerian naira corridor
VERSION="2.7.0"
NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE}"
SIGNING_KEY="${signingKey}"
WEB_AUTH_ENDPOINT="${SEP10_AUTH_URL}"
TRANSFER_SERVER_SEP0024="${SEP24_SERVER_URL}"
ACCOUNTS=["${signingKey}"]

[DOCUMENTATION]
ORG_NAME="Dewdrop Labs"
ORG_DBA="Weave"
ORG_URL="https://paywithweave.com"
ORG_DESCRIPTION="Universal crypto ↔ fiat checkout. NGN on/off-ramp anchor for Stellar wallets and platforms (Pollar)."
ORG_SUPPORT_EMAIL="${process.env.SUPPORT_EMAIL || 'support@paywithweave.com'}"
ORG_LOGO="${dashboard}/icon.png"

[[CURRENCIES]]
code="USDC"
issuer="${issuer}"
status="live"
display_decimals=2
name="USD Coin"
desc="Circle-issued USDC on Stellar. Deposit NGN by bank transfer and receive USDC in your own wallet; withdraw USDC to any Nigerian bank account."
is_asset_anchored=false
anchor_asset_type="fiat"
anchor_asset="NGN"
`;
  res.set('Cache-Control', 'public, max-age=300').type('text/plain; charset=utf-8').send(toml);
});

// ── SEP-10: web auth ────────────────────────────────────────────────────────

export const sep10Router = Router();
sep10Router.use(openCors);

sep10Router.get('/auth', (req, res) => {
  try {
    const account = String(req.query.account ?? '');
    const memo = req.query.memo !== undefined ? String(req.query.memo) : undefined;
    const homeDomain = req.query.home_domain !== undefined ? String(req.query.home_domain) : undefined;
    const clientDomain = req.query.client_domain !== undefined ? String(req.query.client_domain) : undefined;
    if (!account) return res.status(400).json({ error: 'account is required' });
    return res.json(buildChallenge({ account, memo, homeDomain, clientDomain }));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

sep10Router.post('/auth', formOrJson, async (req, res) => {
  const xdr = String(req.body?.transaction ?? '');
  if (!xdr) return res.status(400).json({ error: 'transaction is required' });
  try {
    const { token, identity } = await verifyChallengeAndMintJwt(xdr);
    recordAudit({
      actorType: 'system', action: 'stellar_anchor.sep10.authenticated',
      targetType: 'stellar_account', targetId: identity.account,
      ip: req.ip ?? null, userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      metadata: { memo: identity.memo, homeDomain: STELLAR_ANCHOR_HOME_DOMAIN },
    });
    return res.json({ token });
  } catch (err: any) {
    console.warn('[sep10] challenge rejected:', err.message);
    return res.status(400).json({ error: 'invalid challenge transaction' });
  }
});

// ── SEP-24: transfer server ─────────────────────────────────────────────────

export const sep24Router = Router();
sep24Router.use(openCors);

// Bearer JWT from SEP-10.
function requireSep10(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  const identity = token ? verifySep10Jwt(token) : null;
  if (!identity) return res.status(403).json({ type: 'authentication_required' });
  (req as any).sep10 = identity;
  next();
}

const interactiveBase = () => (process.env.DASHBOARD_URL || 'http://localhost:3001').replace(/\/$/, '');
const moreInfoUrl = (id: string) => `${interactiveBase()}/ramp/status/${id}`;

sep24Router.get('/info', (_req, res) => res.json(sep24Info()));

async function startInteractive(kind: Sep24Kind, req: Request, res: Response) {
  const identity = (req as any).sep10 as Sep10Identity;
  const body = (req.body ?? {}) as Record<string, string | undefined>;
  const assetCode = String(body.asset_code ?? 'USDC').toUpperCase();
  if (assetCode !== 'USDC') return res.status(400).json({ error: 'only USDC is supported' });

  // SEP-24 lets the wallet name a different destination/source `account`; we
  // pin it to the authenticated account so funds can only move to/from the
  // wallet that proved control of its key.
  if (body.account && body.account !== identity.account) {
    return res.status(400).json({ error: 'account must match the authenticated account' });
  }
  const amount = body.amount !== undefined && body.amount !== '' ? Number(body.amount) : null;
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const { token, hash } = mintInteractiveToken();
  const tx = await prisma.stellarAnchorTransaction.create({
    data: {
      kind,
      account:     identity.account,
      accountMemo: identity.memo,
      assetCode,
      lang:        body.lang ? String(body.lang).slice(0, 12) : null,
      // The wallet's `amount` is in the on-chain asset for both kinds (SEP-24);
      // for deposits that is the USDC the user wants to end up with.
      ...(amount !== null ? (kind === 'deposit' ? { amountOut: amount } : { amountIn: amount }) : {}),
      interactiveTokenHash: hash,
    },
  });

  const url = new URL(`${interactiveBase()}/ramp/${kind === 'deposit' ? 'deposit' : 'withdraw'}/${tx.id}`);
  url.searchParams.set('token', token);
  if (body.lang) url.searchParams.set('lang', String(body.lang).slice(0, 12));
  if (body.callback) url.searchParams.set('callback', String(body.callback).slice(0, 2048));

  recordAudit({
    actorType: 'system', action: `stellar_anchor.sep24.${kind}.started`,
    targetType: 'stellar_anchor_tx', targetId: tx.id,
    ip: req.ip ?? null, userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    metadata: { account: identity.account, amount, sandbox: STELLAR_ANCHOR_SANDBOX },
  });

  return res.json({ type: 'interactive_customer_info_needed', url: url.toString(), id: tx.id });
}

sep24Router.post('/transactions/deposit/interactive',  requireSep10, formOrJson, (req, res) => startInteractive('deposit', req, res));
sep24Router.post('/transactions/withdraw/interactive', requireSep10, formOrJson, (req, res) => startInteractive('withdrawal', req, res));

sep24Router.get('/transaction', requireSep10, async (req, res) => {
  const identity = (req as any).sep10 as Sep10Identity;
  const { id, stellar_transaction_id, external_transaction_id } = req.query as Record<string, string | undefined>;
  const where = id ? { id }
    : stellar_transaction_id ? { stellarTransactionId: stellar_transaction_id }
    : external_transaction_id ? { externalTransactionId: external_transaction_id }
    : null;
  if (!where) return res.status(400).json({ error: 'id, stellar_transaction_id or external_transaction_id is required' });

  const found = await prisma.stellarAnchorTransaction.findFirst({ where: { ...where, account: identity.account } });
  if (!found) return res.status(404).json({ error: 'transaction not found' });

  // Cheap poll of the underlying order so a wallet polling us sees fresh state
  // even between our own webhook/QStash ticks.
  if (found.orderId) {
    try {
      const { syncOrder } = await import('../services/executor.service');
      await syncOrder(found.orderId);
    } catch { /* best-effort */ }
  }
  const tx = (await syncAnchorTxFromOrder(found.id))!;
  return res.json({ transaction: serializeSep24Transaction(tx, moreInfoUrl(tx.id)) });
});

sep24Router.get('/transactions', requireSep10, async (req, res) => {
  const identity = (req as any).sep10 as Sep10Identity;
  const { asset_code, kind, limit, no_older_than, paging_id } = req.query as Record<string, string | undefined>;
  if (asset_code && asset_code.toUpperCase() !== 'USDC') return res.json({ transactions: [] });

  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const where: any = { account: identity.account };
  if (kind === 'deposit' || kind === 'withdrawal') where.kind = kind;
  if (no_older_than) { const d = new Date(no_older_than); if (!isNaN(d.getTime())) where.startedAt = { gte: d }; }
  if (paging_id) {
    const anchor = await prisma.stellarAnchorTransaction.findUnique({ where: { id: paging_id }, select: { startedAt: true } });
    if (anchor) where.startedAt = { ...(where.startedAt ?? {}), lt: anchor.startedAt };
  }
  const rows = await prisma.stellarAnchorTransaction.findMany({
    where, orderBy: { startedAt: 'desc' }, take,
    include: { order: { include: { steps: true } } },
  });
  return res.json({ transactions: rows.map(tx => serializeSep24Transaction(tx, moreInfoUrl(tx.id))) });
});

// ── Interactive-page API (bearer = one-time token from the interactive URL) ──
// The hosted page (dashboard app, /ramp/*) uses these instead of SEP-10 —
// the wallet never shares its SEP-10 JWT with the page.

async function requireInteractive(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : String(req.query.token ?? '');
  if (!token) return res.status(401).json({ success: false, error: 'missing interactive token' });
  const tx = await prisma.stellarAnchorTransaction.findFirst({
    where: { id: req.params.id, interactiveTokenHash: hashInteractiveToken(token) },
    include: { order: { include: { steps: true } } },
  });
  if (!tx) return res.status(404).json({ success: false, error: 'transaction not found' });
  (req as any).anchorTx = tx;
  next();
}

// Context the page needs to render + create the order.
sep24Router.get('/interactive/:id', requireInteractive, async (req, res) => {
  const tx = (req as any).anchorTx;
  const synced = tx.orderId ? await syncAnchorTxFromOrder(tx.id) : tx;
  res.json({
    success: true,
    data: {
      id:             synced!.id,
      kind:           synced!.kind,
      account:        synced!.account,
      assetCode:      synced!.assetCode,
      amountIn:       synced!.amountIn != null ? Number(synced!.amountIn) : null,
      amountOut:      synced!.amountOut != null ? Number(synced!.amountOut) : null,
      status:         synced!.status,
      orderId:        synced!.orderId,
      publishableKey: await anchorPublishableKey(),
      sandbox:        STELLAR_ANCHOR_SANDBOX,
      network:        STELLAR_NETWORK,
      usdcIssuer:     STELLAR_USDC_ISSUER[STELLAR_NETWORK],
      withdraw:       synced!.kind === 'withdrawal' ? {
        anchorAccount: synced!.withdrawAnchorAccount, memo: synced!.withdrawMemo, memoType: synced!.withdrawMemoType,
      } : null,
    },
  });
});

// Bind the order the page just created (via the public proxy) to this tx.
sep24Router.post('/interactive/:id/link', requireInteractive, async (req, res) => {
  const tx = (req as any).anchorTx;
  const orderId = String(req.body?.orderId ?? '');
  if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required' });
  try {
    const linked = await linkOrderToAnchorTx(tx, orderId);
    const synced = await syncAnchorTxFromOrder(linked.id);
    return res.json({ success: true, data: { id: synced!.id, status: synced!.status, orderId: synced!.orderId } });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// Public status view for more_info_url (no token: the page shows only
// non-sensitive state — status, amounts, masked account).
sep24Router.get('/status/:id', async (req, res) => {
  const tx = await prisma.stellarAnchorTransaction.findUnique({
    where: { id: req.params.id },
    include: { order: { include: { steps: true } } },
  });
  if (!tx) return res.status(404).json({ success: false, error: 'transaction not found' });
  const synced = tx.orderId ? (await syncAnchorTxFromOrder(tx.id))! : tx;
  const s = serializeSep24Transaction(synced as any, moreInfoUrl(tx.id));
  res.json({
    success: true,
    data: {
      id: s.id, kind: s.kind, status: s.status, amount_in: s.amount_in, amount_out: s.amount_out,
      amount_in_asset: s.amount_in_asset, amount_out_asset: s.amount_out_asset,
      started_at: s.started_at, completed_at: s.completed_at,
      account: `${tx.account.slice(0, 4)}…${tx.account.slice(-4)}`,
    },
  });
});
