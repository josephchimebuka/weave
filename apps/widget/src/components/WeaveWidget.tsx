import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AssetKey,
  parseAsset,
  assetLabel,
  assetMeta,
  isFiat,
  isCrypto,
  directionOf,
  institutionName,
  INSTITUTIONS_BY_CUR,
  SUPPORTED_FIAT,
  SUPPORTED_CRYPTO,
  type CryptoMeta
} from '@weave/shared';
import type { CSSProperties, ReactNode } from 'react';
import { QRCodeSVG as QRCodeSVGRaw } from 'qrcode.react';
import {
  WagmiProvider,
  useAccount, useConnect, useDisconnect, useSwitchChain,
  useWriteContract, useSendTransaction, useBalance, useReadContract,
} from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { formatEther, formatUnits, parseEther, parseUnits, isAddress } from 'viem';

const MINIMAL_ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;
import {
  wagmiConfig,
  SUPPORTED_CHAIN_IDS, CHAIN_ID_TO_API_NAME, CHAIN_ID_TO_DISPLAY, CHAIN_TINT,
  USDC_BY_CHAIN_ID, USDT_BY_CHAIN_ID,
} from '../lib/wagmi';
// `qrcode.react`'s peer pulls @types/react@19 into the pnpm store, which clashes
// with the widget's @types/react@18 (bigint in ReactNode). Cast to sidestep the
// JSX-element type mismatch without adding a workspace-wide overrides entry.
const QRCodeSVG = QRCodeSVGRaw as unknown as (props: { value: string; size?: number; level?: string; includeMargin?: boolean }) => ReactNode;
// Same @types/react@18 vs wagmi's @types/react@19 mismatch — cast to sidestep it.
const WagmiProviderC = WagmiProvider as unknown as (props: { config: typeof wagmiConfig; children: ReactNode }) => ReactNode;
const QueryClientProviderC = QueryClientProvider as unknown as (props: { client: QueryClient; children: ReactNode }) => ReactNode;
import {
  createOrder,
  fetchOrder,
  fetchSession,
  fetchQuote,
  cryptoKey,
  fiatKey,
  type InlineBankInstrument,
  type InlineWalletInstrument,
  type NextAction,
  fetchAssets,
  configureApiBase,
  postOrderEvents,
  type ClientOrderEvent,
} from '../api/client';

// ── Session-timeline emitter ───────────────────────────────────────────────
// Best-effort client telemetry (method chosen, popup open/close, retries) for
// the merchant's "Payment activity" view. Module-scoped like loadPaystackSdk:
// events queue immediately (even before the order exists) and flush once the
// orderId is known — batched, debounced, and completely non-blocking.
const _txnEventQueue: ClientOrderEvent[] = [];
const _txnCtx: { apiKey: string; orderId: string | null } = { apiKey: '', orderId: null };
let _txnFlushTimer: ReturnType<typeof setTimeout> | null = null;

function emitTxnEvent(type: string, metadata?: Record<string, unknown>) {
  _txnEventQueue.push({ type, metadata, occurredAt: new Date().toISOString() });
  if (_txnFlushTimer) return;
  _txnFlushTimer = setTimeout(flushTxnEvents, 1200);
}
function flushTxnEvents() {
  _txnFlushTimer = null;
  if (!_txnCtx.orderId || !_txnCtx.apiKey || _txnEventQueue.length === 0) return; // hold until order exists
  const batch = _txnEventQueue.splice(0, _txnEventQueue.length);
  void postOrderEvents(_txnCtx.apiKey, _txnCtx.orderId, batch);
}
/** Point the emitter at the current order; flushes anything queued before it existed. */
function configureTxnEmitter(apiKey: string, orderId: string | null) {
  _txnCtx.apiKey = apiKey;
  _txnCtx.orderId = orderId;
  if (orderId) flushTxnEvents();
}

// ── Design tokens ────────────────────────────────────────────────────────────

const ACCENT_MAP: Record<string, string> = {
  forest: '#3D6B50',
  tan: '#B8935A',
  ink: '#1C1B17',
};

const WEAVE = {
  ink: 'var(--weave-ink, #0B0F0E)',
  ink2: 'var(--weave-ink2, #3A4240)',
  mute: 'var(--weave-mute, #6B7572)',
  hair: 'var(--weave-hair, #E8EAE6)',
  surface: 'var(--weave-surface, #FFFFFF)',
  page: 'var(--weave-page, #F5F4EF)',
  panel: 'var(--weave-panel, #FAFAF7)',
  accent: 'var(--weave-accent, #0F5D4C)',
  accentSoft: 'var(--weave-accent-soft, #E6F0EC)',
  accentInk: 'var(--weave-accent-ink, #FFFFFF)',
  good: 'var(--weave-good, #1F7A4D)',
  goodSoft: 'var(--weave-good-soft, #E6F3EC)',
  warn: 'var(--weave-warn, #A46A00)',
  warnSoft: 'var(--weave-warn-soft, #FBF0DC)',
  err: 'var(--weave-err, #A8321E)',
} as const;

// ── Data ─────────────────────────────────────────────────────────────────────

interface Currency {
  name: string;
  symbol: string;
  flag: string;
  rate: number;
  min: number;
  country: string;
  psp: string;
  bank: string;
  method: string;
}


interface PaystackPopupDetails {
  accessCode: string;
  publicKey: string;
  amount: number;
  reference: string;
}

interface BachsCheckoutDetails {
  checkoutUrl: string;
  amount: number;
  reference: string;
}

interface AnchorTransferDetails {
  accountNumber: string;
  bankName: string;
  accountName?: string;
  amount: number;
  reference: string;
  expiresAt?: string;
}

const CURRENCIES: Record<string, Currency> = SUPPORTED_FIAT.reduce((acc, f) => {
  const code = f.key.split(':').pop()!;
  acc[code] = {
    name: f.name,
    symbol: f.symbol,
    flag: f.flag,
    rate: f.rate,
    min: f.min,
    country: f.country,
    psp: 'GTBank', // default for now
    bank: 'GTBank ••7890',
    method: 'Bank transfer'
  };
  return acc;
}, {} as any);

interface Balance {
  token: string;
  chain: string;
  amount: number;
  usd: number;
  icon: string;
  chainTint: string;
  logo?: string;
}

const BALANCES: Balance[] = [
  {
    token: 'ETH', chain: 'Optimism', amount: 0.312, usd: 1024.40,
    icon: 'Ξ', chainTint: '#ff3f57',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
  },
  {
    token: 'USDC', chain: 'Base', amount: 150.00, usd: 150.00,
    icon: '$', chainTint: '#1C4FE0',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
  },
  {
    token: 'STRK', chain: 'Starknet', amount: 840.0, usd: 184.80,
    icon: 'S', chainTint: '#EC796B',
    logo: 'https://assets.coingecko.com/coins/images/35293/standard/starknet.png'
  },
  {
    token: 'DAI', chain: 'Ethereum', amount: 502.00, usd: 502.00,
    icon: 'D', chainTint: '#F5AC37',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png'
  },
];

export interface Merchant {
  name: string;
  amount: number;
  currency: string;
  description?: string;
  amountIn?: 'source' | 'dest';
  sourceAssetKey?: string;
  destAssetKey?: string;
  destInstrument?: InlineBankInstrument | InlineWalletInstrument;
}

const fmtMoney = (n: number, cur: string, fractionDigits?: number) => {
  const c = CURRENCIES[cur];
  const isFiat = !!c;
  const defDp = isFiat ? 0 : 4;
  const dp = fractionDigits ?? (Number.isInteger(n) ? 0 : defDp);

  // For crypto/tokens, use higher precision to avoid overcharging due to rounding
  const factor = Math.pow(10, dp);
  const rounded = dp > 0 ? Math.ceil(n * factor) / factor : Math.ceil(n);

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(rounded);

  // No CURRENCIES entry (e.g. a crypto-denominated merchant) — don't crash on
  // c.symbol; show the amount with its currency/token code instead.
  if (!c) return `${formatted} ${cur}`;
  return `${c.symbol}${formatted}`;
};
const fmtCrypto = (n: number, precision: number = 4) => {
  const factor = Math.pow(10, precision);
  const rounded = Math.ceil(n * factor) / factor;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

// Decimal places to display per token. fmtCrypto rounds UP (so the payer never
// underpays), but a coarse 4dp ceil on high-unit-value tokens (BTC/ETH) tells
// the payer to send materially MORE than the locked quote. Give those tokens
// finer precision so the rounding overcharge is negligible; stables stay compact.
const TOKEN_DP: Record<string, number> = {
  BTC: 8, WBTC: 8, ETH: 6, WETH: 6, BNB: 5, SOL: 5, AVAX: 5,
  USDC: 2, USDT: 2, DAI: 2,
};
const tokenDp = (token?: string | null) => TOKEN_DP[(token ?? '').toUpperCase()] ?? 6;

// Idempotency reference for an order attempt. Prefer a real UUID; fall back to a
// random+time string only where crypto.randomUUID is unavailable.
const newOrderRef = () =>
  'weave_' + (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

// Stable, non-reversible fingerprint of a payer email, used to scope the resume
// cache key to a specific payer. Two payers on a shared device land on different
// keys, so one can never resume the other's pending order. FNV-1a is enough — we
// only need collision-resistance for cache partitioning, not cryptographic
// secrecy, and hashing (vs. the raw email) keeps PII out of localStorage keys.
// Returns null when there's no email → the caller treats "no identity" as
// "no auto-resume" rather than falling back to a shared per-merchant key.
function payerFingerprint(email?: string | null): string | null {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalized) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// EVM chains where we can verify an address shape with certainty. Non-EVM chains
// (XRP, TON, Stellar, Solana, BTC, …) pass through — we have no reliable
// validator and a false reject would block a legitimate payment.
const EVM_CHAINS = new Set(['BASE', 'ETHEREUM', 'ARBITRUM', 'OPTIMISM', 'POLYGON', 'BSC', 'AVALANCHE']);

// Defense-in-depth: never blindly trust an API-returned deposit address — the
// user pays into it irreversibly. Returns an error message if the address is
// missing, or malformed for the chain the user actually selected; null if it's
// acceptable (or a non-EVM chain we can't verify). Also flags a chain/token echo
// mismatch, which would mean the response doesn't describe what we asked for.
function depositAddressError(
  address: string | null | undefined,
  requestedChain: string | null | undefined,
  opts?: { resChain?: string | null; resToken?: string | null; requestedToken?: string | null },
): string | null {
  const addr = (address ?? '').trim();
  if (!addr) return 'No deposit address was returned. Please try again.';

  const chain = (requestedChain ?? '').toUpperCase();
  if (EVM_CHAINS.has(chain) && !isAddress(addr)) {
    return 'The deposit address looked invalid, so we stopped before you could send funds. Please try again.';
  }

  // If the backend echoes a chain/token, it must match what we requested.
  const rc = (opts?.resChain ?? '').toUpperCase();
  const rt = (opts?.resToken ?? '').toUpperCase();
  if (rc && chain && rc !== chain) {
    return 'The payment network did not match your selection, so we stopped. Please try again.';
  }
  if (rt && opts?.requestedToken && rt !== opts.requestedToken.toUpperCase()) {
    return 'The payment token did not match your selection, so we stopped. Please try again.';
  }
  return null;
}

// On a 409 (an order for this reference already exists — typically a concurrent
// duplicate submit), fetch the existing order so the caller can resume from it
// instead of dead-ending on an error. Returns the order, or null if it's not a
// recoverable 409 / the fetch fails.
async function fetchExistingOrderOn409(apiKey: string, e: any): Promise<any | null> {
  if (e?.status !== 409 || !e?.data?.orderId) return null;
  try { return await fetchOrder(apiKey, e.data.orderId); } catch { return null; }
}

// Copy helper that resolves true ONLY when the text actually reached the
// clipboard. navigator.clipboard is undefined in non-secure contexts, so the
// old `navigator.clipboard?.writeText(x); setCopied(true)` flashed "Copied" on
// a silent no-op for a high-stakes payment address. Falls back to execCommand.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// USD-pegged stablecoins render with a "$" prefix to match the hosted pay page.
const USD_STABLES = new Set(['USDC', 'USDT', 'DAI', 'USDBC', 'PYUSD', 'USDC.E']);

// The headline shows what the payer is actually quoted. When a link is priced in
// a source crypto (amountIn:'source'), display that token — NOT merchant.currency,
// which is only the merchant's settlement corridor used for the downstream dest leg.
const fmtHeadline = (merchant: Merchant, fmtCur: (n: number, cur: string) => string): string => {
  if (merchant.amountIn === 'source' && merchant.sourceAssetKey) {
    try {
      const a = parseAsset(merchant.sourceAssetKey);
      if (a.kind === 'crypto') {
        // USD-pegged stablecoins read like dollars ("$100"). Everything else
        // (SOL, STRK, ETH…) is NOT dollar-pegged, so show the token amount with
        // enough precision to preserve fractional values (e.g. "0.0042 SOL").
        if (USD_STABLES.has(a.token)) {
          return `$${fmtCrypto(merchant.amount, Number.isInteger(merchant.amount) ? 0 : 2)}`;
        }
        const amt = merchant.amount.toLocaleString('en-US', { maximumFractionDigits: 8 });
        return `${amt} ${a.token}`;
      }
    } catch { /* fall through to currency formatting */ }
  }
  return fmtCur(merchant.amount, merchant.currency);
};

const downloadReceipt = async (merchant: Merchant, order: any, settledTo: string, accentColor?: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const accent = ACCENT_MAP[accentColor as string] || accentColor || '#0F5D4C';
  const width = 800;
  const height = 1100;
  canvas.width = width;
  canvas.height = height;

  // 1. Background & Border
  ctx.fillStyle = '#FDFDFB';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#E8EAE6';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  // 2. Header Logo & Title
  ctx.fillStyle = accent;
  ctx.font = '700 32px Figtree, Inter, sans-serif';
  ctx.fillText('Weave', 80, 110);

  ctx.fillStyle = '#6B7572';
  ctx.font = '500 16px Inter, sans-serif';
  ctx.fillText('PAYMENT RECEIPT', width - 240, 105);

  // 3. Status Badge
  ctx.fillStyle = '#E6F0EC'; // weave-accent-soft (standard)
  const badgeWidth = 230;
  const badgeHeight = 36;
  ctx.beginPath();
  ctx.roundRect(80, 160, badgeWidth, badgeHeight, 8);
  ctx.fill();

  ctx.fillStyle = accent; // use brand accent color
  ctx.font = '700 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓ TRANSACTION SUCCESSFUL', 80 + badgeWidth / 2, 160 + 22);
  ctx.textAlign = 'left';

  // 4. Main Amount
  ctx.fillStyle = '#0B0F0E';
  ctx.font = '700 72px Figtree, Inter, sans-serif';
  const amountStr = fmtMoney(merchant.amount, merchant.currency);
  ctx.fillText(amountStr, 80, 280);

  ctx.fillStyle = '#6B7572';
  ctx.font = '500 18px Inter, sans-serif';
  ctx.fillText('Total amount paid to ' + merchant.name, 80, 315);

  // 5. Details Table
  const drawRow = (label: string, value: string, y: number) => {
    ctx.fillStyle = '#6B7572';
    ctx.font = '500 15px Inter, sans-serif';
    ctx.fillText(label, 80, y);

    ctx.fillStyle = '#0B0F0E';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(value, width - 80, y);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#E8EAE6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, y + 25);
    ctx.lineTo(width - 80, y + 25);
    ctx.stroke();
  };

  const dateStr = new Date(order?.createdAt || Date.now()).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  drawRow('Payment Date', dateStr, 420);
  drawRow('Transaction Ref', (order?.id || 'N/A').toUpperCase(), 490);
  drawRow('Merchant', merchant.name, 560);
  drawRow('Payout Destination', settledTo, 630);
  drawRow('Status', 'Completed', 700);

  // 6. Security & Footer
  ctx.fillStyle = '#F5F4EF';
  ctx.fillRect(80, 800, width - 160, 120);

  ctx.fillStyle = '#0B0F0E';
  ctx.font = '600 16px Inter, sans-serif';
  ctx.fillText('Security Verification', 110, 845);

  ctx.fillStyle = '#6B7572';
  ctx.font = '400 14px Inter, sans-serif';
  ctx.fillText('This transaction was secured with 256-bit encryption by Paycrest.', 110, 875);
  ctx.fillText('You can verify this order directly on the Weave Dashboard.', 110, 895);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0B0F0E';
  ctx.font = '700 24px Figtree, Inter, sans-serif';
  ctx.fillText('Thank you for using Weave.', width / 2, 1020);

  ctx.fillStyle = '#6B7572';
  ctx.font = '400 12px Inter, sans-serif';
  ctx.fillText('Support: help@weave.com', width / 2, 1050);

  // 7. Output
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `weave-receipt-${(order?.id || 'txn').slice(0, 8)}.png`;
  link.href = dataUrl;
  link.click();
};

// ── Primitives ───────────────────────────────────────────────────────────────

function Stack({ gap = 12, children, style }: { gap?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>{children}</div>;
}

function Row({
  gap = 10,
  align = 'center',
  justify = 'flex-start',
  children,
  style,
}: {
  gap?: number;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', alignItems: align, justifyContent: justify, gap, ...style }}>
      {children}
    </div>
  );
}

function Hair() {
  return <div style={{ height: 1, background: WEAVE.hair, width: '100%' }} />;
}

function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'accent' | 'warn' }) {
  const colors = {
    neutral: { bg: '#F1F0EB', fg: WEAVE.ink2 },
    good: { bg: WEAVE.goodSoft, fg: WEAVE.good },
    accent: { bg: WEAVE.accentSoft, fg: WEAVE.accent },
    warn: { bg: WEAVE.warnSoft, fg: WEAVE.warn },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 22, padding: '0 9px', borderRadius: 999,
      background: colors.bg, color: colors.fg,
      fontSize: 11.5, fontWeight: 500, letterSpacing: 0.1,
    }}>{children}</span>
  );
}

function IconDot({ bg, children, size = 32 }: { bg: string; children: ReactNode; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.42, flexShrink: 0,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    }}>{children}</div>
  );
}

function WeaveMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 5 L8 19 L12 9 L16 19 L21 5" stroke={WEAVE.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9 L12 19 L19 9" stroke={WEAVE.ink} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
    </svg>
  );
}

// ── Chrome ───────────────────────────────────────────────────────────────────

const closeBtn: CSSProperties = {
  width: 28, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
  background: 'transparent', color: WEAVE.mute,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const backBtn: CSSProperties = { ...closeBtn, color: WEAVE.ink };

function WidgetHeader({
  merchantName, onClose, showBack, onBack,
}: {
  merchantName: string;
  onClose: () => void;
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <div style={{
      padding: '16px 20px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${WEAVE.hair}`,
    }}>
      {showBack ? (
        <button onClick={onBack} style={backBtn} aria-label="Go back">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WeaveMark size={22} />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }}>Weave</span>
        </div>
      )}
      <div style={{ flex: 1, textAlign: 'center', fontSize: 12.5, color: WEAVE.mute }}>
        Paying <span style={{ color: WEAVE.ink, fontWeight: 500 }}>{merchantName}</span>
      </div>
      <button onClick={onClose} style={closeBtn} aria-label="Close checkout">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

function WidgetFooter() {
  return (
    <div style={{
      padding: '12px 20px 14px',
      borderTop: `1px solid ${WEAVE.hair}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 11, color: WEAVE.mute, background: WEAVE.panel,
      borderRadius: '0 0 16px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6V12C3 17 6.5 21 12 22C17.5 21 21 17 21 12V6L12 2Z" stroke="currentColor" strokeWidth="1.8" /></svg>
        Secured by Dewdrop Labs
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>xoxo ❤️</span>
      </div>
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────

const methodCard: CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: `1px solid ${WEAVE.hair}`, background: '#fff',
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', gap: 12,
  transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
};
const methodCardSm: CSSProperties = {
  padding: '10px 12px', borderRadius: 10,
  border: `1px solid ${WEAVE.hair}`, background: '#fff',
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', gap: 8,
  transition: 'border-color 0.15s, background 0.15s',
};
const primaryBtn: CSSProperties = {
  width: '100%', height: 46, borderRadius: 10, border: 'none',
  background: WEAVE.ink, color: '#fff', fontSize: 14.5, fontWeight: 500,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: -0.1,
  transition: 'transform 0.08s, background 0.2s',
};
const secondaryBtn: CSSProperties = {
  width: '100%', height: 46, borderRadius: 10, border: `1px solid ${WEAVE.hair}`,
  background: '#fff', color: WEAVE.ink, fontSize: 14, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 14,
  cursor: 'pointer', fontFamily: 'inherit',
};

// ── Screens ──────────────────────────────────────────────────────────────────

type PathPick = 'fiat' | 'crypto' | 'deposit' | 'externalDeposit';

function ScreenConnect({ onPick, merchant, currencies, fmtCur, submitting, disabledMethods }: {
  onPick: (p: PathPick) => void;
  merchant: Merchant;
  currencies: Record<string, Currency>;
  fmtCur: (n: number, cur: string) => string;
  submitting?: boolean;
  disabledMethods?: Record<string, string>;
}) {
  const c = currencies[merchant.currency] || CURRENCIES[merchant.currency];
  const [showMoreCrypto, setShowMoreCrypto] = useState(false);
  const [picked, setPicked] = useState<PathPick | null>(null);

  // Reset picked when the parent's submitting resolves — handles API failures where
  // the screen stays at 'connect' but picked was left set, permanently locking the button.
  useEffect(() => {
    if (!submitting) setPicked(null);
  }, [submitting]);

  const pick = (method: PathPick) => {
    if (submitting || picked) return;
    setPicked(method);
    emitTxnEvent('method.selected', { method });
    // Fire-and-forget: warm the Paystack inline SDK now, while the order-creation
    // round trip is in flight, so it's already loaded by the time (if) the route
    // resolves to a Paystack popup — instead of fetching+parsing it right when
    // the customer is staring at the popup screen waiting for it to appear.
    if (method === 'fiat') loadPaystackSdk().catch(() => {});
    onPick(method);
  };

  return (
    <Stack gap={16} style={{ padding: '22px 20px 6px' }}>
      <Stack gap={10} style={{ alignItems: 'center', padding: '4px 0 6px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: ACCENT_MAP[merchant.currency === 'USDC' ? 'ink' : 'forest'] || '#2B1810',
          color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 18, fontFamily: 'var(--weave-font-display, Georgia, serif)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
          {(() => {
            const parts = merchant.name.trim().split(/\s+/).filter(Boolean);
            return parts.length >= 2
              ? (parts[0][0] + parts[1][0]).toUpperCase()
              : parts[0]?.slice(0, 2).toUpperCase() ?? '?';
          })()}
        </div>
        <Stack gap={3} style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 12.5, color: WEAVE.mute }}>Pay {merchant.name}</div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: WEAVE.ink }}>
            {fmtHeadline(merchant, fmtCur)}
          </div>
          <div style={{ fontSize: 11.5, color: WEAVE.mute }}>{merchant.description || 'Secure checkout'}</div>
        </Stack>
      </Stack>

      <Stack gap={8}>
        <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          How would you like to pay?
        </div>

        <button
          onClick={() => !disabledMethods?.fiat && pick('fiat')}
          disabled={!!(submitting || picked || disabledMethods?.fiat)}
          title={disabledMethods?.fiat}
          style={{
            ...methodCard,
            opacity: (submitting || picked || disabledMethods?.fiat) ? 0.7 : 1,
            cursor: (submitting || picked) ? 'not-allowed' : (disabledMethods?.fiat ? 'help' : 'pointer'),
            filter: disabledMethods?.fiat ? 'grayscale(1)' : 'none'
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {picked === 'fiat' ? (
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${WEAVE.hair}`, borderTopColor: WEAVE.accent, animation: 'wspin 0.8s linear infinite' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 21H21M5 21V10M9 21V10M15 21V10M19 21V10M2 10L12 3L22 10H2Z" stroke={WEAVE.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </div>
          <Stack gap={2} style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: WEAVE.ink }}>
              {picked === 'fiat' ? 'Setting up payment…' : `Pay with ${c?.name ?? merchant.currency}`}
            </div>
            <div style={{ fontSize: 11.5, color: WEAVE.mute }}>{disabledMethods?.fiat || `Card, bank transfer & USSD · Instant`}</div>
          </Stack>
          {picked !== 'fiat' && !disabledMethods?.fiat && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>

        <button
          onClick={() => pick('externalDeposit')}
          disabled={!!(submitting || picked)}
          style={{ ...methodCard, opacity: (submitting || picked) ? 0.7 : 1, cursor: (submitting || picked) ? 'not-allowed' : 'pointer' }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {/* Neutral QR/scan glyph — this routes to a deposit-address flow for ANY
                wallet, not a MetaMask connect, so we don't show the fox here. */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.2" stroke={WEAVE.ink} strokeWidth="1.7" />
              <rect x="14" y="3" width="7" height="7" rx="1.2" stroke={WEAVE.ink} strokeWidth="1.7" />
              <rect x="3" y="14" width="7" height="7" rx="1.2" stroke={WEAVE.ink} strokeWidth="1.7" />
              <path d="M14 14h3.5v3.5M21 14v7h-7v-3.5" stroke={WEAVE.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <Stack gap={2} style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Pay with crypto</div>
            <div style={{ fontSize: 11.5, color: WEAVE.mute }}>Transfer from any chain, any token, any wallet.</div>
          </Stack>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        {!showMoreCrypto ? (
          <button onClick={() => !picked && setShowMoreCrypto(true)} style={{
            background: 'transparent', border: 'none', cursor: picked ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            fontSize: 12, color: WEAVE.mute, padding: '4px 0', textAlign: 'center', opacity: picked ? 0.5 : 1,
          }}>
            Connect your wallet ↓
          </button>
        ) : (
          <Stack gap={6} style={{ padding: '2px 0' }}>
            <button onClick={() => pick('deposit')} disabled={!!(submitting || picked)} style={{ ...methodCardSm, opacity: (submitting || picked) ? 0.7 : 1, cursor: (submitting || picked) ? 'not-allowed' : 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: WEAVE.panel, border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" stroke={WEAVE.ink} strokeWidth="2" /><rect x="14" y="3" width="7" height="7" stroke={WEAVE.ink} strokeWidth="2" /><rect x="3" y="14" width="7" height="7" stroke={WEAVE.ink} strokeWidth="2" /></svg>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>Pay from connected wallet</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto' }}><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

function ScreenBalances({
  onNext, merchant, balances, selected, setSelected, currencies,
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  balances: Balance[];
  selected: number | null;
  setSelected: (i: number) => void;
  currencies: Record<string, Currency>;
}) {
  return (
    <Stack gap={14} style={{ padding: '18px 20px 6px' }}>
      <Stack gap={4}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
          Choose what you'd like to pay with
        </div>
        <div style={{ fontSize: 12.5, color: WEAVE.mute }}>
          We found these balances in your wallet. Pick any — we'll convert to {currencies[merchant.currency]?.name ?? merchant.currency} for {merchant.name}.
        </div>
      </Stack>

      <Stack gap={6}>
        {balances.map((b, i) => {
          const c = currencies[merchant.currency] || CURRENCIES[merchant.currency];
          const enough = b.usd >= (merchant.amount / (c?.rate || 1));
          const isSelected = selected === i;
          return (
            <button key={i}
              onClick={() => enough && setSelected(i)}
              disabled={!enough}
              style={{
                width: '100%', padding: '12px 14px',
                background: isSelected ? WEAVE.accentSoft : '#fff',
                border: `1.5px solid ${isSelected ? WEAVE.accent : WEAVE.hair}`,
                borderRadius: 12, cursor: enough ? 'pointer' : 'not-allowed',
                opacity: enough ? 1 : 0.48,
                display: 'flex', alignItems: 'center', gap: 12,
                textAlign: 'left', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <IconDot bg={b.chainTint} size={36}>
                {b.logo ? (
                  <img src={b.logo} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                ) : b.icon}
              </IconDot>
              <Stack gap={2} style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: WEAVE.ink }}>
                  {fmtCrypto(b.amount)} {b.token}
                </div>
                <div style={{ fontSize: 12, color: WEAVE.mute }}>
                  on {b.chain} · ≈ ${b.usd.toFixed(2)}
                </div>
              </Stack>
              {!enough && <Pill tone="warn">Too low</Pill>}
              {enough && isSelected && (
                <div style={{ width: 20, height: 20, borderRadius: 10, background: WEAVE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </button>
          );
        })}
      </Stack>

      <button onClick={() => onNext('quote')} style={{ ...primaryBtn, opacity: selected === null ? 0.5 : 1 }} disabled={selected === null}>
        Continue
      </button>
    </Stack>
  );
}

export interface OfframpQuote {
  estimatedFiat: number;
  netUsdc: number;
  fiatCurrency: string;
  breakdown: {
    inputAmount: number;
    inputToken: string;
    fastPath: boolean;
    bridgeFeeUsd: number;
    senderFeeUsd: number;
    appFeeUsd: number;
    sellRate: number;
  };
}

function ScreenQuote({
  merchant, balance, onConfirm, submitting, error, quote, quoteLoading, currencies, fmtCur
}: {
  merchant: Merchant;
  balance: Balance;
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
  quote: OfframpQuote | null;
  quoteLoading: boolean;
  currencies: Record<string, Currency>;
  fmtCur: (n: number, cur: string) => string;
}) {
  if (quoteLoading && !quote) {
    return (
      <Stack style={{ padding: '60px 0', minHeight: 320, alignItems: 'center', justifyContent: 'center' }}>
        <WeavingLoader />
        <div style={{ marginTop: 16, fontSize: 13, color: WEAVE.mute }}>Calculating best route…</div>
      </Stack>
    );
  }

  const c = currencies[merchant.currency] || CURRENCIES[merchant.currency];
  const rate = c?.rate || 1;
  const fallbackNeeded = merchant.amount / rate;
  const needed = quote ? quote.breakdown.inputAmount : fallbackNeeded;

  // Calculate cryptoAmount safely
  const tokenPriceInUsd = balance.amount > 0 ? (balance.usd / balance.amount) : (balance.token === 'ETH' ? 3400 : 1);
  const cryptoAmount = needed / (tokenPriceInUsd || 1);

  const bridgeFee = quote ? quote.breakdown.bridgeFeeUsd : (balance.chain === 'Base' && balance.token === 'USDC' ? 0 : 1.80);
  const weaveFee = quote ? quote.breakdown.senderFeeUsd + quote.breakdown.appFeeUsd : needed * 0.0075;
  const totalFees = bridgeFee + weaveFee;
  const sellRate = quote ? quote.breakdown.sellRate : rate;
  const fiatOut = quote ? quote.estimatedFiat : merchant.amount;

  return (
    <Stack gap={14} style={{ padding: '16px 20px 6px' }}>
      <Stack gap={6}>
        <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>You pay</div>
        <Row align="baseline" gap={8}>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }}>
            {fmtCrypto(cryptoAmount, 5)}
          </div>
          <div style={{ fontSize: 16, color: WEAVE.ink2, fontWeight: 500 }}>{balance.token}</div>
        </Row>
        <Row gap={6} style={{ fontSize: 12, color: WEAVE.mute }}>
          <IconDot bg={balance.chainTint} size={14}>
            {balance.logo ? (
              <img src={balance.logo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : balance.icon}
          </IconDot>
          on {balance.chain}
        </Row>
      </Stack>

      <div style={{ padding: '2px 0', position: 'relative' }}>
        <Hair />
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff', padding: '0 10px',
          fontSize: 11, color: WEAVE.mute, letterSpacing: 0.4,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12L12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          converts to
        </div>
      </div>

      <Stack gap={6}>
        <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>{merchant.name} receives</div>
        <Row align="baseline" gap={8}>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: WEAVE.accent }}>
            {fmtCur(fiatOut, merchant.currency)}
          </div>
        </Row>
        <Row gap={6} style={{ fontSize: 12, color: WEAVE.mute }}>
          via {c?.method || 'Transfer'} · {c?.psp || 'Partner'}
        </Row>
      </Stack>

      <Stack gap={7} style={{ fontSize: 12.5 }}>
        <Row justify="space-between"><span style={{ color: WEAVE.mute }}>Rate</span><span>1 USDC = {fmtCur(sellRate, merchant.currency)}</span></Row>
        {bridgeFee > 0 && (
          <Row justify="space-between"><span style={{ color: WEAVE.mute }}>Network & bridge</span><span>${bridgeFee.toFixed(2)}</span></Row>
        )}
        <Row justify="space-between"><span style={{ color: WEAVE.mute }}>Weave fee</span><span>${weaveFee.toFixed(2)}</span></Row>
        <Hair />
        <Row justify="space-between" style={{ fontWeight: 500, color: WEAVE.ink }}>
          <span>Total fees</span><span>${totalFees.toFixed(2)}</span>
        </Row>
        {quoteLoading && (
          <div style={{ fontSize: 11, color: WEAVE.mute, textAlign: 'center' }}>Fetching live rate…</div>
        )}
      </Stack>

      <Stack gap={8}>
        {error && (
          <div style={{
            background: '#FBEEE9', border: `1px solid ${WEAVE.err}33`,
            borderRadius: 10, padding: '10px 12px', fontSize: 12, color: WEAVE.err, lineHeight: 1.5,
          }}>{error}</div>
        )}
        <button onClick={onConfirm} disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Creating order…' : 'Confirm in wallet'}
          {!submitting && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </button>
        <div style={{ fontSize: 11, color: WEAVE.mute, textAlign: 'center' }}>
          You'll sign one transaction in your wallet
        </div>
      </Stack>
    </Stack>
  );
}

function WeavingLoader() {
  return (
    <div style={{ position: 'relative', width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="28" cy="28" r="24" stroke={WEAVE.hair} strokeWidth="2.5" fill="none" />
        <circle cx="28" cy="28" r="24" stroke={WEAVE.accent} strokeWidth="2.5" fill="none"
          strokeDasharray="40 150" strokeLinecap="round"
          style={{ transformOrigin: 'center', animation: 'wspin 1.2s linear infinite' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <WeaveMark size={22} />
      </div>
    </div>
  );
}


// Loads the Paystack inline SDK exactly once per page. A cached promise plus an
// existing-tag check means concurrent or remounting callers never inject a
// duplicate <script>.
let _paystackPromise: Promise<void> | null = null;
function loadPaystackSdk(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).PaystackPop) return Promise.resolve();
  if (_paystackPromise) return _paystackPromise;
  _paystackPromise = new Promise<void>((resolve, reject) => {
    const SRC = 'https://js.paystack.co/v2/inline.js';
    const fail = () => { _paystackPromise = null; reject(new Error('paystack-load-failed')); };
    const existing = document.querySelector(`script[src="${SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).PaystackPop) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', fail);
      return;
    }
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return _paystackPromise;
}

function ScreenPaystackPopup({
  onNext,
  details,
}: {
  onNext: (s: string) => void;
  details: PaystackPopupDetails | null;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const launched = useRef(false);
  // Guard every async callback below — the SDK load + popup callbacks can fire
  // after the user navigates away, which would setState on an unmounted screen.
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const launch = () => {
    if (!details) { setError('Payment details unavailable. Please retry.'); setLoading(false); return; }
    const { accessCode } = details;
    setError(null);
    setLoading(true);
    loadPaystackSdk().then(() => {
      if (!mounted.current || launched.current) return;
      const Pop = (window as any).PaystackPop;
      if (!Pop) {
        setError('Paystack failed to load. Please check your connection and retry.');
        setLoading(false);
        return;
      }
      launched.current = true;
      setLoading(false);
      emitTxnEvent('auth_window.opened');
      const popup = new Pop();
      popup.resumeTransaction(accessCode, {
        onSuccess: () => { emitTxnEvent('auth_window.closed', { result: 'success' }); if (mounted.current) onNext('processing'); },
        onCancel: () => { emitTxnEvent('auth_window.closed', { result: 'cancel' }); launched.current = false; },
      });
    }).catch(() => {
      if (!mounted.current) return;
      setLoading(false);
      setError('Could not load Paystack. Check your network and try again.');
    });
  };

  useEffect(() => { launch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Stack gap={24} style={{ padding: '28px 20px' }}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `3px solid ${WEAVE.hair}`, borderTopColor: WEAVE.accent,
            animation: 'wspin 0.8s linear infinite', margin: '0 auto',
          }} />
          <div style={{ marginTop: 14, fontSize: 14, color: WEAVE.mute }}>Opening payment popup…</div>
        </div>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap={16} style={{ padding: '28px 20px' }}>
        <div style={{ textAlign: 'center', fontSize: 14, color: WEAVE.err, padding: '8px 0' }}>{error}</div>
        <button onClick={() => { launched.current = false; setError(null); setLoading(true); launch(); }} style={primaryBtn}>
          Retry
        </button>
      </Stack>
    );
  }

  return (
    <Stack gap={16} style={{ padding: '28px 20px' }}>
      <div style={{ textAlign: 'center', fontSize: 14, color: WEAVE.mute, padding: '12px 0' }}>
        A Paystack payment popup has opened. Complete payment there to continue.
      </div>
      <button
        onClick={() => { launched.current = false; launch(); }}
        style={{ ...primaryBtn, background: WEAVE.page, color: WEAVE.ink }}
      >
        Re-open popup
      </button>
    </Stack>
  );
}

// Loads the Bachs overlay SDK (bachs.js) exactly once per page. Same cached-promise
// + existing-tag guard as loadPaystackSdk so remounts never inject a duplicate.
let _bachsPromise: Promise<void> | null = null;
function loadBachsSdk(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).Bachs) return Promise.resolve();
  if (_bachsPromise) return _bachsPromise;
  _bachsPromise = new Promise<void>((resolve, reject) => {
    const SRC = 'https://checkout.bachs.io/bachs.js';
    const fail = () => { _bachsPromise = null; reject(new Error('bachs-load-failed')); };
    const existing = document.querySelector(`script[src="${SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).Bachs) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', fail);
      return;
    }
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return _bachsPromise;
}

// Bachs Connect overlay. Opens the hosted checkout in a modal via bachs.js. Same
// shape as ScreenPaystackPopup: the browser `checkout.completed` event only drives
// UI (→ 'processing'); the collection.succeeded webhook is the real source of truth.
function ScreenBachsCheckout({
  onNext,
  details,
  orderId,
  apiKey,
}: {
  onNext: (s: string) => void;
  details: BachsCheckoutDetails | null;
  orderId: string | null;
  apiKey: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const launched = useRef(false);
  const mounted = useRef(true);
  // Set true in the effect SETUP (not just the initial ref value) so a StrictMode
  // remount — which runs cleanup then setup again — restores mounted=true instead
  // of leaving it false and silently short-circuiting the async launch below.
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Poll the order status while the overlay is open. The Bachs SDK does NOT
  // reliably emit `checkout.completed` (observed: it fires only opened/loaded/
  // ready), so the browser event is not a dependable completion signal. Bachs'
  // own guidance is to treat SERVER state as the source of truth — so we poll
  // GET /orders/:id (which reflects the collection webhook in live, and the
  // getCheckout poll in sandbox) and advance when the order settles. This is
  // robust regardless of which client events do or don't fire.
  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const closeOverlay = () => { try { (window as any).Bachs?.Checkout?.close?.(); } catch { /* noop */ } };
    const tick = async () => {
      if (stopped) return;
      try {
        const order = await fetchOrder(apiKey, orderId);
        const status = String(order.status ?? '').toLowerCase();
        if (TERMINAL_OK.has(status)) { stopped = true; closeOverlay(); if (mounted.current) onNext('success'); return; }
        if (TERMINAL_BAD.has(status)) { stopped = true; closeOverlay(); if (mounted.current) onNext('error'); return; }
      } catch { /* transient — keep polling */ }
      timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 3000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [orderId, apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const launch = () => {
    if (!details?.checkoutUrl) { setError('Payment details unavailable. Please retry.'); setLoading(false); return; }
    setError(null);
    setLoading(true);
    loadBachsSdk().then(() => {
      if (!mounted.current || launched.current) return;
      const Bachs = (window as any).Bachs;
      if (!Bachs) {
        setError('Checkout failed to load. Please check your connection and retry.');
        setLoading(false);
        return;
      }
      launched.current = true;
      setLoading(false);
      emitTxnEvent('auth_window.opened');
      // The SDK validates checkoutUrl against its configured checkout origin
      // (default = live checkout.bachs.io) and rejects any other host. Sandbox
      // sessions live on sandbox-checkout.bachs.io, so derive baseUrl from the
      // checkout URL's own origin — works for both live and sandbox.
      let baseUrl: string | undefined;
      try { baseUrl = new URL(details.checkoutUrl).origin; } catch { baseUrl = undefined; }
      // Initialize once; the handler drives our UI only. Fulfilment is webhook-driven.
      Bachs.Initialize({
        ...(baseUrl ? { baseUrl } : {}),
        onEvent: (event: { type: string; data?: any }) => {
          if (event.type === 'checkout.completed') {
            emitTxnEvent('auth_window.closed', { result: 'success' });
            if (mounted.current) onNext('processing');
          } else if (event.type === 'checkout.failed') {
            emitTxnEvent('auth_window.closed', { result: 'fail' });
          } else if (event.type === 'checkout.closed') {
            // Payer dismissed the overlay without paying — let them re-open.
            launched.current = false;
          }
        },
      });
      Bachs.Checkout.open({ checkoutUrl: details.checkoutUrl });
    }).catch(() => {
      if (!mounted.current) return;
      setLoading(false);
      setError('Could not load checkout. Check your network and try again.');
    });
  };

  useEffect(() => { launch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Stack gap={24} style={{ padding: '28px 20px' }}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `3px solid ${WEAVE.hair}`, borderTopColor: WEAVE.accent,
            animation: 'wspin 0.8s linear infinite', margin: '0 auto',
          }} />
          <div style={{ marginTop: 14, fontSize: 14, color: WEAVE.mute }}>Opening secure checkout…</div>
        </div>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap={16} style={{ padding: '28px 20px' }}>
        <div style={{ textAlign: 'center', fontSize: 14, color: WEAVE.err, padding: '8px 0' }}>{error}</div>
        <button onClick={() => { launched.current = false; setError(null); setLoading(true); launch(); }} style={primaryBtn}>
          Retry
        </button>
      </Stack>
    );
  }

  return (
    <Stack gap={16} style={{ padding: '28px 20px' }}>
      <div style={{ textAlign: 'center', fontSize: 14, color: WEAVE.mute, padding: '12px 0' }}>
        A secure checkout has opened. Complete payment there to continue.
      </div>
      <button
        onClick={() => { launched.current = false; launch(); }}
        style={{ ...primaryBtn, background: WEAVE.page, color: WEAVE.ink }}
      >
        Re-open checkout
      </button>
    </Stack>
  );
}

const TERMINAL_OK = new Set(['completed']);
const TERMINAL_BAD = new Set(['failed', 'expired', 'refunded']);

// Anchor bank-transfer: show the payer a per-order NUBAN to transfer into. No SDK —
// the payer sends an ordinary bank transfer, Anchor fires payin.received, and we poll
// the order to advance. Mirrors ScreenVirtualAccount's copy-field + poll pattern.
function ScreenAnchorTransfer({
  onNext, details, apiKey, orderId, merchant, fmtCur,
}: {
  onNext: (s: string) => void;
  details: AnchorTransferDetails | null;
  apiKey: string;
  orderId: string | null;
  merchant: Merchant;
  fmtCur: (n: number, cur: string, dec?: number) => string;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // NGN already credited to this NUBAN while still awaiting the full amount. A bank
  // transfer settles whatever is sent, so a payer can underpay; the backend holds the
  // order open and we prompt them to top up the same account.
  const [collected, setCollected] = useState<number | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      try {
        const order = await fetchOrder(apiKey, orderId);
        const status = String(order.status ?? '').toLowerCase();
        if (typeof order.amountCollected === 'number') setCollected(order.amountCollected);
        if (status && status !== 'awaiting_deposit') {
          stopped = true;
          if (TERMINAL_OK.has(status)) onNext('success');
          else if (TERMINAL_BAD.has(status)) onNext('error');
          else onNext('processing');
          return;
        }
      } catch { /* transient — keep polling */ }
      timer = setTimeout(tick, 5000);
    };
    timer = setTimeout(tick, 5000);
    return () => { stopped = true; clearTimeout(timer); };
    // Exclude onNext: the pay page's per-second "Expires in…" countdown re-renders the
    // parent and would recreate onNext every second, tearing down + restarting this 5s
    // timer before it can ever fire (so the poll would never run). Same pattern as
    // ScreenBachsCheckout. onNext is stable enough for the terminal transition.
  }, [apiKey, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = (key: string, value: string) => {
    copyToClipboard(value).then(ok => {
      if (!ok) return;
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1400);
    });
  };

  const Field = ({ label, value, k, mono = true }: { label: string; value: string; k: string; mono?: boolean }) => (
    <Row justify="space-between" style={{ padding: '11px 14px' }}>
      <Stack gap={2} style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
        <div style={{
          fontSize: 14, fontWeight: 500, color: WEAVE.ink,
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
          letterSpacing: mono ? -0.2 : 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</div>
      </Stack>
      <button onClick={() => copy(k, value)} style={{
        height: 28, padding: '0 10px', borderRadius: 7,
        border: `1px solid ${WEAVE.hair}`,
        background: copiedKey === k ? WEAVE.accentSoft : '#fff',
        color: copiedKey === k ? WEAVE.accent : WEAVE.ink,
        fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      }}>{copiedKey === k ? 'Copied' : 'Copy'}</button>
    </Row>
  );

  if (!details) {
    return (
      <Stack gap={16} style={{ padding: '28px 20px' }}>
        <div style={{ textAlign: 'center', fontSize: 14, color: WEAVE.err, padding: '8px 0' }}>
          Payment details unavailable. Please retry.
        </div>
      </Stack>
    );
  }

  // Underpaid: a part-payment landed but it's short of the full amount. Show the payer how
  // much is left and prompt a top-up to the SAME account. Guard by ~₦1 so a sub-naira
  // rounding gap doesn't read as underpaid (that resolves to completed on the backend).
  const remaining = collected != null ? details.amount - collected : 0;
  const partial = collected != null && collected > 0 && remaining > 1
    ? { received: collected, remaining }
    : null;

  return (
    <Stack gap={16} style={{ padding: '24px 20px' }}>
      <Stack gap={4} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: WEAVE.ink }}>
          {partial ? 'Complete your payment' : 'Transfer to complete payment'}
        </div>
        <div style={{ fontSize: 13, color: WEAVE.mute }}>
          {partial ? (
            <>Send the remaining <strong>{fmtCur(partial.remaining, merchant.currency)}</strong> to the same account below.</>
          ) : (
            <>Send exactly <strong>{fmtCur(details.amount, merchant.currency)}</strong> to the account below from your banking app.</>
          )}
        </div>
      </Stack>

      {partial ? (
        <div style={{
          border: `1px solid ${WEAVE.hair}`, borderRadius: 12, padding: '12px 14px',
          background: WEAVE.accentSoft,
        }}>
          <Row justify="space-between" style={{ fontSize: 12.5, color: WEAVE.ink }}>
            <span style={{ color: WEAVE.mute }}>Received so far</span>
            <span style={{ fontWeight: 600 }}>{fmtCur(partial.received, merchant.currency)}</span>
          </Row>
          <Row justify="space-between" style={{ fontSize: 12.5, color: WEAVE.ink, marginTop: 6 }}>
            <span style={{ color: WEAVE.mute }}>Still needed</span>
            <span style={{ fontWeight: 600, color: WEAVE.accent }}>{fmtCur(partial.remaining, merchant.currency)}</span>
          </Row>
        </div>
      ) : null}

      <Stack gap={1} style={{ border: `1px solid ${WEAVE.hair}`, borderRadius: 12, overflow: 'hidden', background: WEAVE.page }}>
        <Field label="Bank" value={details.bankName} k="bank" mono={false} />
        <div style={{ height: 1, background: WEAVE.hair }} />
        <Field label="Account Number" value={details.accountNumber} k="acct" />
        {details.accountName ? (
          <>
            <div style={{ height: 1, background: WEAVE.hair }} />
            <Field label="Account Name" value={details.accountName} k="name" mono={false} />
          </>
        ) : null}
        <div style={{ height: 1, background: WEAVE.hair }} />
        <Field
          label={partial ? 'Amount to send' : 'Amount'}
          value={fmtCur(partial ? partial.remaining : details.amount, merchant.currency)}
          k="amt"
          mono={false}
        />
      </Stack>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 13, color: WEAVE.mute, padding: '4px 0',
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          border: `2px solid ${WEAVE.hair}`, borderTopColor: WEAVE.accent,
          animation: 'wspin 0.8s linear infinite',
        }} />
        Waiting for your transfer…
      </div>

      <div style={{ fontSize: 11.5, color: WEAVE.mute, textAlign: 'center', lineHeight: 1.5 }}>
        This account is unique to this order. Keep this window open — it updates automatically once your transfer arrives.
      </div>
    </Stack>
  );
}

function ScreenProcessing({
  onNext, merchant, mode, apiKey, orderId, bankDetails, fmtCur
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  mode: 'fiat' | 'crypto';
  apiKey: string;
  orderId: string | null;
  bankDetails?: BankDetails | null;
  currencies: Record<string, Currency>;
  fmtCur: (n: number, cur: string, dec?: number) => string;
}) {
  const [stage, setStage] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const pollTerminated = useRef(false);
  const c = CURRENCIES[merchant.currency];

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const fiatDisplay = bankDetails?.amountToTransfer
    ? (() => {
      const raw = bankDetails.amountToTransfer!;
      const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
      return fmtCur(Number(raw), merchant.currency, decimals);
    })()
    : fmtCur(merchant.amount, merchant.currency);

  const stages = mode === 'fiat' ? [
    { label: 'Confirming your transfer', sub: `Matching the ${fiatDisplay} from your bank`, dur: 1600 },
    { label: 'Completing payment', sub: `Sending to ${merchant.name}`, dur: 2400 },
  ] : [
    { label: 'Confirming transaction', sub: 'Processing your transaction on-chain', dur: 1400 },
    { label: 'Confirming your payment', sub: `Settling ${c?.name || merchant.currency} to ${merchant.name}`, dur: 2600 },
  ];

  // Simulated animation when no orderId (demo) — fall back to original behavior
  useEffect(() => {
    if (orderId) return;
    if (stage >= stages.length) { onNext('success'); return; }
    const t = setTimeout(() => setStage((s) => s + 1), stages[stage].dur);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, orderId]);

  // Real polling when orderId is present
  useEffect(() => {
    if (!orderId) return;
    pollTerminated.current = false;
    let timer: ReturnType<typeof setTimeout>;
    let failCount = 0;
    const POLL_BASE = 5000;
    const POLL_MAX  = 30000;

    const tick = async () => {
      if (pollTerminated.current) return;
      try {
        const order = await fetchOrder(apiKey, orderId);
        failCount = 0;
        const status = String(order.status ?? '').toLowerCase();
        const pcStatus = String(order.paycrestStatus ?? '').toLowerCase();
        if (TERMINAL_OK.has(status)) {
          pollTerminated.current = true;
          onNext('success');
          return;
        }
        if (TERMINAL_BAD.has(status)) {
          pollTerminated.current = true;
          onNext('error');
          return;
        }
        // Keep users on "detecting on-chain" until Paycrest reports `fulfilled`,
        // then advance to confirming fiat settlement.
        if (pcStatus === 'fulfilled') {
          setStage(1);
        }
      } catch {
        failCount++;
      }
      const delay = Math.min(POLL_BASE * Math.pow(2, failCount), POLL_MAX);
      timer = setTimeout(tick, delay);
    };
    tick();
    return () => {
      pollTerminated.current = true;
      clearTimeout(timer!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, apiKey]);

  const currentStage = stages[Math.min(stage, stages.length - 1)];
  // Bank-led settlement is 30s–2min; past ~2min, reassure rather than spin
  // silently forever. Polling continues — this is informational, not terminal.
  const takingLong = !!orderId && seconds >= 120;

  return (
    <Stack gap={20} style={{ padding: '28px 20px 12px', minHeight: 360 }}>
      <Stack gap={12} style={{ alignItems: 'center', paddingTop: 12 }}>
        <WeavingLoader />
        <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>
            {currentStage.label}
          </div>
          <div style={{ fontSize: 12.5, color: WEAVE.mute, textAlign: 'center' }}>
            {currentStage.sub}
          </div>
        </div>
      </Stack>

      <Stack gap={0} style={{ padding: '4px 8px' }}>
        {stages.map((s, i) => (
          <Row key={i} gap={12} style={{ padding: '10px 0' }}>
            <div style={{
              width: 22, height: 22, borderRadius: 11, flexShrink: 0,
              background: i < stage ? WEAVE.accent : '#fff',
              border: i < stage ? 'none' : `1.5px solid ${i === stage ? WEAVE.accent : WEAVE.hair}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {i < stage && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              {i === stage && (
                <div style={{ width: 8, height: 8, borderRadius: 4, background: WEAVE.accent, animation: 'wpulse 1.1s ease-in-out infinite' }} />
              )}
            </div>
            <Stack gap={1}>
              <div style={{ fontSize: 13, fontWeight: 500, color: i <= stage ? WEAVE.ink : WEAVE.mute }}>
                {s.label}
              </div>
              <div style={{ fontSize: 11.5, color: WEAVE.mute }}>
                {i < stage ? 'Completed' : i === stage ? s.sub : 'Pending'}
              </div>
            </Stack>
          </Row>
        ))}
      </Stack>

      {takingLong && (
        <div style={{
          background: WEAVE.warnSoft, border: `1px solid ${WEAVE.warn}22`,
          borderRadius: 10, padding: '10px 12px', fontSize: 11.5,
          color: WEAVE.warn, lineHeight: 1.5,
        }}>
          This is taking longer than usual, but your payment is still being confirmed —
          you don't need to pay again. It's safe to close this window; we'll email your
          receipt once it settles{orderId ? ` (ref: ${orderId})` : ''}.
        </div>
      )}

      <div style={{ fontSize: 11, color: WEAVE.mute, textAlign: 'center' }}>
        You can safely close this window. We'll email a receipt.
      </div>
    </Stack>
  );
}

function ScreenSuccess({
  onNext, merchant, balance, direction, apiKey, orderId, accentColor, currencies, fmtCur
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  balance: Balance;
  direction: 'offramp' | 'onramp';
  apiKey: string;
  orderId: string | null;
  accentColor?: string;
  currencies: Record<string, Currency>;
  fmtCur: (n: number, cur: string) => string;
}) {
  const [order, setOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    fetchOrder(apiKey, orderId)
      .then((o) => { if (!cancelled) setOrder(o); })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [apiKey, orderId]);

  // Resolve real asset meta from order if available
  const orderMeta = order?.sourceAssetKey ? assetMeta(order.sourceAssetKey) : undefined;
  const asset = orderMeta || balance;

  const sourceToken = (asset as any).token || (typeof order?.sourceAssetKey === 'string'
    ? order.sourceAssetKey.split(':').pop()
    : undefined);

  // Prefer order.sourceAmount (what was actually transacted) over merchant.amount,
  // which is a live prop that can drift if the merchant page mutates it mid-flow
  // or if we're resuming a stored order whose merchant context has since changed.
  const onrampPaidAmount = order ? Number(order.sourceAmount) : merchant.amount;
  const paidWith = direction === 'offramp' && order
    ? `${fmtCrypto(Number(order.sourceAmount), tokenDp(sourceToken ?? (asset as any).token))} ${sourceToken ?? (asset as any).token}`
    : `${fmtCur(onrampPaidAmount, merchant.currency)}`;

  const destBank = order?.destInstrument?.bankInstitution;
  const destIsCrypto = (order?.destAssetKey ?? merchant.destAssetKey ?? '').startsWith('crypto:');
  // Only show a bank when this is a genuine fiat payout AND we actually have the
  // destination bank. Crypto-settling merchants (or missing bank info) must NOT
  // fall back to the hardcoded placeholder bank — show the merchant instead.
  const settledTo = (direction === 'offramp' && !destIsCrypto && destBank)
    ? institutionName(merchant.currency, destBank)
    : merchant.name;

  const completedInSec = order?.createdAt && order?.updatedAt
    ? Math.max(1, Math.round((new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 1000))
    : null;
  const completedIn = completedInSec == null
    ? '—'
    : completedInSec < 60
      ? `${completedInSec}s`
      : `${Math.round(completedInSec / 60)}m`;

  const isResolving = !order;

  return (
    <Stack gap={18} style={{ padding: '28px 20px 12px', minHeight: 360 }}>
      <Stack gap={14} style={{ alignItems: 'center', paddingTop: 8 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: WEAVE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'wpop 0.5s cubic-bezier(0.2, 1.2, 0.4, 1)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <Stack gap={4} style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
            Payment complete
          </div>
          <div style={{
            fontSize: 13, color: WEAVE.mute, textAlign: 'center', lineHeight: 1.5, maxWidth: 280,
            animation: isResolving ? 'wpulse 1.5s ease-in-out infinite' : undefined
          }}>
            {direction === 'offramp' ? (
              <>{fmtCur(merchant.amount, merchant.currency)} is on its way to <span style={{ color: WEAVE.ink }}>{merchant.name}</span>.</>
            ) : (
              <>Your payment of {fmtCur(onrampPaidAmount, merchant.currency)} has been sent to <span style={{ color: WEAVE.ink }}>{merchant.name}</span>.</>
            )}
          </div>
        </Stack>
      </Stack>

      <Stack gap={0} style={{ background: WEAVE.panel, border: `1px solid ${WEAVE.hair}`, borderRadius: 12, overflow: 'hidden' }}>
        <Row justify="space-between" style={{ padding: '12px 14px', fontSize: 12.5 }}>
          <span style={{ color: WEAVE.mute }}>Paid with</span>
          {direction === 'offramp' ? (
            <Row gap={6} style={{ animation: isResolving ? 'wpulse 1.5s ease-in-out infinite' : undefined }}>
              <IconDot bg={(asset as any).chainTint || (asset as any).tint} size={16}>
                {(asset as any).logo ? (
                  <img src={(asset as any).logo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (asset as any).icon ? (
                  (asset as any).icon
                ) : (asset as any).flag ? (
                  (asset as any).flag
                ) : (asset as any).symbol}
              </IconDot>
              <span style={{ fontWeight: 500 }}>{paidWith}</span>
            </Row>
          ) : (
            <Row gap={6}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: '#fff', border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{currencies[merchant.currency]?.flag || '🇳🇬'}</div>
              <span style={{ fontWeight: 500 }}>{fmtCur(onrampPaidAmount, merchant.currency)}</span>
            </Row>
          )}
        </Row>
        <Hair />
        <Row justify="space-between" style={{ padding: '12px 14px', fontSize: 12.5 }}>
          <span style={{ color: WEAVE.mute }}>{direction === 'offramp' ? 'Settled to' : 'Paid to'}</span>
          <span style={{
            fontWeight: 500,
            animation: isResolving ? 'wpulse 1.5s ease-in-out infinite' : undefined
          }}>{settledTo}</span>
        </Row>
        <Hair />
        <Row justify="space-between" style={{ padding: '12px 14px', fontSize: 12.5 }}>
          <span style={{ color: WEAVE.mute }}>Completed in</span>
          <Row gap={6}>
            <span style={{ animation: isResolving ? 'wpulse 1.5s ease-in-out infinite' : undefined }}>
              <Pill tone="good">{completedIn}</Pill>
            </span>
          </Row>
        </Row>
      </Stack>

      <Stack gap={8}>
        <button onClick={() => onNext('connect')} style={primaryBtn}>
          Done
        </button>
        <button
          onClick={() => downloadReceipt(merchant, order, settledTo, accentColor)}
          style={{ ...secondaryBtn, justifyContent: 'center', paddingLeft: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3V15M12 15L7 10M12 15L17 10M3 19H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Download receipt
        </button>
      </Stack>
    </Stack>
  );
}

function ScreenError({ onNext, onBack, message }: { onNext: (s: string) => void; onBack: (s: string) => void; message?: string | null }) {
  return (
    <Stack gap={16} style={{ padding: '28px 20px 12px', minHeight: 360 }}>
      <Stack gap={14} style={{ alignItems: 'center', paddingTop: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: '#FBEEE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 8V13M12 17V17.01" stroke={WEAVE.err} strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="12" r="10" stroke={WEAVE.err} strokeWidth="2" /></svg>
        </div>
        <Stack gap={4} style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Transaction didn't go through</div>
          <div style={{ fontSize: 13, color: WEAVE.mute, textAlign: 'center', maxWidth: 280 }}>
            {message || 'Something went wrong while processing your payment. No funds were moved.'}
          </div>
        </Stack>
      </Stack>
      <Stack gap={8}>
        <button onClick={() => onBack('quote')} style={primaryBtn}>Try again</button>
        <button onClick={() => onNext('connect')} style={secondaryBtn}>Use a different payment method</button>
      </Stack>
    </Stack>
  );
}

// ── Deposit ──────────────────────────────────────────────────────────────────

// Chain ids match the backend's canonical uppercase names (NearIntentsService.CHAIN_TO_NEAR keys)
// so they flow straight through to NEAR Intents without a secondary mapping. Both native and
// stablecoin entries are listed per chain where NEAR Intents has liquidity on each.
// ── Reference Data (Fallbacks) ────────────────────────────────────────────────
// These act as the boot-time defaults before the API syncs the latest truth.
export const DEPOSIT_CHAINS = SUPPORTED_CRYPTO;

// Chains where the deposit destination tag/memo is part of the address — dropping
// it sends the funds into the provider's pooled account and they become unrecoverable.
const MEMO_REQUIRED_CHAINS = new Set(['XRP', 'TON', 'STELLAR', 'NEAR']);

// Placeholder shown for the sender-wallet input per chain. Address shapes differ
// enough that a single hint misleads users; these are the most common formats.
const REFUND_ADDRESS_PLACEHOLDER: Record<string, string> = {
  BASE: '0x…',
  ETHEREUM: '0x…',
  ARBITRUM: '0x…',
  OPTIMISM: '0x…',
  POLYGON: '0x…',
  BSC: '0x…',
  AVALANCHE: '0x…',
  GNOSIS: '0x…',
  SCROLL: '0x…',
  XLAYER: '0x…',
  MONAD: '0x…',
  BERA: '0x…',
  SOLANA: 'e.g. 5Gh8…base58',
  TRON: 'T…',
  NEAR: 'alice.near or 64-hex',
  TON: 'UQ… / EQ…',
  SUI: '0x… (64 chars)',
  APTOS: '0x… (64 chars)',
  STARKNET: '0x…',
  BITCOIN: 'bc1… or 1…',
  XRP: 'r…',
  STELLAR: 'G…',
  CARDANO: 'addr1…',
  DOGE: 'D…',
  LITECOIN: 'ltc1… or L…',
  BCH: 'bitcoincash:q… or q…',
  ZEC: 't1… or zs1…',
  DASH: 'X…',
};

// EIP-681 deep-link params for ERC-20 `transfer` on EVM chains. Only populated for
// combinations we can build a strict URI for — unknown combos fall back to plain address.
const ERC20_META: Record<string, { chainId: number; contract: string; decimals: number }> = {
  'BASE:USDC': { chainId: 8453, contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  'OPTIMISM:USDC': { chainId: 10, contract: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
  'ARBITRUM:USDC': { chainId: 42161, contract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  'POLYGON:USDC': { chainId: 137, contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
};

const buildDepositQRPayload = (
  address: string,
  amount: number | null,
  chain: string | null,
  token: string | null,
): string => {
  if (!address) return '';
  if (!amount || !chain || !token) return address;
  const meta = ERC20_META[`${chain.toUpperCase()}:${token.toUpperCase()}`];
  if (!meta) return address;
  const roundedAmount = Math.ceil(amount * 100) / 100;
  const rawUnits = BigInt(Math.round(roundedAmount * 10 ** meta.decimals));
  return `ethereum:${meta.contract}@${meta.chainId}/transfer?address=${address}&uint256=${rawUnits.toString()}`;
};

function ScreenDeposit({
  onNext, merchant, depositAddress, depositMemo, amountToSend, sourceToken, sourceChain, loading, error, onChainChange, apiKey, orderId, preSelectedChainKey,
  depositChains, currencies,
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  depositAddress: string | null;
  depositMemo: string | null;
  amountToSend: number | null;
  sourceToken: string | null;
  sourceChain: string | null;
  loading: boolean;
  error: string | null;
  ready: boolean;
  onChainChange: (apiChain: string, token: string, refundAddress: string) => void;
  apiKey: string;
  orderId: string | null;
  preSelectedChainKey?: string | null;
  depositChains: CryptoMeta[];
  currencies: Record<string, Currency>;
  fmtCur: (n: number, cur: string) => string;
}) {
  // chainIdx stays null until the user picks a network — we don't want to
  // spin up a NEAR Intents quote / Paycrest order on mount with an arbitrary default.
  const [nearStatus, setNearStatus] = useState<string>('');
  const [chainIdx, setChainIdx] = useState<number | null>(null);
  // True once the user manually picks a network, after which we never let the
  // pre-select resolver below override their choice.
  const userPickedChain = useRef(false);

  const [chainPickerOpen, setChainPickerOpen] = useState(false);
  const [chainSearch, setChainSearch] = useState('');
  const [refundAddress, setRefundAddress] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);
  const filteredChains = chainSearch.trim()
    ? depositChains.map((c, i) => ({ c, i }))
      .filter(({ c }) => {
        const q = chainSearch.trim().toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.token.toLowerCase().includes(q) ||
          c.network.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      })
    : depositChains.map((c, i) => ({ c, i }));
  const chain = chainIdx != null ? depositChains[chainIdx] : null;
  const address = depositAddress ?? '';
  const memo = depositMemo ?? '';
  const displayToken = sourceToken ?? chain?.token ?? '';
  const fallbackUsdc = merchant.amount / (currencies[merchant.currency]?.rate || CURRENCIES[merchant.currency]?.rate || 1);
  const displayAmount = amountToSend ?? fallbackUsdc;
  const qrPayload = buildDepositQRPayload(address, amountToSend, sourceChain, sourceToken);
  const lastFired = useRef<string | null>(null);
  const memoRequired = chain ? MEMO_REQUIRED_CHAINS.has(chain.id) : false;

  const submitRefundAndGenerate = () => {
    if (!chain || !refundAddress.trim()) return;
    const key = `${chain.id}:${chain.token}:${refundAddress.trim()}`;
    if (lastFired.current === key) return;
    lastFired.current = key;
    setOrderSubmitted(true);
    onChainChange(chain.id, chain.token, refundAddress.trim());
  };

  // Resolve the pre-selected network by KEY against the LIVE chain list, not a
  // cached index. depositChains can change from the fallback to the API-synced
  // list after mount, so an index captured earlier could point at the wrong
  // network. We re-resolve whenever the list or key changes, until the user
  // makes their own pick.
  useEffect(() => {
    if (userPickedChain.current || !preSelectedChainKey) return;
    const idx = depositChains.findIndex(c => `${c.id}:${c.token}` === preSelectedChainKey);
    setChainIdx(idx === -1 ? null : idx);
  }, [preSelectedChainKey, depositChains]);

  // When the user changes the selected chain we invalidate the previous submission
  // so they can enter a chain-appropriate refund address.
  useEffect(() => {
    setOrderSubmitted(false);
    setRefundAddress('');
    lastFired.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainIdx]);

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      try {
        const order = await fetchOrder(apiKey, orderId);
        const status = String(order.status ?? '').toLowerCase();
        const nearStatus = String(order.nearStatus ?? '').toLowerCase();
        setNearStatus(nearStatus);
        const hasNearStep = Array.isArray(order.steps) && order.steps.some((s: any) => s?.provider === 'nearintents');
        const nearProcessing = hasNearStep && nearStatus === 'processing';
        if ((status && status !== 'awaiting_deposit') || nearProcessing) {
          stopped = true;
          if (status === 'completed') onNext('success');
          else if (['failed', 'refunded'].includes(status)) onNext('error');
          else onNext('processing');
          return;
        }
      } catch { }
      timer = setTimeout(tick, 5000);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer!); };
  }, [apiKey, orderId, onNext]);


  const copy = () => {
    if (!address) return;
    copyToClipboard(address).then(ok => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const copyMemo = () => {
    if (!memo) return;
    copyToClipboard(memo).then(ok => {
      if (!ok) return;
      setMemoCopied(true);
      setTimeout(() => setMemoCopied(false), 1500);
    });
  };

  // When the picker is open, the whole body swaps to a dedicated selection
  // sub-screen with its own search. This avoids the dropdown getting clipped
  // by the widget's outer `overflow: hidden` and fits naturally within the 400px frame.
  if (chainPickerOpen) {
    return (
      <Stack gap={12} style={{ padding: '16px 20px 6px' }}>
        <Stack gap={8}>
          <button
            onClick={() => { setChainPickerOpen(false); setChainSearch(''); }}
            style={{
              alignSelf: 'flex-start',
              padding: '4px 0', background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 12, color: WEAVE.mute, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
            Select a network
          </div>
          <div style={{ fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5 }}>
            We'll generate a deposit address for the network you choose.
          </div>
        </Stack>

        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}>
            <circle cx="11" cy="11" r="7" stroke={WEAVE.mute} strokeWidth="2" />
            <path d="M20 20L16 16" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            placeholder="Search networks or tokens…"
            value={chainSearch}
            onChange={(e) => setChainSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px 10px 34px', borderRadius: 10,
              border: `1px solid ${WEAVE.hair}`, background: '#fff',
              fontSize: 13, fontFamily: 'inherit', color: WEAVE.ink, outline: 'none',
            }}
          />
        </div>

        <div style={{
          maxHeight: 360, overflowY: 'auto',
          border: `1px solid ${WEAVE.hair}`, borderRadius: 10,
          background: '#fff', padding: 4,
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {filteredChains.length === 0 ? (
            <div style={{ padding: '24px 10px', fontSize: 12, color: WEAVE.mute, textAlign: 'center' }}>
              No matches for "{chainSearch.trim()}"
            </div>
          ) : (
            filteredChains.map(({ c, i }) => (
              <button key={`${c.id}:${c.token}`} onClick={() => { userPickedChain.current = true; setChainIdx(i); setChainPickerOpen(false); setChainSearch(''); }} style={{
                width: '100%', padding: '10px 10px', borderRadius: 7,
                background: i === chainIdx ? WEAVE.accentSoft : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              }}>
                <IconDot bg={c.tint} size={24}>
                  {(c as any).logo ? (
                    <img src={(c as any).logo} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                  ) : c.icon}
                </IconDot>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.token} on {c.name}</div>
                  <div style={{ fontSize: 10.5, color: WEAVE.mute }}>{c.network}</div>
                </div>
                {i === chainIdx && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke={WEAVE.accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </button>
            ))
          )}
        </div>
      </Stack>
    );
  }

  return (
    <Stack gap={14} style={{ padding: '16px 20px 6px' }}>
      <Stack gap={4}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
          Send from any wallet
        </div>
        <div style={{ fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5 }}>
          Scan the QR or copy the address. Send from a mobile wallet, exchange, or hardware device — we'll detect the deposit automatically.
        </div>
      </Stack>

      <Stack gap={6}>
        <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>Network</div>
        <button onClick={() => setChainPickerOpen(true)} style={{
          padding: '10px 12px', borderRadius: 10, border: `1px solid ${WEAVE.hair}`,
          background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        }}>
          {chain ? (
            <>
              <IconDot bg={chain.tint} size={26}>
                {chain.logo ? (
                  <img src={chain.logo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : chain.icon}
              </IconDot>
              <Stack gap={1} style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{chain.token} on {chain.name}</div>
                <div style={{ fontSize: 11, color: WEAVE.mute }}>{chain.network}</div>
              </Stack>
              <div style={{ fontSize: 11, color: WEAVE.mute }}>Change</div>
            </>
          ) : (
            <>
              <div style={{
                width: 26, height: 26, borderRadius: 13,
                border: `1px dashed ${WEAVE.hair}`, background: WEAVE.panel,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: WEAVE.mute, fontSize: 13,
              }}>?</div>
              <Stack gap={1} style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: WEAVE.ink }}>Choose a network</div>
                <div style={{ fontSize: 11, color: WEAVE.mute }}>30+ chains supported · powered by NEAR Intents</div>
              </Stack>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </>
          )}
        </button>
      </Stack>

      {!chain ? (
        <div style={{
          background: WEAVE.panel, border: `1px dashed ${WEAVE.hair}`,
          borderRadius: 12, padding: '28px 16px', textAlign: 'center',
          fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5,
        }}>
          Pick a network above to generate your deposit address.
        </div>
      ) : !orderSubmitted ? (
        <Stack gap={10}>
          <Stack gap={6}>
            <label style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Your refund wallet on {chain.name}
            </label>
            <input
              autoFocus
              placeholder={REFUND_ADDRESS_PLACEHOLDER[chain.id] ?? 'Paste your wallet address'}
              value={refundAddress}
              onChange={(e) => setRefundAddress(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitRefundAndGenerate(); }}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', borderRadius: 10,
                border: `1px solid ${WEAVE.hair}`, background: '#fff',
                fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                color: WEAVE.ink, outline: 'none', letterSpacing: -0.2,
              }}
            />
            <div style={{ fontSize: 11, color: WEAVE.mute, lineHeight: 1.5 }}>
              If the swap fails or you send the wrong amount, funds are returned to this address. Must be a valid address on <b>{chain.name}</b>.
            </div>
          </Stack>
          <button
            onClick={submitRefundAndGenerate}
            disabled={!refundAddress.trim()}
            style={{
              ...primaryBtn,
              opacity: refundAddress.trim() ? 1 : 0.5,
              cursor: refundAddress.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Generate deposit address
          </button>
        </Stack>
      ) : (
        <>
          <div style={{
            background: WEAVE.panel, border: `1px solid ${WEAVE.hair}`,
            borderRadius: 12, padding: '16px', display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <div style={{ padding: 8, background: '#fff', borderRadius: 10, border: `1px solid ${WEAVE.hair}`, flexShrink: 0 }}>
              {qrPayload ? (
                <QRCodeSVG value={qrPayload} size={120} level="M" includeMargin={false} />
              ) : (
                <div style={{
                  width: 120, height: 120, borderRadius: 12,
                  background: WEAVE.panel, border: `1px dashed ${WEAVE.hair}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <div className="weaving-spinner" />
                  <div style={{ fontSize: 10, color: WEAVE.mute, letterSpacing: 0.8, fontWeight: 500, textTransform: 'uppercase' }}>Generating Address</div>
                </div>
              )}
            </div>
            <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
              <Stack gap={2}>
                <div style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>Amount</div>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
                  {loading ? (
                    <span style={{ color: WEAVE.mute, fontWeight: 400 }}>Calculating…</span>
                  ) : (
                    <>{fmtCrypto(displayAmount, tokenDp(displayToken))} {displayToken}</>
                  )}
                </div>
                <div style={{ fontSize: 11, color: WEAVE.mute }}>
                  on {chain.name}
                </div>
              </Stack>
            </Stack>
          </div>

          <Stack gap={6}>
            <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>Deposit address</div>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: `1px solid ${WEAVE.hair}`, borderRadius: 10,
              background: '#fff', overflow: 'hidden',
            }}>
              <div style={{
                flex: 1, padding: '10px 12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 12.5, color: address ? WEAVE.ink : WEAVE.mute, letterSpacing: -0.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {loading ? 'Generating address…' : address || '—'}
              </div>
              <button onClick={copy} disabled={!address} style={{
                height: 40, padding: '0 14px', border: 'none',
                borderLeft: `1px solid ${WEAVE.hair}`,
                background: copied ? WEAVE.accentSoft : '#fff',
                color: copied ? WEAVE.accent : (address ? WEAVE.ink : WEAVE.mute),
                fontSize: 12, fontWeight: 500, cursor: address ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 8V5C16 4.45 15.55 4 15 4H5C4.45 4 4 4.45 4 5V15C4 15.55 4.45 16 5 16H8" stroke="currentColor" strokeWidth="2" /></svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            {error && (
              <Stack gap={6}>
                <div style={{ fontSize: 11.5, color: WEAVE.err }}>{error}</div>
                <button
                  onClick={() => { setOrderSubmitted(false); lastFired.current = null; }}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 10px', borderRadius: 7,
                    background: 'transparent', border: `1px solid ${WEAVE.hair}`,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, color: WEAVE.ink,
                  }}
                >
                  Edit refund address
                </button>
              </Stack>
            )}
          </Stack>

          {(memo || memoRequired) && (
            <Stack gap={6}>
              <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {chain.id === 'XRP' ? 'Destination tag' : 'Memo'}
                <span style={{ fontSize: 10, color: WEAVE.warn, fontWeight: 600, letterSpacing: 0.4 }}>REQUIRED</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `1px solid ${WEAVE.hair}`, borderRadius: 10,
                background: '#fff', overflow: 'hidden',
              }}>
                <div style={{
                  flex: 1, padding: '10px 12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 12.5, color: memo ? WEAVE.ink : WEAVE.mute, letterSpacing: -0.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {loading ? 'Generating memo…' : memo || '—'}
                </div>
                <button onClick={copyMemo} disabled={!memo} style={{
                  height: 40, padding: '0 14px', border: 'none',
                  borderLeft: `1px solid ${WEAVE.hair}`,
                  background: memoCopied ? WEAVE.accentSoft : '#fff',
                  color: memoCopied ? WEAVE.accent : (memo ? WEAVE.ink : WEAVE.mute),
                  fontSize: 12, fontWeight: 500, cursor: memo ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {memoCopied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 8V5C16 4.45 15.55 4 15 4H5C4.45 4 4 4.45 4 5V15C4 15.55 4.45 16 5 16H8" stroke="currentColor" strokeWidth="2" /></svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div style={{ fontSize: 11, color: WEAVE.warn, lineHeight: 1.5 }}>
                You must include this {chain.id === 'XRP' ? 'destination tag' : 'memo'} when you send — without it the funds can't be credited and may be lost.
              </div>
            </Stack>
          )}

          <div style={{
            background: WEAVE.warnSoft, border: `1px solid ${WEAVE.warn}22`,
            borderRadius: 10, padding: '10px 12px',
            display: 'flex', gap: 10, fontSize: 11.5, color: WEAVE.warn, lineHeight: 1.5,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2L2 20H22L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 10V13M12 16V16.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <span>Only send <b>{chain.token}</b> on the <b>{chain.name}</b> network. Sending other assets or from a different network may result in loss.</span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', background: nearStatus === 'incomplete_deposit' ? '#FFF5F5' : '#fff',
            border: `1px solid ${nearStatus === 'incomplete_deposit' ? '#FFD1D1' : WEAVE.hair}`,
            borderRadius: 10,
          }}>
            {nearStatus === 'incomplete_deposit' ? (
              <div style={{ flex: 1, fontSize: 12, color: '#D94E4E', fontWeight: 500, lineHeight: 1.4 }}>
                Partial payment received. Still waiting for the remaining balance to complete your order.
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', width: 10, height: 10 }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: WEAVE.accent }} />
                  <div style={{ position: 'absolute', inset: -3, borderRadius: 8, background: WEAVE.accent, opacity: 0.25, animation: 'wpulse 1.6s ease-in-out infinite' }} />
                </div>
                <div style={{ flex: 1, fontSize: 12, color: WEAVE.ink2 }}>
                  Watching for deposit on {chain.name}…
                </div>
              </>
            )}
          </div>
        </>
      )}
    </Stack>
  );
}

// ── Refund account ───────────────────────────────────────────────────────────

interface RefundAccount {
  institution: string;
  accountIdentifier: string;
  accountName: string;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: `1px solid ${WEAVE.hair}`, background: '#fff',
  fontSize: 14, fontWeight: 500, color: WEAVE.ink,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};

function ScreenRefundAccount({
  merchant, value, onChange, onSubmit, submitting, error,
}: {
  merchant: Merchant;
  value: RefundAccount;
  onChange: (next: RefundAccount) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const banks = INSTITUTIONS_BY_CUR[merchant.currency] ?? [];
  const valid =
    value.institution.length > 0 &&
    value.accountIdentifier.trim().length >= 8 &&
    value.accountName.trim().length >= 2;

  return (
    <Stack gap={14} style={{ padding: '16px 20px 6px' }}>
      <Stack gap={4}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
          Where should refunds go?
        </div>
        <div style={{ fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5 }}>
          If your payment can't be matched, we'll return the funds to this account. Must be in your name.
        </div>
      </Stack>

      <Stack gap={10}>
        <Stack gap={6}>
          <label style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>Bank</label>
          <select
            value={value.institution}
            onChange={(e) => onChange({ ...value, institution: e.target.value })}
            style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'><path d='M6 9L12 15L18 9' stroke='%236B7572' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36 }}
          >
            <option value="" disabled>Select your bank…</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </Stack>

        <Stack gap={6}>
          <label style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>Account number</label>
          <input
            inputMode="numeric"
            placeholder="0123456789"
            value={value.accountIdentifier}
            onChange={(e) => onChange({ ...value, accountIdentifier: e.target.value.replace(/\D/g, '') })}
            style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: -0.2 }}
          />
        </Stack>

        <Stack gap={6}>
          <label style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>Account name</label>
          <input
            placeholder="Full name as it appears on your account"
            value={value.accountName}
            onChange={(e) => onChange({ ...value, accountName: e.target.value })}
            style={inputStyle}
          />
        </Stack>
      </Stack>

      <div style={{
        background: WEAVE.panel, border: `1px solid ${WEAVE.hair}`,
        borderRadius: 10, padding: '10px 12px',
        display: 'flex', gap: 10, fontSize: 11.5, color: WEAVE.ink2, lineHeight: 1.5,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1, color: WEAVE.mute }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8V13M12 16V16.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <span>We only use this account if the payment fails. Refunds arrive within 1 business day.</span>
      </div>

      {error && (
        <div style={{
          background: '#FBEEE9', border: `1px solid ${WEAVE.err}33`,
          borderRadius: 10, padding: '10px 12px', fontSize: 12, color: WEAVE.err, lineHeight: 1.5,
        }}>{error}</div>
      )}

      <button
        onClick={onSubmit}
        disabled={!valid || submitting}
        style={{ ...primaryBtn, opacity: (valid && !submitting) ? 1 : 0.5, cursor: (valid && !submitting) ? 'pointer' : 'not-allowed' }}
      >
        {submitting ? 'Creating payment…' : 'Continue'}
      </button>
    </Stack>
  );
}

// ── Virtual account ──────────────────────────────────────────────────────────

interface VirtualAccount {
  bank: string;
  accountNumber: string;
  accountName: string;
}

const VA_BY_CUR: Record<string, VirtualAccount> = {
  NGN: { bank: 'Wema Bank', accountNumber: '8203 7461 92', accountName: 'Weave / Afriloom-0481' },
};

export interface BankDetails {
  institution: string;
  accountIdentifier: string;
  accountName: string;
  amountToTransfer?: string;
  currency?: string;
  validUntil?: string;
}

// Payout destination logic

function ScreenVirtualAccount({
  onNext, merchant, bankDetails, apiKey, orderId, fmtCur
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  bankDetails: BankDetails | null;
  apiKey: string;
  orderId: string | null;
  currencies: Record<string, Currency>;
  fmtCur: (n: number, cur: string, dec?: number) => string;
}) {
  const c = CURRENCIES[merchant.currency];
  const va = bankDetails
    ? {
      bank: institutionName(merchant.currency, bankDetails.institution),
      accountNumber: bankDetails.accountIdentifier,
      accountName: bankDetails.accountName,
    }
    : VA_BY_CUR[merchant.currency];
  const displayAmount = bankDetails?.amountToTransfer
    ? (() => {
      const raw = bankDetails.amountToTransfer;
      const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
      return fmtCur(Number(raw), merchant.currency, decimals);
    })()
    : fmtCur(merchant.amount, merchant.currency);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Drive the countdown from the real account expiry (validUntil), not a fake
  // 9:42. If the backend didn't supply one, hide the timer rather than invent a
  // deadline.
  const expiryMs = bankDetails?.validUntil ? new Date(bankDetails.validUntil).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (expiryMs == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiryMs]);
  const remainingMs = expiryMs != null ? Math.max(0, expiryMs - now) : null;
  const mins = remainingMs != null ? Math.floor(remainingMs / 60000) : null;
  const secs = remainingMs != null ? Math.floor((remainingMs % 60000) / 1000) : null;

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      try {
        const order = await fetchOrder(apiKey, orderId);
        const status = String(order.status ?? '').toLowerCase();
        if (status && status !== 'awaiting_deposit') {
          stopped = true;
          if (status === 'completed') onNext('success');
          else if (['failed', 'refunded'].includes(status)) onNext('error');
          else onNext('processing');
          return;
        }
      } catch { }
      timer = setTimeout(tick, 5000);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer!); };
  }, [apiKey, orderId, onNext]);

  const copy = (key: string, value: string) => {
    copyToClipboard(value).then(ok => {
      if (!ok) return;
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1400);
    });
  };

  const Field = ({ label, value, k, mono = true }: { label: string; value: string; k: string; mono?: boolean }) => (
    <Row justify="space-between" style={{ padding: '11px 14px' }}>
      <Stack gap={2} style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
        <div style={{
          fontSize: 14, fontWeight: 500, color: WEAVE.ink,
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
          letterSpacing: mono ? -0.2 : 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</div>
      </Stack>
      <button onClick={() => copy(k, value)} style={{
        height: 28, padding: '0 10px', borderRadius: 7,
        border: `1px solid ${WEAVE.hair}`,
        background: copiedKey === k ? WEAVE.accentSoft : '#fff',
        color: copiedKey === k ? WEAVE.accent : WEAVE.ink,
        fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {copiedKey === k ? (
          <>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Copied
          </>
        ) : 'Copy'}
      </button>
    </Row>
  );

  return (
    <Stack gap={14} style={{ padding: '16px 20px 6px' }}>
      <Stack gap={4}>
        <Row justify="space-between" align="flex-start">
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
            Send {displayAmount}
          </div>
          {remainingMs != null && (
            <Pill tone="warn">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ marginRight: 2 }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 7V12L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              {mins}:{String(secs).padStart(2, '0')}
            </Pill>
          )}
        </Row>
        <div style={{ fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5 }}>
          Open your bank app and transfer to this account. We'll confirm your payment automatically — no need to send proof.
        </div>
      </Stack>

      <div style={{ background: '#fff', border: `1px solid ${WEAVE.hair}`, borderRadius: 12, overflow: 'hidden' }}>
        <Row gap={10} style={{ padding: '12px 14px', background: WEAVE.panel, borderBottom: `1px solid ${WEAVE.hair}` }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: '#fff', border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: WEAVE.ink }}>
            {c?.flag ?? '🏦'}
          </div>
          <Stack gap={1} style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{va.bank}</div>
            <div style={{ fontSize: 11, color: WEAVE.mute }}>Virtual account · one-time · {merchant.currency}</div>
          </Stack>
        </Row>
        <Field label="Account number" value={va.accountNumber} k="acc" />
        <Hair />
        <Field label="Account name" value={va.accountName} k="name" mono={false} />
        <Hair />
        <Field label="Amount" value={displayAmount} k="amt" mono={false} />
      </div>

      <div style={{
        background: WEAVE.warnSoft, border: `1px solid ${WEAVE.warn}22`,
        borderRadius: 10, padding: '10px 12px',
        display: 'flex', gap: 10, fontSize: 11.5, color: WEAVE.warn, lineHeight: 1.5,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2L2 20H22L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 10V13M12 16V16.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <span>Send the exact amount. Any difference may delay delivery.</span>
      </div>

    </Stack>
  );
}

// ── Wallet connect screens ───────────────────────────────────────────────────

function ScreenWalletConnect({
  onConnected,
  onExternalFlow,
}: {
  onConnected: () => void;
  onExternalFlow: () => void;
}) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) onConnected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  return (
    <Stack gap={16} style={{ padding: '22px 20px 6px' }}>
      <Stack gap={4}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>Connect your wallet</div>
        <div style={{ fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5 }}>
          Pay directly from your crypto holdings. We'll handle the conversion.
        </div>
      </Stack>
      <Stack gap={8}>
        {connectors.map(connector => {
          const n = connector.name.toLowerCase();
          const subtitle = n.includes('metamask') ? 'Browser extension or MetaMask mobile'
            : n.includes('coinbase') ? 'Coinbase Wallet app or extension'
              : n.includes('phantom') ? 'Phantom wallet extension'
                : n.includes('brave') ? 'Brave browser built-in wallet'
                  : 'Connect with this wallet';
          return (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              style={{ ...methodCard, opacity: isPending ? 0.6 : 1 }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: WEAVE.panel, border: `1px solid ${WEAVE.hair}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {(connector as any).icon ? (
                  <img
                    src={(connector as any).icon}
                    alt={connector.name}
                    style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }}
                  />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="6" width="20" height="14" rx="3" stroke={WEAVE.ink2} strokeWidth="1.8" />
                    <path d="M2 10H22" stroke={WEAVE.ink2} strokeWidth="1.8" />
                    <circle cx="17" cy="15" r="1.5" fill={WEAVE.ink2} />
                  </svg>
                )}
              </div>
              <Stack gap={2} style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{connector.name}</div>
                <div style={{ fontSize: 11.5, color: WEAVE.mute }}>{subtitle}</div>
              </Stack>
              {isPending
                ? <div style={{ width: 12, height: 12, borderRadius: 6, background: WEAVE.accent, opacity: 0.5, animation: 'wpulse 1s infinite' }} />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              }
            </button>
          );
        })}
      </Stack>
      <button
        onClick={onExternalFlow}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: WEAVE.mute, padding: '4px 0', textAlign: 'center' }}
      >
        Don't have a browser wallet? Send from any app →
      </button>
    </Stack>
  );
}

function ScreenWalletAsset({
  onSelectToken,
  onExternalFlow,
  merchant,
  currencies,
  ethUsdPrice,
  loadingEthPrice,
}: {
  onSelectToken: (token: string, bal: Balance) => void;
  onExternalFlow: () => void;
  merchant: Merchant;
  currencies: Record<string, Currency>;
  fmtCur: (n: number, cur: string) => string;
  ethUsdPrice: number;
  loadingEthPrice: boolean;
}) {
  const { address, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();

  const usdcAddr = chainId ? USDC_BY_CHAIN_ID[chainId] : undefined;
  const usdtAddr = chainId ? USDT_BY_CHAIN_ID[chainId] : undefined;
  const supported = chainId ? SUPPORTED_CHAIN_IDS.has(chainId) : false;
  const chainName = chainId ? (CHAIN_ID_TO_DISPLAY[chainId] ?? 'Unknown') : 'Unknown';
  const chainTint = chainId ? (CHAIN_TINT[chainId] ?? WEAVE.accent) : WEAVE.accent;
  const truncated = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  const { data: ethBal, isLoading: ethLoading } = useBalance({ address, chainId, query: { enabled: !!address } });
  const { data: usdcBal, isLoading: usdcLoading } = useBalance({
    address,
    token: usdcAddr,
    chainId,
    query: { enabled: !!address && !!usdcAddr },
  });
  const { data: usdtBal, isLoading: usdtLoading } = useBalance({
    address,
    token: usdtAddr,
    chainId,
    query: { enabled: !!address && !!usdtAddr },
  });

  const ethAmount = ethBal ? Number(formatEther(ethBal.value)) : 0;
  const usdcAmount = usdcBal ? Number(formatUnits(usdcBal.value, usdcBal.decimals)) : 0;
  const usdtAmount = usdtBal ? Number(formatUnits(usdtBal.value, usdtBal.decimals)) : 0;

  const isLoading = loadingEthPrice || ethLoading || usdcLoading || usdtLoading;

  if (isLoading) {
    return (
      <Stack style={{ padding: '60px 0', minHeight: 280, alignItems: 'center', justifyContent: 'center' }}>
        <WeavingLoader />
        <div style={{ marginTop: 16, fontSize: 13, color: WEAVE.mute }}>Fetching market rates…</div>
      </Stack>
    );
  }

  const ethUsdApprox = ethAmount * ethUsdPrice;

  const minRequired = merchant.amount / (currencies[merchant.currency]?.rate || 1);

  const TOKEN_LOGO: Record<string, string> = {
    ETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  };

  const tokens: Array<Balance & { tokenKey: string }> = [
    { tokenKey: 'USDC', token: 'USDC', chain: chainName, amount: usdcAmount, usd: usdcAmount, icon: '$', chainTint, logo: TOKEN_LOGO.USDC },
    ...(usdtAddr ? [{ tokenKey: 'USDT', token: 'USDT', chain: chainName, amount: usdtAmount, usd: usdtAmount, icon: '$', chainTint, logo: TOKEN_LOGO.USDT }] : []),
    { tokenKey: 'ETH', token: 'ETH', chain: chainName, amount: ethAmount, usd: ethUsdApprox, icon: 'Ξ', chainTint, logo: TOKEN_LOGO.ETH },
  ];

  if (!supported) {
    return (
      <Stack gap={14} style={{ padding: '22px 20px 6px' }}>
        <Stack gap={4}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>Switch Network</div>
          <div style={{ fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5 }}>
            Your wallet is on an unsupported chain. Switch to one of these to continue.
          </div>
        </Stack>
        <Stack gap={6}>
          {([8453, 10, 42161, 1, 137] as const).map(id => (
            <button
              key={id}
              onClick={() => switchChain({ chainId: id })}
              disabled={switching}
              style={{ ...methodCard, opacity: switching ? 0.6 : 1 }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: CHAIN_TINT[id], color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
              }}>
                {CHAIN_ID_TO_DISPLAY[id][0]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{CHAIN_ID_TO_DISPLAY[id]}</div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto' }}><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ))}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap={14} style={{ padding: '18px 20px 6px' }}>
      <Row justify="space-between" align="center">
        <Stack gap={1}>
          <div style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>Connected wallet</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: WEAVE.ink, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{truncated}</div>
        </Stack>
        <Pill tone="accent">{chainName}</Pill>
      </Row>

      <div style={{ fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5 }}>
        Select a token to pay with. We'll bridge it to {currencies[merchant.currency]?.name ?? merchant.currency} automatically.
      </div>

      <Stack gap={6}>
        {tokens.map(t => {
          const enough = t.usd >= minRequired;
          return (
            <button
              key={t.tokenKey}
              onClick={() => enough && onSelectToken(t.tokenKey, t)}
              disabled={!enough}
              style={{ ...methodCard, opacity: enough ? 1 : 0.42, cursor: enough ? 'pointer' : 'not-allowed' }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: t.chainTint + '22', border: `1px solid ${t.chainTint}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 15, color: t.chainTint, overflow: 'hidden',
              }}>
                {t.logo
                  ? <img src={t.logo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : t.icon}
              </div>
              <Stack gap={2} style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{fmtCrypto(t.amount, t.tokenKey === 'ETH' ? 4 : 2)} {t.tokenKey}</div>
                <div style={{ fontSize: 11.5, color: WEAVE.mute }}>≈ ${t.usd.toFixed(2)} on {chainName}</div>
              </Stack>
              {!enough
                ? <Pill tone="warn">Insufficient</Pill>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              }
            </button>
          );
        })}
      </Stack>

      <button
        onClick={onExternalFlow}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: WEAVE.mute, textAlign: 'center', padding: '2px 0' }}
      >
        Pay from another wallet or exchange →
      </button>
    </Stack>
  );
}

function ScreenWalletSign({ onRetry }: { onRetry: () => void }) {
  return (
    <Stack gap={20} style={{ padding: '40px 20px 20px', minHeight: 280, alignItems: 'center', justifyContent: 'center' }}>
      <WeavingLoader />
      <Stack gap={6} style={{ alignItems: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Confirm in your wallet</div>
        <div style={{ fontSize: 12.5, color: WEAVE.mute, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
          Check your wallet extension or app and approve the transaction to send funds.
        </div>
        <button
          onClick={onRetry}
          style={{ ...secondaryBtn, marginTop: 12, fontSize: 13, padding: '8px 16px' }}
        >
          Not seeing the pop-up? Try again
        </button>
      </Stack>
    </Stack>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────

export interface WeaveCheckoutProps {
  merchant?: Merchant;
  apiKey?: string;
  sessionId?: string;
  userAddress?: string;
  customer?: { name?: string; email?: string };
  theme?: 'organic' | 'minimal';
  borderRadius?: number;
  accentColor?: string;
  onSuccess?: (txn: { orderId: string; status: string }) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
  apiBase?: string;
  disabledMethods?: Record<string, string>;
}

const DEFAULT_MERCHANT: Merchant = {
  name: 'Afriloom Textiles',
  amount: 700,
  currency: 'NGN',
};

// Kill switch: pure-NGN (naira→naira) collection. While this message is non-null
// the "Pay with <fiat>" method is greyed out with this note, but ONLY for the
// pure-NGN path — i.e. a merchant settling to a naira bank (destAssetKey
// 'fiat:NGN'). Crypto-settling merchants route "pay with naira" through Paycrest
// onramp, which is unaffected, so their naira button stays live regardless.
// The API enforces the matching block server-side via BACHS_ENABLED/PAYSTACK_ENABLED
// (see lib/flags.ts). Naira collection is RESTORED via Bachs, so this is null.
// Set to a message string to re-suspend. NOTE: changing this requires publishing
// a new @weave-sdk/widget version.
const FIAT_METHOD_DISABLED_NOTICE: string | null = null;

const CHAIN_TO_API: Record<string, string> = {
  Base: 'BASE',
  Optimism: 'OPTIMISM',
  Ethereum: 'ETHEREUM',
  Arbitrum: 'ARBITRUM',
  Polygon: 'POLYGON',
};

const _queryClient = new QueryClient();

function WeaveCheckoutInner({
  merchant = DEFAULT_MERCHANT,
  apiKey: propApiKey,
  sessionId,
  userAddress: propUserAddress,
  customer,
  theme = 'organic',
  borderRadius = 16,
  accentColor,
  onSuccess,
  onError,
  onClose,
  apiBase,
  disabledMethods,
}: WeaveCheckoutProps) {
  // Route the trusted `apiBase` prop through a module-scoped setter rather than
  // the mutable `window.__WEAVE_API_BASE__` global — see client.ts for why the
  // global is no longer trusted for absolute URLs.
  if (apiBase) {
    configureApiBase(apiBase);
  }
  const apiKey =
    propApiKey ??
    (typeof window !== 'undefined' ? (window as any).__WEAVE_API_KEY__ : undefined) ??
    ((import.meta as any).env?.VITE_WEAVE_PUBLIC_KEY as string | undefined) ??
    'pk_test_demo';
  const userAddress =
    propUserAddress ??
    ((import.meta as any).env?.VITE_WEAVE_DEMO_USER_ADDRESS as string | undefined) ??
    '0x0000000000000000000000000000000000000000';

  // Resume identity + cache key. Resume is gated on a payer identity so two
  // payers on a shared device can never inherit each other's pending order:
  //   • checkout session → the session id (server-authoritative resume).
  //   • payment link / embed → the payer's email fingerprint.
  //   • neither → no identity, so no auto-resume at all (safe-fail: the payer
  //     starts fresh rather than risk resuming someone else's order).
  // The cache key is only ever written/read under an identity; with no identity
  // it still resolves to a per-merchant key for WRITES, but that key is never
  // read for resume, so it can't leak across payers.
  const payerFp = payerFingerprint(customer?.email);
  const resumeIdentity = sessionId ?? (payerFp ? `e:${payerFp}` : null);
  const storageKey = resumeIdentity
    ? `weave-order-${apiKey}-${resumeIdentity}`
    : `weave-order-${apiKey}`;
  // Ensures the email-scoped cache resume fires at most once, even as the payer's
  // typed email (and thus the identity/key) changes across keystrokes.
  const resumedRef = useRef(false);

  // Wagmi wallet hooks
  const { address: wagmiAddress, chainId: wagmiChainId, isConnected: wagmiConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const disconnect = () => {
    wagmiDisconnect();
    // Only clear the widget's own resume record — NEVER localStorage.clear(),
    // which would wipe the merchant host page's entire origin storage.
    try { localStorage.removeItem(storageKey); } catch { /* storage unavailable */ }
  };
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const [screen, setScreen] = useState('connect');
  const [direction, setDirection] = useState<'offramp' | 'onramp'>('offramp');
  const [selectedBalance, setSelectedBalance] = useState<number | null>(0);
  const [preSelectedChainKey, setPreSelectedChainKey] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [refundAccount, setRefundAccount] = useState<RefundAccount>({
    institution: '',
    accountIdentifier: '',
    accountName: '',
  });
  const [orderId, setOrderId] = useState<string | null>(null);
  // Point the session-timeline emitter at the current order; flushes any events
  // queued before the order existed (e.g. the initial method selection).
  useEffect(() => { configureTxnEmitter(apiKey, orderId); }, [apiKey, orderId]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [paystackPopupDetails, setPaystackPopupDetails] = useState<PaystackPopupDetails | null>(null);
  const [bachsCheckoutDetails, setBachsCheckoutDetails] = useState<BachsCheckoutDetails | null>(null);
  const [anchorTransferDetails, setAnchorTransferDetails] = useState<AnchorTransferDetails | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [depositMemo, setDepositMemo] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [depositToken, setDepositToken] = useState<string | null>(null);
  const [depositChain, setDepositChain] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [quote, setQuote] = useState<OfframpQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [supportedAssets, setSupportedAssets] = useState<{ fiat: any[], crypto: any[] }>({
    fiat: SUPPORTED_FIAT,
    crypto: SUPPORTED_CRYPTO
  });
  const depositReq = useRef(0);
  const quoteReq = useRef(0);
  const pendingOrderRef = useRef<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  const [walletToken, setWalletToken] = useState<string>('USDC');
  const [walletBalanceEntry, setWalletBalanceEntry] = useState<Balance | null>(null);
  const [ethUsdPrice, setEthUsdPrice] = useState<number>(3400);
  const [loadingEthPrice, setLoadingEthPrice] = useState(true);

  // ── Persistence & Resumption ──────────────────────────────────────────────

  // Rehydrate the widget screens from a fetched order. Returns true when it drove
  // a resume (order is live or already completed), false otherwise so the caller
  // can clear stale cache. Shared by both resume paths (session + email cache).
  const resumeFromOrder = useCallback((order: any): boolean => {
    const dir = directionOf(order.sourceAssetKey, order.destAssetKey);
    setDirection(dir === 'onramp' ? 'onramp' : 'offramp');

    if (['awaiting_deposit', 'processing'].includes(order.status)) {
      setOrderId(order.id);

      // Find the active step (usually the first one that isn't DONE)
      const activeStep = order.steps.find((s: any) => s.status !== 'done') || order.steps[0];

      if (dir === 'onramp') {
        if (activeStep?.provider === 'paycrest' && (activeStep.depositAddress || activeStep.amountOut)) {
          if (order.sourceInstrument?.kind === 'bank_account') {
            setBankDetails({
              accountName: order.sourceInstrument.bankAccountName || '',
              accountIdentifier: order.sourceInstrument.bankAccountIdentifier || '',
              institution: order.sourceInstrument.bankInstitution || '',
              currency: order.destAssetKey.split(':').pop() || 'NGN',
              amountToTransfer: order.sourceAmount.toString()
            });
          }
          setScreen('vaccount');
        } else if (activeStep?.provider === 'paystack' && activeStep.paystackAccessCode) {
          setPaystackPopupDetails({
            accessCode: activeStep.paystackAccessCode,
            publicKey: '',
            amount: Number(activeStep.amountIn ?? order.sourceAmount),
            reference: activeStep.externalId ?? '',
          });
          setScreen('paystack_popup');
        } else {
          setScreen('processing');
        }
      } else {
        // Offramp
        if (activeStep?.provider === 'nearintents' && order.status === 'awaiting_deposit') {
          setDepositAddress(activeStep.depositAddress);
          setDepositMemo(activeStep.depositMemo);
          setDepositAmount(Number(activeStep.amountIn));

          const parts = activeStep.fromAsset.split(':');
          setDepositToken(parts[2] || parts[1]);
          setDepositChain(parts[1]);
          setScreen('deposit');
        } else {
          setScreen('processing');
        }
      }
      return true;
    } else if (order.status === 'completed') {
      setOrderId(order.id);
      setScreen('success');
      return true;
    }
    return false;
  }, []);

  // 1a. Session resume (server-authoritative) + one-time bootstrap (asset sync,
  //     pre-selection). For a hosted checkout the session — not this browser —
  //     owns the order, so we resume whatever order the session points at (and
  //     nothing if it points at none). A different payer is on a different
  //     session id, so browser cache is never consulted for the session flow.
  useEffect(() => {
    const resumeViaSession = async () => {
      try {
        const s = await fetchSession(apiKey, sessionId!);
        if (s?.orderId && ['awaiting_deposit', 'processing', 'completed'].includes(s.orderStatus ?? '')) {
          const order = await fetchOrder(apiKey, s.orderId);
          if (!resumeFromOrder(order)) localStorage.removeItem(storageKey);
        } else {
          // Session owns no live order → nothing to resume; drop any stale cache.
          localStorage.removeItem(storageKey);
        }
      } catch {
        /* transient — leave state untouched, the payer can proceed fresh */
      }
    };

    if (sessionId) void resumeViaSession();

    // Sync assets from API
    fetchAssets(apiKey).then(data => {
      if (data) setSupportedAssets(data);
    }).catch(() => { });

    // Pre-selection: stash the source asset KEY, not an index. supportedAssets is
    // still the fallback list here (fetchAssets above is async), so an index
    // captured now could point at the wrong network once the API list loads.
    // ScreenDeposit resolves the key against the live list at render time.
    if (merchant.sourceAssetKey?.startsWith('crypto:') && merchant.amountIn === 'source') {
      const key = merchant.sourceAssetKey.split('crypto:')[1] || null;
      if (key) {
        setPreSelectedChainKey(key);
        setDirection('offramp');
        setScreen('deposit');
      }
    }
    // storageKey intentionally omitted: in the session flow it's stable (session-
    // scoped, email-independent), and depending on it would re-run this bootstrap
    // on every keystroke in the email-scoped (payment-link) flow.
  }, [apiKey, sessionId, resumeFromOrder]); // Run once per (merchant, session)

  // 1b. Cache resume — email-scoped (payment links / direct embeds, no session).
  //     The payer's email is the identity, and it's typed AFTER mount, so this
  //     re-evaluates as the identity (storageKey) changes and resumes the order
  //     under the CURRENT payer's key only. With no email there is no identity,
  //     so nothing is ever resumed — a second payer on a shared device can never
  //     inherit the first payer's order. Fires at most once (resumedRef).
  useEffect(() => {
    if (sessionId) return;              // session flow resumes server-side (1a)
    if (!resumeIdentity) return;        // no payer identity → no auto-resume
    if (resumedRef.current || orderId) return; // already resumed or flow started

    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const { orderId: savedId, createdAt } = JSON.parse(saved);
      // Don't resume orders older than 1h
      if (Date.now() - createdAt < 1 * 60 * 60 * 1000) {
        fetchOrder(apiKey, savedId)
          .then(order => {
            if (resumeFromOrder(order)) resumedRef.current = true;
            else localStorage.removeItem(storageKey);
          })
          .catch(() => localStorage.removeItem(storageKey));
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [apiKey, sessionId, resumeIdentity, storageKey, orderId, resumeFromOrder]);

  // supportedAssets.fiat starts as the SUPPORTED_FIAT constant, then gets
  // replaced by a NEW array reference once fetchAssets resolves — even when
  // the actual rate is unchanged. Depending on the array itself made the
  // effect below re-fire (and double-fetch the ETH quote) a moment after
  // mount for no reason; depending on the resolved primitive rate instead
  // only re-runs it when the rate value genuinely changes.
  const ngnRate = useMemo(() => {
    const fiatAsset = supportedAssets.fiat.find(f => f.key === fiatKey(merchant.currency));
    return fiatAsset?.rate || 1515;
  }, [supportedAssets.fiat, merchant.currency]);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    setLoadingEthPrice(true);
    fetchQuote(apiKey, {
      from: 'crypto:ETHEREUM:ETH',
      to: fiatKey(merchant.currency),
      amount: 1,
      amountIn: 'source'
    }).then(q => {
      if (cancelled) return;
      const price = q.estimatedDest / ngnRate;
      if (!isNaN(price) && price > 0) {
        setEthUsdPrice(price);
      }
      setLoadingEthPrice(false);
    }).catch(err => {
      if (cancelled) return;
      console.warn('[WeaveCheckoutInner] Live ETH price fetch failed:', err);
      setLoadingEthPrice(false);
    });
    return () => { cancelled = true; };
  }, [apiKey, merchant.currency, ngnRate]);

  // 2. Persistence logic: Save state whenever orderId or screen changes
  useEffect(() => {
    if (orderId && !['success', 'error'].includes(screen)) {
      localStorage.setItem(storageKey, JSON.stringify({
        orderId,
        screen,
        createdAt: Date.now()
      }));
    } else if (screen === 'success') {
      // Clear storage after success so next checkout is fresh
      localStorage.removeItem(storageKey);
    }
  }, [orderId, screen, storageKey]);

  // Derived Helpers
  const currencies: Record<string, Currency> = supportedAssets.fiat.reduce((acc, f) => {
    const code = f.key.split(':').pop()!;
    acc[code] = {
      name: f.name,
      symbol: f.symbol,
      flag: f.flag,
      rate: f.rate,
      min: f.min,
      country: f.country,
      psp: 'GTBank',
      bank: 'GTBank ••7890',
      method: 'Bank transfer'
    };
    return acc;
  }, {} as any);

  const depositChainsList = supportedAssets.crypto;

  const fmtCur = (n: number, cur: string, fractionDigits?: number) => {
    const c = currencies[cur] || CURRENCIES[cur]; // Fallback to global if state not yet ready
    if (!c) return `${cur} ${n}`;
    const isFiat = !!c;
    const defDp = isFiat ? 0 : 4;
    const dp = fractionDigits ?? (Number.isInteger(n) ? 0 : defDp);
    const factor = Math.pow(10, dp);
    const rounded = dp > 0 ? Math.ceil(n * factor) / factor : Math.ceil(n);
    const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(rounded);
    return `${c.symbol}${formatted}`;
  };

  const handleMethodPick = (method: PathPick) => {
    setApiError(null);
    setOrderId(null);
    setDepositAddress(null);
    setDepositMemo(null);
    setDepositError(null);
    setBankDetails(null);
    setQuote(null);
    setWalletBalanceEntry(null);
    if (method === 'fiat') {
      setDirection('onramp');
      // Skip refundAccount screen only for pure NGN→NGN (Paystack) flows.
      // Paycrest onramp (any fiat→crypto route) requires a real refundAccount.
      const isPureNgn = merchant.currency === 'NGN' && merchant.destAssetKey === 'fiat:NGN';
      if (isPureNgn) {
        createFiatOrder();
      } else {
        setScreen('refundAccount');
      }
    } else if (method === 'crypto') {
      setDirection('offramp');
      setScreen('wallet');
    } else if (method === 'deposit') {
      // "Pay from connected wallet" — go to wallet connect flow (ChainRails self flow)
      setDirection('offramp');
      setScreen(wagmiConnected ? 'walletAsset' : 'walletConnect');
    } else if (method === 'externalDeposit') {
      // "Pay with crypto" — NEAR Intents deposit address flow (any chain/token/wallet)
      setDirection('offramp');
      setScreen('deposit');
    }
  };

  const onDepositChainChange = async (apiChain: string, token: string, refundAddr: string) => {
    const myReq = ++depositReq.current;
    emitTxnEvent('chain.selected', { chain: apiChain, token });
    setDepositLoading(true);
    setDepositError(null);
    setDepositAddress(null);
    setDepositMemo(null);
    setDepositAmount(null);
    setDepositToken(null);
    setDepositChain(null);
    try {
      const from = cryptoKey(apiChain, token);
      const to = merchant.destAssetKey || fiatKey(merchant.currency);
      const finalAmountIn = merchant.amountIn ?? 'dest';

      let targetAmount = merchant.amount;

      // Bug 2 Fix: If destination is crypto but merchant amount is in fiat (NGN),
      // we must find the actual crypto value of that fiat amount first.
      if (to.startsWith('crypto:') && merchant.currency === 'NGN') {
        const fiatToCrypto = await fetchQuote(apiKey, {
          from: fiatKey(merchant.currency),
          to,
          amount: merchant.amount,
          amountIn: 'source'
        });
        targetAmount = fiatToCrypto.estimatedDest;
      }

      // Validate the quote up front — throws if the route is unavailable, before we create the order.
      await fetchQuote(apiKey, {
        from, to, amount: targetAmount, amountIn: finalAmountIn,
      });
      // A newer chain selection superseded this one while we were quoting — bail
      // BEFORE creating an order so a stale request doesn't leave an orphan.
      if (depositReq.current !== myReq) return;
      // External flow: sender identity is unknown at order-creation time.
      const source: { inline: InlineWalletInstrument } = {
        inline: { kind: 'crypto_wallet', assetKey: from, walletAddress: '' },
      };
      pendingOrderRef.current ??= newOrderRef();
      const res = await createOrder(apiKey, {
        source,
        amount: targetAmount,
        amountIn: finalAmountIn,
        refundAddress: refundAddr,
        reference: pendingOrderRef.current,
        sessionId,
        customer: customer ?? undefined,
        dest: merchant.destInstrument ? {
          inline: {
            ...merchant.destInstrument,
            assetKey: to,
          }
        } : undefined,
      });
      if (depositReq.current !== myReq) return;
      // Validate the API-returned address against the chain the user selected,
      // before we render it and they irreversibly pay into it.
      const addrErr = depositAddressError(res.nextAction.depositAddress, apiChain, {
        resChain: res.nextAction.chain, resToken: res.nextAction.token, requestedToken: token,
      });
      if (addrErr) throw new Error(addrErr);
      pendingOrderRef.current = null;
      setOrderId(res.order.id);
      setDepositAddress(res.nextAction.depositAddress ?? null);
      setDepositMemo(res.nextAction.depositMemo ?? null);
      setBankDetails(res.nextAction.bankDetails ?? null);
      setDepositAmount(typeof res.nextAction.amount === 'number' ? res.nextAction.amount : null);
      setDepositToken(res.nextAction.token ?? token);
      setDepositChain(res.nextAction.chain ?? apiChain);
    } catch (e: any) {
      if (depositReq.current !== myReq) return;
      // 409: a concurrent request already created this order for our reference.
      // Resume from the existing order's deposit step instead of erroring out.
      const existing = await fetchExistingOrderOn409(apiKey, e);
      const step = existing?.steps?.[0];
      if (depositReq.current !== myReq) return;
      if (step?.depositAddress && !depositAddressError(step.depositAddress, apiChain)) {
        pendingOrderRef.current = null;
        setOrderId(existing.id);
        setDepositAddress(step.depositAddress);
        setDepositMemo(step.depositMemo ?? null);
        setDepositAmount(typeof step.amountIn === 'number' ? step.amountIn : null);
        setDepositToken(token);
        setDepositChain(apiChain);
        return;
      }
      // Clear the idempotency ref so a retry (especially on a different chain)
      // gets a fresh reference instead of colliding with this failed attempt.
      pendingOrderRef.current = null;
      setDepositError(e.message ?? 'Could not generate a deposit address');
      onError?.(e);
    } finally {
      if (depositReq.current === myReq) setDepositLoading(false);
    }
  };

  const advanceToQuote = async () => {
    setScreen('quote');
    const bal = BALANCES[selectedBalance ?? 0];
    const myReq = ++quoteReq.current;
    setQuoteLoading(true);
    setQuote(null);
    try {
      const q = await fetchQuote(apiKey, {
        from: cryptoKey(CHAIN_TO_API[bal.chain] ?? bal.chain, bal.token),
        to: fiatKey(merchant.currency),
        amount: merchant.amount,
        amountIn: 'dest',
      });
      if (quoteReq.current !== myReq) return;
      // Project the new Quote shape onto ScreenQuote's OfframpQuote contract
      // so the UI stays untouched.
      setQuote({
        estimatedFiat: q.estimatedDest,
        netUsdc: q.breakdown.netUsd,
        fiatCurrency: merchant.currency,
        breakdown: {
          inputAmount: q.breakdown.usdEquivalent,
          inputToken: bal.token,
          fastPath: q.route.steps.length === 1,
          bridgeFeeUsd: q.breakdown.bridgeFeeUsd,
          senderFeeUsd: q.breakdown.senderFeeUsd,
          appFeeUsd: q.breakdown.appFeeUsd,
          sellRate: q.breakdown.sellRate ?? 0,
        },
      });
    } catch {
      // Keep fallback math; swallow so UI stays usable
    } finally {
      if (quoteReq.current === myReq) setQuoteLoading(false);
    }
  };

  const advanceToWalletQuote = async (balEntry: Balance, token: string) => {
    setWalletBalanceEntry(balEntry);
    setWalletToken(token);
    setScreen('quote');
    if (!wagmiChainId) return;
    const apiChain = CHAIN_ID_TO_API_NAME[wagmiChainId];
    if (!apiChain) return;
    const myReq = ++quoteReq.current;
    setQuoteLoading(true);
    setQuote(null);
    try {
      const q = await fetchQuote(apiKey, {
        from: cryptoKey(apiChain, token),
        to: fiatKey(merchant.currency),
        amount: merchant.amount,
        amountIn: 'dest',
      });
      if (quoteReq.current !== myReq) return;
      setQuote({
        estimatedFiat: q.estimatedDest,
        netUsdc: q.breakdown.netUsd,
        fiatCurrency: merchant.currency,
        breakdown: {
          inputAmount: q.breakdown.usdEquivalent,
          inputToken: token,
          fastPath: q.route.steps.length === 1,
          bridgeFeeUsd: q.breakdown.bridgeFeeUsd,
          senderFeeUsd: q.breakdown.senderFeeUsd,
          appFeeUsd: q.breakdown.appFeeUsd,
          sellRate: q.breakdown.sellRate ?? 0,
        },
      });
    } catch {
      // Keep fallback math
    } finally {
      if (quoteReq.current === myReq) setQuoteLoading(false);
    }
  };

  const advance = (next: string) => {
    if (next === 'success' && onSuccess && orderId) {
      onSuccess({ orderId, status: 'completed' });
    }
    setScreen(next);
  };

  const createFiatOrder = async (_info?: RefundAccount) => {
    setSubmitting(true);
    setApiError(null);
    try {
      const source: { inline: InlineBankInstrument } = {
        inline: {
          kind: 'bank_account',
          assetKey: fiatKey(merchant.currency),
          bankInstitution: refundAccount.institution,
          bankAccountIdentifier: refundAccount.accountIdentifier,
          bankAccountName: refundAccount.accountName,
        },
      };

      // Resolve the order amount + anchor.
      // Default: charge merchant.amount, anchored on dest when settling to fiat.
      let orderAmount = merchant.amount;
      let orderAmountIn: 'source' | 'dest' | undefined =
        merchant.destAssetKey?.startsWith('fiat:') ? 'dest' : undefined;

      // Crypto-priced link/session paid with fiat: merchant.amount is denominated in the
      // source crypto (e.g. 100 USDC), but this order is funded in fiat. Re-anchor on the
      // merchant's settlement asset so we charge the real equivalent rather than treating
      // "100" as ₦100. The quote's `to` is always the order's real dest, so estimatedDest
      // is in the dest asset's own units — anchoring `dest` is unit-safe whether the
      // merchant settles to fiat (Dewdrop → NGN) or crypto (NGN→USDC onramp).
      const sourceIsCrypto =
        merchant.amountIn === 'source' && !!merchant.sourceAssetKey?.startsWith('crypto:');
      if (sourceIsCrypto && merchant.destAssetKey) {
        if (merchant.sourceAssetKey === merchant.destAssetKey) {
          // Priced and settled in the same crypto → merchant wants exactly this amount.
          orderAmount = merchant.amount;
          orderAmountIn = 'dest';
        } else {
          const conv = await fetchQuote(apiKey, {
            from: merchant.sourceAssetKey!,
            to: merchant.destAssetKey,
            amount: merchant.amount,
            amountIn: 'source',
          });
          orderAmount = conv.estimatedDest;
          orderAmountIn = 'dest';
        }
      }

      pendingOrderRef.current ??= newOrderRef();
      const res = await createOrder(apiKey, {
        source,
        amount: orderAmount,
        reference: pendingOrderRef.current,
        sessionId,
        customer: customer ?? undefined,
        dest: merchant.destInstrument ? {
          inline: {
            ...merchant.destInstrument,
            assetKey: merchant.destAssetKey || (merchant.destInstrument as any).assetKey,
          }
        } : undefined,
        amountIn: orderAmountIn,
      });
      pendingOrderRef.current = null;
      setOrderId(res.order.id);
      setBankDetails(res.nextAction.bankDetails ?? null);
      setPaystackPopupDetails(res.nextAction.paystackPopupDetails ?? null);
      setBachsCheckoutDetails(res.nextAction.bachsCheckout ?? null);
      setAnchorTransferDetails(res.nextAction.anchorTransfer ?? null);
      const nextScreen =
        res.nextAction.screen === 'paystack_popup' ? 'paystack_popup' :
        res.nextAction.screen === 'bachs_checkout' ? 'bachs_checkout' :
        res.nextAction.screen === 'anchor_transfer' ? 'anchor_transfer' :
          'vaccount';
      setScreen(nextScreen);
    } catch (e: any) {
      // Clear the idempotency ref so a retry gets a fresh reference.
      pendingOrderRef.current = null;
      setApiError(e.message ?? 'Failed to create order');
      onError?.(e);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRefundAccount = () => createFiatOrder(refundAccount);

  const confirmOfframp = async () => {
    if (submitting) return;
    // Use real wallet balance entry if in the connect-wallet flow, else fall back to mock BALANCES
    const bal = walletBalanceEntry ?? BALANCES[selectedBalance ?? 0];
    const isWalletFlow = wagmiConnected && wagmiAddress && wagmiChainId && walletBalanceEntry;
    // Track wallet-sign entry locally. The `screen` closure is stale inside this
    // async handler (it's whatever it was at render, e.g. 'quote'), so the catch
    // below must NOT read `screen` to decide whether to navigate back.
    let enteredWalletSign = false;

    setSubmitting(true);
    setApiError(null);
    try {
      let activeOrderId = orderId;
      let activeDepositAddr = depositAddress;
      let activeSourceAmt = depositAmount;

      if (!activeOrderId || !activeDepositAddr) {
        const apiChain = isWalletFlow
          ? (CHAIN_ID_TO_API_NAME[wagmiChainId!] ?? CHAIN_TO_API[bal.chain] ?? bal.chain)
          : (CHAIN_TO_API[bal.chain] ?? bal.chain);
        const token = isWalletFlow ? walletToken : bal.token;
        const from = cryptoKey(apiChain, token);

        const source: { inline: InlineWalletInstrument } = {
          inline: {
            kind: 'crypto_wallet',
            assetKey: from,
            walletAddress: isWalletFlow ? wagmiAddress! : userAddress,
          },
        };
        pendingOrderRef.current ??= newOrderRef();
        const res = await createOrder(apiKey, {
          source,
          amount: merchant.amount,
          amountIn: 'dest',
          flow: isWalletFlow ? 'self' : undefined,
          reference: pendingOrderRef.current,
          sessionId,
          customer: customer ?? undefined,
          dest: merchant.destInstrument ? {
            inline: {
              ...merchant.destInstrument,
              assetKey: merchant.destAssetKey || (merchant.destInstrument as any).assetKey,
            }
          } : undefined,
        });
        pendingOrderRef.current = null;
        // Validate the API-returned address against the selected chain before we
        // sign a transfer to it.
        const offrampAddrErr = depositAddressError(res.nextAction.depositAddress, apiChain, {
          resChain: res.nextAction.chain, resToken: res.nextAction.token, requestedToken: token,
        });
        if (offrampAddrErr) throw new Error(offrampAddrErr);
        activeOrderId = res.order.id;
        activeDepositAddr = res.nextAction.depositAddress ?? null;
        activeSourceAmt = res.order.sourceAmount;

        setOrderId(activeOrderId);
        setDepositAddress(activeDepositAddr);
        setDepositAmount(activeSourceAmt);
        setDepositToken(res.nextAction.token ?? token);
        setDepositChain(res.nextAction.chain ?? apiChain);
      }

      if (isWalletFlow && activeDepositAddr) {
        // Self flow: prompt wallet to sign the transfer to the ChainRails intent address
        enteredWalletSign = true;
        setScreen('walletSign');
        const token = walletToken;
        const sourceAmt = activeSourceAmt!;
        let hash: `0x${string}`;
        if (token === 'ETH') {
          hash = await sendTransactionAsync({
            to: activeDepositAddr as any,
            value: parseEther(sourceAmt.toString()) as any,
            chainId: wagmiChainId as any,
          } as any);
        } else {
          const tokenAddr = token === 'USDC'
            ? USDC_BY_CHAIN_ID[wagmiChainId!]
            : USDT_BY_CHAIN_ID[wagmiChainId!];
          if (!tokenAddr) throw new Error(`${token} is not available on this chain`);
          hash = await writeContractAsync({
            address: tokenAddr as any,
            abi: MINIMAL_ERC20_ABI as any,
            functionName: 'transfer' as any,
            args: [activeDepositAddr as any, parseUnits(sourceAmt.toString(), 6) as any],
            chainId: wagmiChainId as any,
          } as any);
        }
        // Wait for on-chain confirmation before moving to processing screen.
        // We timeout after 60s to avoid hanging if the txn is stuck in mempool.
        try {
          await waitForTransactionReceipt(wagmiConfig as any, { hash, timeout: 60000 });
        } catch (err: any) {
          console.warn('[widget] transaction wait timed out or failed:', err.message);
          // We continue to processing screen anyway; the backend will eventually see it
          // OR the user will see it's still awaiting deposit.
        }
      } else {
        setDepositAddress(activeDepositAddr);
      }

      setScreen('processing');
    } catch (e: any) {
      const msg = e.message ?? '';
      const rejected = msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('cancelled');
      setApiError(rejected ? 'Transaction was rejected. Please try again.' : (msg || 'Failed to complete payment'));
      // Clear the idempotency ref so a retry that needs a fresh order gets a new
      // reference. When an order was already created, orderId is set and the
      // retry reuses it, so this only bites when creation itself failed.
      pendingOrderRef.current = null;
      if (enteredWalletSign) setScreen('quote');
      onError?.(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (closed) {
    return (
      <button type="button" aria-label="Reopen Weave checkout" style={{
        position: 'absolute', bottom: 24, right: 24, zIndex: 10,
        background: WEAVE.ink, color: '#fff', border: 'none',
        padding: '10px 16px', borderRadius: 999, fontSize: 13, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        minWidth: '185px',
      }} onClick={() => setClosed(false)}>
        <WeaveMark size={16} />
        Pay with Weave
      </button>
    );
  }

  const balance = BALANCES[selectedBalance ?? 0];
  const isOnramp = direction === 'onramp';

  const retry = (target: string) => {
    emitTxnEvent('retry');
    pendingOrderRef.current = null;
    setOrderId(null);
    setApiError(null);
    setBankDetails(null);
    setPaystackPopupDetails(null);
    setBachsCheckoutDetails(null);
    setAnchorTransferDetails(null);
    setDepositAddress(null);
    setDepositMemo(null);
    setDepositError(null);
    setQuote(null);
    setWalletBalanceEntry(null);
    setScreen(target);
  };

  // Merge the naira kill switch into whatever the host passed, but ONLY for the
  // pure-NGN Paystack path (naira-settling merchant). Crypto-settling merchants
  // fund "pay with naira" via Paycrest onramp, which is unaffected — leave their
  // button live. Mirrors the `isPureNgn` check in handleMethodPick and the
  // Paystack-only block in the API router. An explicit caller-supplied fiat note
  // still wins so a merchant can override the copy.
  const isPaystackFiat = merchant.currency === 'NGN' && merchant.destAssetKey === 'fiat:NGN';
  const effectiveDisabledMethods = (FIAT_METHOD_DISABLED_NOTICE && isPaystackFiat)
    ? { fiat: FIAT_METHOD_DISABLED_NOTICE, ...disabledMethods }
    : disabledMethods;

  const body = (() => {
    if (screen === 'connect') return <ScreenConnect onPick={handleMethodPick} merchant={merchant} currencies={currencies} fmtCur={fmtCur} submitting={submitting} disabledMethods={effectiveDisabledMethods} />;
    if (isOnramp) {
      if (screen === 'refundAccount') return <ScreenRefundAccount merchant={merchant} value={refundAccount} onChange={setRefundAccount} onSubmit={submitRefundAccount} submitting={submitting} error={apiError} />;
      if (screen === 'vaccount') return <ScreenVirtualAccount onNext={advance} merchant={merchant} bankDetails={bankDetails} apiKey={apiKey} orderId={orderId} currencies={currencies} fmtCur={fmtCur} />;
      if (screen === 'paystack_popup') return <ScreenPaystackPopup onNext={advance} details={paystackPopupDetails} />;
      if (screen === 'bachs_checkout') return <ScreenBachsCheckout onNext={advance} details={bachsCheckoutDetails} orderId={orderId} apiKey={apiKey} />;
      if (screen === 'anchor_transfer') return <ScreenAnchorTransfer onNext={advance} details={anchorTransferDetails} orderId={orderId} apiKey={apiKey} merchant={merchant} fmtCur={fmtCur} />;
      if (screen === 'processing') return <ScreenProcessing onNext={advance} merchant={merchant} mode="fiat" apiKey={apiKey} orderId={orderId} bankDetails={bankDetails} currencies={currencies} fmtCur={fmtCur} />;
      if (screen === 'success') return <ScreenSuccess onNext={advance} balance={balance} merchant={merchant} direction={direction} apiKey={apiKey} orderId={orderId} accentColor={accentColor} currencies={currencies} fmtCur={fmtCur} />;
      if (screen === 'error') return <ScreenError onNext={() => retry('connect')} onBack={() => retry('refundAccount')} message={apiError} />;
    } else {
      if (screen === 'walletConnect') return <ScreenWalletConnect onConnected={() => setScreen('walletAsset')} onExternalFlow={() => { setDirection('offramp'); setScreen('deposit'); }} />;
      if (screen === 'walletAsset') return <ScreenWalletAsset onSelectToken={(token, bal) => advanceToWalletQuote(bal, token)} onExternalFlow={() => setScreen('deposit')} merchant={merchant} currencies={currencies} fmtCur={fmtCur} ethUsdPrice={ethUsdPrice} loadingEthPrice={loadingEthPrice} />;
      if (screen === 'walletSign') return <ScreenWalletSign onRetry={confirmOfframp} />;
      if (screen === 'deposit') return <ScreenDeposit onNext={advance} merchant={merchant} depositAddress={depositAddress} depositMemo={depositMemo} amountToSend={depositAmount} sourceToken={depositToken} sourceChain={depositChain} loading={depositLoading} error={depositError} onChainChange={onDepositChainChange} ready={!!orderId && !!depositAddress && !depositLoading} apiKey={apiKey} orderId={orderId} preSelectedChainKey={preSelectedChainKey} depositChains={depositChainsList} currencies={currencies} fmtCur={fmtCur} />;
      if (screen === 'wallet') return <ScreenBalances onNext={() => advanceToQuote()} merchant={merchant} balances={BALANCES} selected={selectedBalance} setSelected={setSelectedBalance} currencies={currencies} />;
      if (screen === 'quote') return <ScreenQuote merchant={merchant} balance={walletBalanceEntry ?? balance} onConfirm={confirmOfframp} submitting={submitting} error={apiError} quote={quote} quoteLoading={quoteLoading} currencies={currencies} fmtCur={fmtCur} />;
      if (screen === 'processing') return <ScreenProcessing onNext={advance} merchant={merchant} mode="crypto" apiKey={apiKey} orderId={orderId} currencies={currencies} fmtCur={fmtCur} />;
      if (screen === 'success') return <ScreenSuccess onNext={advance} balance={balance} merchant={merchant} direction={direction} apiKey={apiKey} orderId={orderId} accentColor={accentColor} currencies={currencies} fmtCur={fmtCur} />;
      if (screen === 'error') return <ScreenError onNext={() => retry('connect')} onBack={() => retry('quote')} message={apiError} />;
    }
    return null;
  })();

  const showBack =
    (['wallet', 'quote', 'deposit', 'walletConnect', 'walletAsset', 'walletSign'].includes(screen) && !isOnramp) ||
    (['refundAccount', 'vaccount'].includes(screen) && isOnramp);
  const backTarget =
    screen === 'quote' ? (walletBalanceEntry ? 'walletAsset' : 'wallet') :
      screen === 'vaccount' ? 'refundAccount' :
        screen === 'walletAsset' ? 'connect' :
          screen === 'walletSign' ? 'quote' :
            'connect';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pay ${merchant.name}`}
      className={`weave-checkout weave-theme-${theme}`}
      style={{
        '--weave-accent': ACCENT_MAP[accentColor as string] || accentColor || '#0F5D4C',
        '--weave-accent-soft': (ACCENT_MAP[accentColor as string] || accentColor || '#0F5D4C') + '15',
        width: '100%',
        maxWidth: 400,
        background: WEAVE.surface,
        borderRadius: borderRadius,
        boxShadow: '0 30px 80px rgba(11, 15, 14, 0.22), 0 0 0 1px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        color: WEAVE.ink,
        animation: 'wslide 0.35s cubic-bezier(0.2, 1, 0.3, 1)',
      } as React.CSSProperties}>
      <WidgetHeader
        merchantName={merchant.name}
        onClose={() => { setClosed(true); onClose?.(); }}
        showBack={showBack}
        onBack={() => {
          if (screen === 'walletAsset') disconnect();
          setScreen(backTarget);
        }}
      />
      {!isOnline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          background: WEAVE.warnSoft,
          color: WEAVE.warn,
          fontSize: 12,
          fontWeight: 500,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6l5.5 5.5M17 6l-5.5 5.5M12 20v.01"/><path d="M5 10l-4-4M23 2L1 22"/></svg>
          No connection — your payment is safe, reconnecting…
        </div>
      )}
      <div key={screen} style={{ animation: 'wfade 0.25s ease' }}>
        {body}
      </div>
      <WidgetFooter />
    </div>
  );
}

export function WeaveCheckout(props: WeaveCheckoutProps) {
  return (
    <WagmiProviderC config={wagmiConfig}>
      <QueryClientProviderC client={_queryClient}>
        <WeaveCheckoutInner {...props} />
      </QueryClientProviderC>
    </WagmiProviderC>
  );
}
