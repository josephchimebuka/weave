import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { QRCodeSVG as QRCodeSVGRaw } from 'qrcode.react';
// `qrcode.react`'s peer pulls @types/react@19 into the pnpm store, which clashes
// with the widget's @types/react@18 (bigint in ReactNode). Cast to sidestep the
// JSX-element type mismatch without adding a workspace-wide overrides entry.
const QRCodeSVG = QRCodeSVGRaw as unknown as (props: { value: string; size?: number; level?: string; includeMargin?: boolean }) => ReactNode;
import {
  createOrder,
  fetchOrder,
  fetchQuote,
  cryptoKey,
  fiatKey,
  type InlineBankInstrument,
  type InlineWalletInstrument,
} from '../api/client';

// ── Design tokens ────────────────────────────────────────────────────────────

const WEAVE = {
  ink: '#0B0F0E',
  ink2: '#3A4240',
  mute: '#6B7572',
  hair: '#E8EAE6',
  surface: '#FFFFFF',
  page: '#F5F4EF',
  panel: '#FAFAF7',
  accent: '#0F5D4C',
  accentSoft: '#E6F0EC',
  accentInk: '#FFFFFF',
  good: '#1F7A4D',
  goodSoft: '#E6F3EC',
  warn: '#A46A00',
  warnSoft: '#FBF0DC',
  err: '#A8321E',
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

const CURRENCIES: Record<string, Currency> = {
  NGN: { name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', rate: 1515, min: 5000, country: 'Nigeria', psp: 'GTBank', bank: 'GTBank ••7890', method: 'Bank transfer' },
};

interface Balance {
  token: string;
  chain: string;
  amount: number;
  usd: number;
  icon: string;
  chainTint: string;
}

const BALANCES: Balance[] = [
  { token: 'ETH',  chain: 'Optimism',  amount: 0.312,  usd: 1024.40, icon: 'Ξ', chainTint: '#ff3f57' },
  { token: 'USDC', chain: 'Base',      amount: 150.00, usd: 150.00,  icon: '$', chainTint: '#1C4FE0' },
  { token: 'STRK', chain: 'Starknet',  amount: 840.0,  usd: 184.80,  icon: 'S', chainTint: '#EC796B' },
  { token: 'DAI',  chain: 'Ethereum',  amount: 502.00, usd: 502.00,  icon: 'D', chainTint: '#F5AC37' },
];

interface Merchant {
  name: string;
  amount: number;
  currency: string;
}

const fmtMoney = (n: number, cur: string, fractionDigits?: number) => {
  const c = CURRENCIES[cur];
  const dp = fractionDigits ?? (Number.isInteger(n) ? 0 : 2);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
  return `${c.symbol}${formatted}`;
};
const fmtCrypto = (n: number, dp = 4) =>
  n.toLocaleString('en-US', { maximumFractionDigits: dp });

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
    good:    { bg: WEAVE.goodSoft, fg: WEAVE.good },
    accent:  { bg: WEAVE.accentSoft, fg: WEAVE.accent },
    warn:    { bg: WEAVE.warnSoft, fg: WEAVE.warn },
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
      <path d="M3 5 L8 19 L12 9 L16 19 L21 5" stroke={WEAVE.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 9 L12 19 L19 9" stroke={WEAVE.ink} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
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
        <button onClick={onBack} style={backBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
      <button onClick={onClose} style={closeBtn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
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
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6V12C3 17 6.5 21 12 22C17.5 21 21 17 21 12V6L12 2Z" stroke="currentColor" strokeWidth="1.8"/></svg>
        Secured by Weave
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>ChainRails · Paycrest</span>
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

type PathPick = 'fiat' | 'crypto' | 'deposit';

function ScreenConnect({ onPick, merchant }: {
  onPick:   (p: PathPick) => void;
  merchant: Merchant;
}) {
  const c = CURRENCIES[merchant.currency];
  const [showMoreCrypto, setShowMoreCrypto] = useState(false);

  return (
    <Stack gap={16} style={{ padding: '22px 20px 6px' }}>
      <Stack gap={10} style={{ alignItems: 'center', padding: '4px 0 6px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: '#2B1810', color: '#F5DEB3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 20, fontFamily: 'Georgia, serif',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        }}>A</div>
        <Stack gap={3} style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 12.5, color: WEAVE.mute }}>Pay {merchant.name}</div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: WEAVE.ink }}>
            {fmtMoney(merchant.amount, merchant.currency)}
          </div>
          <div style={{ fontSize: 11.5, color: WEAVE.mute }}>Order #AFR-0481 · 2 items</div>
        </Stack>
      </Stack>

      <Stack gap={8}>
        <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          How would you like to pay?
        </div>

        <button onClick={() => onPick('fiat')} style={methodCard}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 21H21M5 21V10M9 21V10M15 21V10M19 21V10M2 10L12 3L22 10H2Z" stroke={WEAVE.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <Stack gap={2} style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: WEAVE.ink }}>Bank transfer</div>
            <div style={{ fontSize: 11.5, color: WEAVE.mute }}>Pay in {c.name} · Instant · No fees</div>
          </Stack>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <button onClick={() => onPick('crypto')} style={methodCard}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconDot bg="#F6851B" size={24}>🦊</IconDot>
          </div>
          <Stack gap={2} style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Pay with crypto wallet</div>
            <div style={{ fontSize: 11.5, color: WEAVE.mute }}>MetaMask detected · Any chain, any token</div>
          </Stack>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {!showMoreCrypto ? (
          <button onClick={() => setShowMoreCrypto(true)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12, color: WEAVE.mute, padding: '4px 0', textAlign: 'center',
          }}>
            Use a different wallet ↓
          </button>
        ) : (
          <Stack gap={6} style={{ padding: '2px 0' }}>
            <Row gap={6}>
              <button onClick={() => onPick('crypto')} style={{ ...methodCardSm, flex: 1 }}>
                <IconDot bg="#3B99FC" size={20}>W</IconDot>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>WalletConnect</span>
              </button>
              <button onClick={() => onPick('crypto')} style={{ ...methodCardSm, flex: 1 }}>
                <IconDot bg="#0052FF" size={20}>B</IconDot>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>Coinbase</span>
              </button>
            </Row>
            <button onClick={() => onPick('deposit')} style={methodCardSm}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: WEAVE.panel, border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" stroke={WEAVE.ink} strokeWidth="2"/><rect x="14" y="3" width="7" height="7" stroke={WEAVE.ink} strokeWidth="2"/><rect x="3" y="14" width="7" height="7" stroke={WEAVE.ink} strokeWidth="2"/></svg>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>Pay from mobile / hardware / exchange</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto' }}><path d="M9 6L15 12L9 18" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </Stack>
        )}
      </Stack>

      <Row gap={6} justify="center" style={{ padding: '4px 0 0', fontSize: 11.5, color: WEAVE.mute }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6V12C3 17 6.5 21 12 22C17.5 21 21 17 21 12V6L12 2Z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Bank-grade encryption · Weave never holds your money
      </Row>
    </Stack>
  );
}

function ScreenBalances({
  onNext, merchant, balances, selected, setSelected,
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  balances: Balance[];
  selected: number | null;
  setSelected: (i: number) => void;
}) {
  return (
    <Stack gap={14} style={{ padding: '18px 20px 6px' }}>
      <Stack gap={4}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
          Choose what you'd like to pay with
        </div>
        <div style={{ fontSize: 12.5, color: WEAVE.mute }}>
          We found these balances in your wallet. Pick any — we'll convert to {CURRENCIES[merchant.currency].name} for {merchant.name}.
        </div>
      </Stack>

      <Stack gap={6}>
        {balances.map((b, i) => {
          const enough = b.usd >= (merchant.amount / CURRENCIES[merchant.currency].rate);
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
              <IconDot bg={b.chainTint} size={36}>{b.icon}</IconDot>
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
  netUsdc:       number;
  fiatCurrency:  string;
  breakdown: {
    inputAmount:  number;
    inputToken:   string;
    fastPath:     boolean;
    bridgeFeeUsd: number;
    senderFeeUsd: number;
    appFeeUsd:    number;
    sellRate:     number;
  };
}

function ScreenQuote({
  merchant, balance, onConfirm, submitting, error, quote, quoteLoading,
}: {
  merchant: Merchant;
  balance: Balance;
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
  quote: OfframpQuote | null;
  quoteLoading: boolean;
}) {
  const fallbackNeeded = merchant.amount / CURRENCIES[merchant.currency].rate;
  const needed       = quote ? quote.breakdown.inputAmount : fallbackNeeded;
  const cryptoAmount = needed / (balance.usd / balance.amount);
  const bridgeFee    = quote ? quote.breakdown.bridgeFeeUsd : (balance.chain === 'Base' && balance.token === 'USDC' ? 0 : 1.80);
  const weaveFee     = quote ? quote.breakdown.senderFeeUsd + quote.breakdown.appFeeUsd : needed * 0.0075;
  const totalFees    = bridgeFee + weaveFee;
  const sellRate     = quote ? quote.breakdown.sellRate : CURRENCIES[merchant.currency].rate;
  const fiatOut      = quote ? quote.estimatedFiat : merchant.amount;

  return (
    <Stack gap={14} style={{ padding: '16px 20px 6px' }}>
      <Stack gap={6}>
        <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>You pay</div>
        <Row align="baseline" gap={8}>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }}>
            {fmtCrypto(cryptoAmount, 4)}
          </div>
          <div style={{ fontSize: 16, color: WEAVE.ink2, fontWeight: 500 }}>{balance.token}</div>
        </Row>
        <Row gap={6} style={{ fontSize: 12, color: WEAVE.mute }}>
          <IconDot bg={balance.chainTint} size={14}>{balance.icon}</IconDot>
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
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12L12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          converts to
        </div>
      </div>

      <Stack gap={6}>
        <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>{merchant.name} receives</div>
        <Row align="baseline" gap={8}>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: WEAVE.accent }}>
            {fmtMoney(fiatOut, merchant.currency)}
          </div>
        </Row>
        <Row gap={6} style={{ fontSize: 12, color: WEAVE.mute }}>
          via {CURRENCIES[merchant.currency].method} · {CURRENCIES[merchant.currency].psp}
        </Row>
      </Stack>

      <Stack gap={7} style={{ fontSize: 12.5 }}>
        <Row justify="space-between"><span style={{ color: WEAVE.mute }}>Rate</span><span>1 USDC = {fmtMoney(sellRate, merchant.currency)}</span></Row>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>
        <div style={{ fontSize: 11, color: WEAVE.mute, textAlign: 'center' }}>
          Rate locked for 30s · You'll sign one transaction in your wallet
        </div>
      </Stack>
    </Stack>
  );
}

function WeavingLoader() {
  return (
    <div style={{ position: 'relative', width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="28" cy="28" r="24" stroke={WEAVE.hair} strokeWidth="2.5" fill="none"/>
        <circle cx="28" cy="28" r="24" stroke={WEAVE.accent} strokeWidth="2.5" fill="none"
          strokeDasharray="40 150" strokeLinecap="round"
          style={{ transformOrigin: 'center', animation: 'wspin 1.2s linear infinite' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <WeaveMark size={22} />
      </div>
    </div>
  );
}

const TERMINAL_OK  = new Set(['settled', 'completed']);
const TERMINAL_BAD = new Set(['failed', 'expired', 'refunded']);

function ScreenProcessing({
  onNext, merchant, mode, apiKey, orderId, bankDetails,
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  mode: 'fiat' | 'crypto';
  apiKey: string;
  orderId: string | null;
  bankDetails?: BankDetails | null;
}) {
  const [stage, setStage] = useState(0);
  const pollTerminated = useRef(false);
  const c = CURRENCIES[merchant.currency];

  const fiatDisplay = bankDetails?.amountToTransfer
    ? (() => {
        const raw = bankDetails.amountToTransfer!;
        const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
        return fmtMoney(Number(raw), merchant.currency, decimals);
      })()
    : fmtMoney(merchant.amount, merchant.currency);

  const stages = mode === 'fiat' ? [
    { label: 'Confirming your transfer', sub: `Matching the ${fiatDisplay} from your bank`, dur: 1600 },
    { label: 'Completing payment',       sub: `Sending to ${merchant.name}`,         dur: 2400 },
  ] : [
    { label: 'Waiting for deposit',      sub: 'Detecting your transaction on-chain', dur: 1400 },
    { label: 'Confirming your payment',  sub: `Settling ${c.name} to ${merchant.name}`, dur: 2600 },
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

    const tick = async () => {
      if (pollTerminated.current) return;
      try {
        const order = await fetchOrder(apiKey, orderId);
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
        // Advance to the confirming-payment stage once Paycrest has validated the
        // deposit (immediately before settlement). Earlier states stay on
        // "detecting on-chain".
        if (pcStatus === 'validated' || pcStatus === 'settling') {
          setStage(1);
        }
      } catch {
        // swallow transient network errors; keep polling
      }
      timer = setTimeout(tick, 5000);
    };
    tick();
    return () => {
      pollTerminated.current = true;
      clearTimeout(timer!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, apiKey]);

  const currentStage = stages[Math.min(stage, stages.length - 1)];

  return (
    <Stack gap={20} style={{ padding: '28px 20px 12px', minHeight: 360 }}>
      <Stack gap={12} style={{ alignItems: 'center', paddingTop: 12 }}>
        <WeavingLoader />
        <Stack gap={4} style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>
            {currentStage.label}
          </div>
          <div style={{ fontSize: 12.5, color: WEAVE.mute, textAlign: 'center' }}>
            {currentStage.sub}
          </div>
        </Stack>
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
              {i === stage && (
                <div style={{ width: 8, height: 8, borderRadius: 4, background: WEAVE.accent, animation: 'wpulse 1.1s ease-in-out infinite' }}/>
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

      <div style={{ fontSize: 11, color: WEAVE.mute, textAlign: 'center' }}>
        You can safely close this window. We'll email a receipt.
      </div>
    </Stack>
  );
}

function ScreenSuccess({
  onNext, merchant, balance, direction, apiKey, orderId,
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  balance: Balance;
  direction: 'offramp' | 'onramp';
  apiKey: string;
  orderId: string | null;
}) {
  const [order, setOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    fetchOrder(apiKey, orderId)
      .then((o) => { if (!cancelled) setOrder(o); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [apiKey, orderId]);

  // Source asset key looks like "crypto:BASE:USDC" or "fiat:NGN" — last segment
  // is the token/currency code we want to render.
  const sourceToken = typeof order?.sourceAssetKey === 'string'
    ? order.sourceAssetKey.split(':').pop()
    : undefined;

  const paidWith = direction === 'offramp' && order
    ? `${fmtCrypto(Number(order.sourceAmount), 4)} ${sourceToken ?? balance.token}`
    : `${fmtCrypto(balance.amount * 0.3, 4)} ${balance.token}`;

  const destBank = order?.destInstrument?.bankInstitution;
  const settledTo = direction === 'offramp'
    ? (destBank
        ? institutionName(merchant.currency, destBank)
        : CURRENCIES[merchant.currency].bank)
    : merchant.name;

  const reference = order?.id ? `wv_${String(order.id).slice(0, 10)}` : 'wv_—';

  const completedInSec = order?.createdAt && order?.updatedAt
    ? Math.max(1, Math.round((new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 1000))
    : null;
  const completedIn = completedInSec == null
    ? '—'
    : completedInSec < 60
      ? `${completedInSec}s`
      : `${Math.round(completedInSec / 60)}m`;

  return (
    <Stack gap={18} style={{ padding: '28px 20px 12px', minHeight: 360 }}>
      <Stack gap={14} style={{ alignItems: 'center', paddingTop: 8 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: WEAVE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'wpop 0.5s cubic-bezier(0.2, 1.2, 0.4, 1)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <Stack gap={4} style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
            Payment complete
          </div>
          <div style={{ fontSize: 13, color: WEAVE.mute, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>
            {direction === 'offramp' ? (
              <>{fmtMoney(merchant.amount, merchant.currency)} is on its way to <span style={{ color: WEAVE.ink }}>{merchant.name}</span>.</>
            ) : (
              <>Your payment of {fmtMoney(merchant.amount, merchant.currency)} has been sent to <span style={{ color: WEAVE.ink }}>{merchant.name}</span>.</>
            )}
          </div>
        </Stack>
      </Stack>

      <Stack gap={0} style={{ background: WEAVE.panel, border: `1px solid ${WEAVE.hair}`, borderRadius: 12, overflow: 'hidden' }}>
        <Row justify="space-between" style={{ padding: '12px 14px', fontSize: 12.5 }}>
          <span style={{ color: WEAVE.mute }}>Paid with</span>
          {direction === 'offramp' ? (
            <Row gap={6}>
              <IconDot bg={balance.chainTint} size={16}>{balance.icon}</IconDot>
              <span style={{ fontWeight: 500 }}>{paidWith}</span>
            </Row>
          ) : (
            <Row gap={6}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: '#fff', border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{CURRENCIES[merchant.currency].flag}</div>
              <span style={{ fontWeight: 500 }}>{fmtMoney(merchant.amount, merchant.currency)}</span>
            </Row>
          )}
        </Row>
        <Hair/>
        <Row justify="space-between" style={{ padding: '12px 14px', fontSize: 12.5 }}>
          <span style={{ color: WEAVE.mute }}>{direction === 'offramp' ? 'Settled to' : 'Paid to'}</span>
          <span style={{ fontWeight: 500 }}>{settledTo}</span>
        </Row>
        <Hair/>
        <Row justify="space-between" style={{ padding: '12px 14px', fontSize: 12.5 }}>
          <span style={{ color: WEAVE.mute }}>Reference</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}>{reference}</span>
        </Row>
        <Hair/>
        <Row justify="space-between" style={{ padding: '12px 14px', fontSize: 12.5 }}>
          <span style={{ color: WEAVE.mute }}>Completed in</span>
          <Row gap={6}>
            <Pill tone="good">{completedIn}</Pill>
          </Row>
        </Row>
      </Stack>

      <Stack gap={8}>
        <button onClick={() => onNext('connect')} style={primaryBtn}>
          Done
        </button>
        <button style={{ ...secondaryBtn, justifyContent: 'center', paddingLeft: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3V15M12 15L7 10M12 15L17 10M3 19H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Download receipt
        </button>
      </Stack>
    </Stack>
  );
}

function ScreenError({ onNext, onBack }: { onNext: (s: string) => void; onBack: (s: string) => void }) {
  return (
    <Stack gap={16} style={{ padding: '28px 20px 12px', minHeight: 360 }}>
      <Stack gap={14} style={{ alignItems: 'center', paddingTop: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: '#FBEEE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 8V13M12 17V17.01" stroke={WEAVE.err} strokeWidth="2.4" strokeLinecap="round"/><circle cx="12" cy="12" r="10" stroke={WEAVE.err} strokeWidth="2"/></svg>
        </div>
        <Stack gap={4} style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Transaction didn't go through</div>
          <div style={{ fontSize: 13, color: WEAVE.mute, textAlign: 'center', maxWidth: 280 }}>
            Your wallet rejected the signature or the rate expired. No funds were moved.
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
const DEPOSIT_CHAINS = [
  // Base (our primary rail — USDC first)
  { id: 'BASE',      name: 'Base',         token: 'USDC', tint: '#1C4FE0', icon: '$', network: 'Base' },
  { id: 'BASE',      name: 'Base',         token: 'ETH',  tint: '#1C4FE0', icon: 'Ξ', network: 'Base' },
  // Ethereum
  { id: 'ETHEREUM',  name: 'Ethereum',     token: 'ETH',  tint: '#627EEA', icon: 'Ξ', network: 'Ethereum' },
  { id: 'ETHEREUM',  name: 'Ethereum',     token: 'USDC', tint: '#627EEA', icon: '$', network: 'Ethereum' },
  { id: 'ETHEREUM',  name: 'Ethereum',     token: 'USDT', tint: '#627EEA', icon: 'T', network: 'Ethereum' },
  // Arbitrum / Optimism
  { id: 'ARBITRUM',  name: 'Arbitrum',     token: 'ETH',  tint: '#28A0F0', icon: 'Ξ', network: 'Arbitrum One' },
  { id: 'ARBITRUM',  name: 'Arbitrum',     token: 'USDC', tint: '#28A0F0', icon: '$', network: 'Arbitrum One' },
  { id: 'OPTIMISM',  name: 'Optimism',     token: 'ETH',  tint: '#FF0420', icon: 'Ξ', network: 'Optimism' },
  { id: 'OPTIMISM',  name: 'Optimism',     token: 'USDC', tint: '#FF0420', icon: '$', network: 'Optimism' },
  // Polygon / BSC / Avalanche
  { id: 'POLYGON',   name: 'Polygon',      token: 'POL',  tint: '#7B3FE4', icon: 'P', network: 'Polygon' },
  { id: 'POLYGON',   name: 'Polygon',      token: 'USDC', tint: '#7B3FE4', icon: '$', network: 'Polygon' },
  { id: 'BSC',       name: 'BNB Chain',    token: 'BNB',  tint: '#F0B90B', icon: 'B', network: 'BNB Smart Chain' },
  { id: 'BSC',       name: 'BNB Chain',    token: 'USDT', tint: '#F0B90B', icon: 'T', network: 'BNB Smart Chain' },
  { id: 'AVALANCHE', name: 'Avalanche',    token: 'AVAX', tint: '#E84142', icon: 'A', network: 'Avalanche C-Chain' },
  { id: 'AVALANCHE', name: 'Avalanche',    token: 'USDC', tint: '#E84142', icon: '$', network: 'Avalanche C-Chain' },
  // Other EVM L2s
  { id: 'GNOSIS',    name: 'Gnosis',       token: 'USDC', tint: '#04795B', icon: '$', network: 'Gnosis Chain' },
  { id: 'SCROLL',    name: 'Scroll',       token: 'USDC', tint: '#D9A26C', icon: '$', network: 'Scroll' },
  { id: 'XLAYER',    name: 'X Layer',      token: 'USDT', tint: '#1E1E1E', icon: 'T', network: 'X Layer' },
  { id: 'BERA',      name: 'Berachain',    token: 'BERA', tint: '#814625', icon: 'B', network: 'Berachain' },
  // Non-EVM
  { id: 'SOLANA',    name: 'Solana',       token: 'SOL',  tint: '#14F195', icon: 'S', network: 'Solana' },
  { id: 'SOLANA',    name: 'Solana',       token: 'USDC', tint: '#14F195', icon: '$', network: 'Solana' },
  { id: 'TRON',      name: 'Tron',         token: 'TRX',  tint: '#EF0027', icon: 'T', network: 'Tron' },
  { id: 'TRON',      name: 'Tron',         token: 'USDT', tint: '#EF0027', icon: 'T', network: 'Tron' },
  { id: 'NEAR',      name: 'NEAR',         token: 'NEAR', tint: '#111111', icon: 'N', network: 'NEAR' },
  { id: 'NEAR',      name: 'NEAR',         token: 'USDC', tint: '#111111', icon: '$', network: 'NEAR' },
  { id: 'TON',       name: 'TON',          token: 'TON',  tint: '#0098EA', icon: 'T', network: 'TON' },
  { id: 'TON',       name: 'TON',          token: 'USDT', tint: '#0098EA', icon: 'T', network: 'TON' },
  { id: 'SUI',       name: 'Sui',          token: 'SUI',  tint: '#4DA2FF', icon: 'S', network: 'Sui' },
  { id: 'APTOS',     name: 'Aptos',        token: 'APT',  tint: '#111111', icon: 'A', network: 'Aptos' },
  { id: 'STARKNET',  name: 'Starknet',     token: 'STRK', tint: '#EC796B', icon: 'S', network: 'Starknet' },
  // Native-coin L1s
  { id: 'BITCOIN',   name: 'Bitcoin',      token: 'BTC',  tint: '#F7931A', icon: '₿', network: 'Bitcoin' },
  { id: 'XRP',       name: 'XRP Ledger',   token: 'XRP',  tint: '#23292F', icon: 'X', network: 'XRP Ledger' },
  { id: 'STELLAR',   name: 'Stellar',      token: 'XLM',  tint: '#111111', icon: '★', network: 'Stellar' },
  { id: 'CARDANO',   name: 'Cardano',      token: 'ADA',  tint: '#0033AD', icon: '₳', network: 'Cardano' },
  { id: 'DOGE',      name: 'Dogecoin',     token: 'DOGE', tint: '#C2A633', icon: 'D', network: 'Dogecoin' },
  { id: 'LITECOIN',  name: 'Litecoin',     token: 'LTC',  tint: '#345D9D', icon: 'L', network: 'Litecoin' },
  { id: 'BCH',       name: 'Bitcoin Cash', token: 'BCH',  tint: '#8DC351', icon: 'B', network: 'Bitcoin Cash' },
  { id: 'ZEC',       name: 'Zcash',        token: 'ZEC',  tint: '#F4B728', icon: 'Z', network: 'Zcash' },
  { id: 'DASH',      name: 'Dash',         token: 'DASH', tint: '#008CE7', icon: 'D', network: 'Dash' },
];

// Chains where the deposit destination tag/memo is part of the address — dropping
// it sends the funds into the provider's pooled account and they become unrecoverable.
const MEMO_REQUIRED_CHAINS = new Set(['XRP', 'TON', 'STELLAR', 'NEAR']);

// Placeholder shown for the sender-wallet input per chain. Address shapes differ
// enough that a single hint misleads users; these are the most common formats.
const REFUND_ADDRESS_PLACEHOLDER: Record<string, string> = {
  BASE:      '0x…',
  ETHEREUM:  '0x…',
  ARBITRUM:  '0x…',
  OPTIMISM:  '0x…',
  POLYGON:   '0x…',
  BSC:       '0x…',
  AVALANCHE: '0x…',
  GNOSIS:    '0x…',
  SCROLL:    '0x…',
  XLAYER:    '0x…',
  MONAD:     '0x…',
  BERA:      '0x…',
  SOLANA:    'e.g. 5Gh8…base58',
  TRON:      'T…',
  NEAR:      'alice.near or 64-hex',
  TON:       'UQ… / EQ…',
  SUI:       '0x… (64 chars)',
  APTOS:     '0x… (64 chars)',
  STARKNET:  '0x…',
  BITCOIN:   'bc1… or 1…',
  XRP:       'r…',
  STELLAR:   'G…',
  CARDANO:   'addr1…',
  DOGE:      'D…',
  LITECOIN:  'ltc1… or L…',
  BCH:       'bitcoincash:q… or q…',
  ZEC:       't1… or zs1…',
  DASH:      'X…',
};

// EIP-681 deep-link params for ERC-20 `transfer` on EVM chains. Only populated for
// combinations we can build a strict URI for — unknown combos fall back to plain address.
const ERC20_META: Record<string, { chainId: number; contract: string; decimals: number }> = {
  'BASE:USDC':     { chainId: 8453,   contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  'OPTIMISM:USDC': { chainId: 10,     contract: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
  'ARBITRUM:USDC': { chainId: 42161,  contract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  'POLYGON:USDC':  { chainId: 137,    contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
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
  const rawUnits = BigInt(Math.round(amount * 10 ** meta.decimals));
  return `ethereum:${meta.contract}@${meta.chainId}/transfer?address=${address}&uint256=${rawUnits.toString()}`;
};

function ScreenDeposit({
  onNext, merchant, depositAddress, depositMemo, amountToSend, sourceToken, sourceChain, loading, error, onChainChange, ready, apiKey, orderId,
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
}) {
  // chainIdx stays null until the user picks a network — we don't want to
  // spin up a NEAR Intents quote / Paycrest order on mount with an arbitrary default.
  const [chainIdx, setChainIdx] = useState<number | null>(null);
  const [chainPickerOpen, setChainPickerOpen] = useState(false);
  const [chainSearch, setChainSearch] = useState('');
  const [refundAddress, setRefundAddress] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);
  const filteredChains = chainSearch.trim()
    ? DEPOSIT_CHAINS.map((c, i) => ({ c, i }))
        .filter(({ c }) => {
          const q = chainSearch.trim().toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.token.toLowerCase().includes(q) ||
            c.network.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q)
          );
        })
    : DEPOSIT_CHAINS.map((c, i) => ({ c, i }));
  const chain = chainIdx != null ? DEPOSIT_CHAINS[chainIdx] : null;
  const address = depositAddress ?? '';
  const memo = depositMemo ?? '';
  const displayToken = sourceToken ?? chain?.token ?? '';
  const fallbackUsdc = merchant.amount / CURRENCIES[merchant.currency].rate;
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
        if (status && status !== 'awaiting_deposit') {
          stopped = true;
          if (status === 'completed') onNext('success');
          else if (['failed', 'refunded'].includes(status)) onNext('error');
          else onNext('processing');
          return;
        }
      } catch {}
      timer = setTimeout(tick, 5000);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer!); };
  }, [apiKey, orderId, onNext]);

  const copy = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyMemo = () => {
    if (!memo) return;
    navigator.clipboard?.writeText(memo);
    setMemoCopied(true);
    setTimeout(() => setMemoCopied(false), 1500);
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
            <circle cx="11" cy="11" r="7" stroke={WEAVE.mute} strokeWidth="2"/>
            <path d="M20 20L16 16" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round"/>
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
              <button key={`${c.id}:${c.token}`} onClick={() => { setChainIdx(i); setChainPickerOpen(false); setChainSearch(''); }} style={{
                width: '100%', padding: '10px 10px', borderRadius: 7,
                background: i === chainIdx ? WEAVE.accentSoft : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              }}>
                <IconDot bg={c.tint} size={24}>{c.icon}</IconDot>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.token} on {c.name}</div>
                  <div style={{ fontSize: 10.5, color: WEAVE.mute }}>{c.network}</div>
                </div>
                {i === chainIdx && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke={WEAVE.accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
              <IconDot bg={chain.tint} size={26}>{chain.icon}</IconDot>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke={WEAVE.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                <QRCodeSVG value={qrPayload} size={120} level="M" includeMargin={false}/>
              ) : (
                <div style={{
                  width: 120, height: 120, borderRadius: 6,
                  background: WEAVE.panel, border: `1px dashed ${WEAVE.hair}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" style={{ animation: 'wspin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="9" stroke={WEAVE.hair} strokeWidth="2.5" fill="none"/>
                    <circle cx="12" cy="12" r="9" stroke={WEAVE.accent} strokeWidth="2.5" fill="none"
                      strokeDasharray="18 60" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: 10.5, color: WEAVE.mute, letterSpacing: 0.3 }}>Preparing QR…</div>
                </div>
              )}
            </div>
            <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
              <Stack gap={2}>
                <div style={{ fontSize: 10.5, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>Amount</div>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
                  {fmtCrypto(displayAmount, 8)} {displayToken}
                </div>
                <div style={{ fontSize: 11, color: WEAVE.mute }}>
                  on {chain.name}
                </div>
              </Stack>
              <div style={{ fontSize: 10.5, color: WEAVE.mute, lineHeight: 1.4 }}>
                Rate locked for <span style={{ color: WEAVE.ink, fontWeight: 500 }}>9:42</span>
              </div>
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 8V5C16 4.45 15.55 4 15 4H5C4.45 4 4 4.45 4 5V15C4 15.55 4.45 16 5 16H8" stroke="currentColor" strokeWidth="2"/></svg>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 8V5C16 4.45 15.55 4 15 4H5C4.45 4 4 4.45 4 5V15C4 15.55 4.45 16 5 16H8" stroke="currentColor" strokeWidth="2"/></svg>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2L2 20H22L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 10V13M12 16V16.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <span>Only send <b>{chain.token}</b> on the <b>{chain.name}</b> network. Sending other assets or from a different network may result in loss.</span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', background: '#fff',
            border: `1px solid ${WEAVE.hair}`, borderRadius: 10,
          }}>
            <div style={{ position: 'relative', width: 10, height: 10 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: WEAVE.accent }}/>
              <div style={{ position: 'absolute', inset: -3, borderRadius: 8, background: WEAVE.accent, opacity: 0.25, animation: 'wpulse 1.6s ease-in-out infinite' }}/>
            </div>
            <div style={{ flex: 1, fontSize: 12, color: WEAVE.ink2 }}>
              Watching for deposit on {chain.name}…
            </div>
            <button onClick={() => ready && onNext('processing')} disabled={!ready} style={{
              fontSize: 11, color: ready ? WEAVE.mute : WEAVE.hair, background: 'transparent',
              border: 'none', cursor: ready ? 'pointer' : 'not-allowed', fontFamily: 'inherit', textDecoration: 'underline',
            }}>
              Simulate
            </button>
          </div>
        </>
      )}
    </Stack>
  );
}

// ── Refund account ───────────────────────────────────────────────────────────

interface RefundAccount {
  institution:       string;
  accountIdentifier: string;
  accountName:       string;
}

interface Institution {
  code: string;
  name: string;
}

const INSTITUTIONS_BY_CUR: Record<string, Institution[]> = {
  NGN: [
    { code: 'GTBINGLA',   name: 'Guaranty Trust Bank' },
    { code: 'FBNINGLA',   name: 'First Bank of Nigeria' },
    { code: 'ZEIBNGLA',   name: 'Zenith Bank' },
    { code: 'ABNGNGLA',   name: 'Access Bank' },
    { code: 'UBNINGLA',   name: 'Union Bank' },
    { code: 'STBKNGLA',   name: 'Stanbic IBTC Bank' },
    { code: 'FCMBNGLA',   name: 'First City Monument Bank' },
    { code: 'FIDTNGLA',   name: 'Fidelity Bank' },
    { code: 'ECOBNGLA',   name: 'Ecobank Nigeria' },
    { code: 'WEMANGLA',   name: 'Wema Bank' },
    { code: 'KUDANGPC',   name: 'Kuda Bank' },
    { code: 'OPAYNGPC',   name: 'OPay' },
    { code: 'MONINGPC',   name: 'Moniepoint' },
  ],
};

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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1, color: WEAVE.mute }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8V13M12 16V16.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
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
  ref: string;
}

const VA_BY_CUR: Record<string, VirtualAccount> = {
  NGN: { bank: 'Wema Bank', accountNumber: '8203 7461 92', accountName: 'Weave / Afriloom-0481', ref: 'WV-8F3A-21BC' },
};

export interface BankDetails {
  institution:       string;
  accountIdentifier: string;
  accountName:       string;
  amountToTransfer?: string;
  currency?:         string;
  validUntil?:       string;
  reference?:        string;
}

function institutionName(currency: string, code: string): string {
  const match = (INSTITUTIONS_BY_CUR[currency] ?? []).find((b) => b.code === code);
  return match?.name ?? code;
}

function ScreenVirtualAccount({
  onNext, merchant, bankDetails, apiKey, orderId,
}: {
  onNext: (s: string) => void;
  merchant: Merchant;
  bankDetails: BankDetails | null;
  apiKey: string;
  orderId: string | null;
}) {
  const c = CURRENCIES[merchant.currency];
  const va = bankDetails
    ? {
        bank:          institutionName(merchant.currency, bankDetails.institution),
        accountNumber: bankDetails.accountIdentifier,
        accountName:   bankDetails.accountName,
        ref:           bankDetails.reference ?? VA_BY_CUR[merchant.currency].ref,
      }
    : VA_BY_CUR[merchant.currency];
  const displayAmount = bankDetails?.amountToTransfer
    ? (() => {
        const raw = bankDetails.amountToTransfer;
        const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
        return fmtMoney(Number(raw), merchant.currency, decimals);
      })()
    : fmtMoney(merchant.amount, merchant.currency);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mins, setMins] = useState(9);
  const [secs, setSecs] = useState(42);

  useEffect(() => {
    const t = setInterval(() => {
      setSecs((s) => {
        if (s > 0) return s - 1;
        setMins((m) => Math.max(0, m - 1));
        return 59;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

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
          if (status === 'completed')       onNext('success');
          else if (['failed', 'refunded'].includes(status)) onNext('error');
          else                              onNext('processing');
          return;
        }
      } catch {}
      timer = setTimeout(tick, 5000);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer!); };
  }, [apiKey, orderId, onNext]);

  const copy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1400);
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
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
          <Pill tone="warn">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ marginRight: 2 }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 7V12L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            {mins}:{String(secs).padStart(2, '0')}
          </Pill>
        </Row>
        <div style={{ fontSize: 12.5, color: WEAVE.mute, lineHeight: 1.5 }}>
          Open your bank app and transfer to this account. We'll confirm your payment automatically — no need to send proof.
        </div>
      </Stack>

      <div style={{ background: '#fff', border: `1px solid ${WEAVE.hair}`, borderRadius: 12, overflow: 'hidden' }}>
        <Row gap={10} style={{ padding: '12px 14px', background: WEAVE.panel, borderBottom: `1px solid ${WEAVE.hair}` }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: '#fff', border: `1px solid ${WEAVE.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: WEAVE.ink }}>
            {c.flag}
          </div>
          <Stack gap={1} style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{va.bank}</div>
            <div style={{ fontSize: 11, color: WEAVE.mute }}>Virtual account · one-time · {merchant.currency}</div>
          </Stack>
        </Row>
        <Field label="Account number" value={va.accountNumber} k="acc"/>
        <Hair/>
        <Field label="Account name" value={va.accountName} k="name" mono={false}/>
        <Hair/>
        <Field label="Amount" value={displayAmount} k="amt" mono={false}/>
        <Hair/>
        <Field label="Reference (required)" value={va.ref} k="ref"/>
      </div>

      <div style={{
        background: WEAVE.warnSoft, border: `1px solid ${WEAVE.warn}22`,
        borderRadius: 10, padding: '10px 12px',
        display: 'flex', gap: 10, fontSize: 11.5, color: WEAVE.warn, lineHeight: 1.5,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2L2 20H22L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 10V13M12 16V16.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        <span>Send the exact amount and include the reference. Any difference or missing reference will delay delivery.</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', background: '#fff',
        border: `1px solid ${WEAVE.hair}`, borderRadius: 10,
      }}>
        <div style={{ position: 'relative', width: 10, height: 10 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: WEAVE.accent }}/>
          <div style={{ position: 'absolute', inset: -3, borderRadius: 8, background: WEAVE.accent, opacity: 0.25, animation: 'wpulse 1.6s ease-in-out infinite' }}/>
        </div>
        <div style={{ flex: 1, fontSize: 12, color: WEAVE.ink2 }}>
          Waiting for your transfer… this usually takes under a minute.
        </div>
        <button onClick={() => onNext('processing')} style={{
          fontSize: 11, color: WEAVE.mute, background: 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
        }}>
          Simulate
        </button>
      </div>
    </Stack>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────

export interface WeaveCheckoutProps {
  merchant?: Merchant;
  apiKey?: string;
  userAddress?: string;
  onSuccess?: (txn: { orderId: string; status: string }) => void;
  onError?: (err: Error) => void;
}

const DEFAULT_MERCHANT: Merchant = {
  name: 'Afriloom Textiles',
  amount: 700,
  currency: 'NGN',
};

const CHAIN_TO_API: Record<string, string> = {
  Base:     'BASE',
  Optimism: 'OPTIMISM',
  Ethereum: 'ETHEREUM',
  Arbitrum: 'ARBITRUM',
  Polygon:  'POLYGON',
};

export function WeaveCheckout({
  merchant = DEFAULT_MERCHANT,
  apiKey: propApiKey,
  userAddress: propUserAddress,
  onSuccess,
  onError,
}: WeaveCheckoutProps) {
  const apiKey =
    propApiKey ?? (import.meta.env?.VITE_WEAVE_API_KEY as string | undefined) ?? 'pk_test_123';
  const userAddress =
    propUserAddress
    ?? (import.meta.env?.VITE_WEAVE_DEMO_USER_ADDRESS as string | undefined)
    ?? '0x0000000000000000000000000000000000000000';

  const [screen, setScreen] = useState('connect');
  const [direction, setDirection] = useState<'offramp' | 'onramp'>('offramp');
  const [selectedBalance, setSelectedBalance] = useState<number | null>(0);
  const [closed, setClosed] = useState(false);
  const [refundAccount, setRefundAccount] = useState<RefundAccount>({
    institution:       '',
    accountIdentifier: '',
    accountName:       '',
  });
  const [orderId, setOrderId] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
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
  const depositReq = useRef(0);
  const quoteReq = useRef(0);

  const handleMethodPick = (method: PathPick) => {
    setApiError(null);
    setOrderId(null);
    setDepositAddress(null);
    setDepositMemo(null);
    setDepositError(null);
    setBankDetails(null);
    setQuote(null);
    if (method === 'fiat') {
      setDirection('onramp');
      setScreen('refundAccount');
    } else if (method === 'crypto') {
      setDirection('offramp');
      setScreen('wallet');
    } else if (method === 'deposit') {
      setDirection('offramp');
      setScreen('deposit');
    }
  };

  const onDepositChainChange = async (apiChain: string, token: string, refundAddr: string) => {
    const myReq = ++depositReq.current;
    setDepositLoading(true);
    setDepositError(null);
    setDepositAddress(null);
    setDepositMemo(null);
    setDepositAmount(null);
    setDepositToken(null);
    setDepositChain(null);
    try {
      const from = cryptoKey(apiChain, token);
      const to   = fiatKey(merchant.currency);
      // Merchant quotes in their own currency; convert to the crypto amount
      // the user needs to send before creating the order.
      const q = await fetchQuote(apiKey, {
        from, to, amount: merchant.amount, amountIn: 'dest',
      });
      // External flow: sender identity is unknown at order-creation time. We
      // omit walletAddress on the source instrument and pass the user-provided
      // refund wallet as a dedicated top-level field so the backend wires it
      // straight into NEAR Intents' refundTo without conflating the two roles.
      const source: { inline: InlineWalletInstrument } = {
        inline: { kind: 'crypto_wallet', assetKey: from, walletAddress: '' },
      };
      const res = await createOrder(apiKey, {
        source,
        // Deposit amount is source-asset-denominated (e.g. SOL), NOT USD.
        // The backend feeds this straight into NEAR Intents as amountIn.
        amount: q.breakdown.sourceAmount,
        refundAddress: refundAddr,
      });
      if (depositReq.current !== myReq) return;
      setOrderId(res.order.id);
      setDepositAddress(res.nextAction.depositAddress ?? null);
      setDepositMemo(res.nextAction.depositMemo ?? null);
      setDepositAmount(typeof res.nextAction.amount === 'number' ? res.nextAction.amount : null);
      setDepositToken(res.nextAction.token ?? token);
      setDepositChain(res.nextAction.chain ?? apiChain);
    } catch (e: any) {
      if (depositReq.current !== myReq) return;
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
        from:     cryptoKey(CHAIN_TO_API[bal.chain] ?? bal.chain, bal.token),
        to:       fiatKey(merchant.currency),
        amount:   merchant.amount,
        amountIn: 'dest',
      });
      if (quoteReq.current !== myReq) return;
      // Project the new Quote shape onto ScreenQuote's OfframpQuote contract
      // so the UI stays untouched.
      setQuote({
        estimatedFiat: q.estimatedDest,
        netUsdc:       q.breakdown.netUsd,
        fiatCurrency:  merchant.currency,
        breakdown: {
          inputAmount:  q.breakdown.usdEquivalent,
          inputToken:   bal.token,
          fastPath:     q.route.steps.length === 1,
          bridgeFeeUsd: q.breakdown.bridgeFeeUsd,
          senderFeeUsd: q.breakdown.senderFeeUsd,
          appFeeUsd:    q.breakdown.appFeeUsd,
          sellRate:     q.breakdown.sellRate ?? 0,
        },
      });
    } catch {
      // Keep fallback math; swallow so UI stays usable
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

  const submitRefundAccount = async () => {
    setSubmitting(true);
    setApiError(null);
    try {
      const source: { inline: InlineBankInstrument } = {
        inline: {
          kind:                  'bank_account',
          assetKey:              fiatKey(merchant.currency),
          bankInstitution:       refundAccount.institution,
          bankAccountIdentifier: refundAccount.accountIdentifier,
          bankAccountName:       refundAccount.accountName,
        },
      };
      const res = await createOrder(apiKey, { source, amount: merchant.amount });
      setOrderId(res.order.id);
      setBankDetails(res.nextAction.bankDetails ?? null);
      setScreen('vaccount');
    } catch (e: any) {
      setApiError(e.message ?? 'Failed to create order');
      onError?.(e);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmOfframp = async () => {
    const bal = BALANCES[selectedBalance ?? 0];
    setSubmitting(true);
    setApiError(null);
    try {
      const from = cryptoKey(CHAIN_TO_API[bal.chain] ?? bal.chain, bal.token);
      const to   = fiatKey(merchant.currency);
      const q = await fetchQuote(apiKey, {
        from, to, amount: merchant.amount, amountIn: 'dest',
      });
      const source: { inline: InlineWalletInstrument } = {
        inline: { kind: 'crypto_wallet', assetKey: from, walletAddress: userAddress },
      };
      const res = await createOrder(apiKey, { source, amount: q.breakdown.sourceAmount });
      setOrderId(res.order.id);
      setDepositAddress(res.nextAction.depositAddress ?? null);
      setScreen('processing');
    } catch (e: any) {
      setApiError(e.message ?? 'Failed to create order');
      onError?.(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (closed) {
    return (
      <div style={{
        position: 'absolute', bottom: 24, right: 24, zIndex: 10,
        background: WEAVE.ink, color: '#fff',
        padding: '10px 16px', borderRadius: 999, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      }} onClick={() => setClosed(false)}>
        <WeaveMark size={16} />
        Pay with Weave
      </div>
    );
  }

  const balance = BALANCES[selectedBalance ?? 0];
  const isOnramp = direction === 'onramp';

  const retry = (target: string) => {
    setOrderId(null);
    setApiError(null);
    setBankDetails(null);
    setDepositAddress(null);
    setDepositMemo(null);
    setDepositError(null);
    setQuote(null);
    setScreen(target);
  };

  const body = (() => {
    if (screen === 'connect') return <ScreenConnect onPick={handleMethodPick} merchant={merchant}/>;
    if (isOnramp) {
      if (screen === 'refundAccount') return <ScreenRefundAccount merchant={merchant} value={refundAccount} onChange={setRefundAccount} onSubmit={submitRefundAccount} submitting={submitting} error={apiError}/>;
      if (screen === 'vaccount')   return <ScreenVirtualAccount onNext={advance} merchant={merchant} bankDetails={bankDetails} apiKey={apiKey} orderId={orderId}/>;
      if (screen === 'processing') return <ScreenProcessing onNext={advance} merchant={merchant} mode="fiat" apiKey={apiKey} orderId={orderId} bankDetails={bankDetails}/>;
      if (screen === 'success')    return <ScreenSuccess onNext={advance} balance={balance} merchant={merchant} direction={direction} apiKey={apiKey} orderId={orderId}/>;
      if (screen === 'error')      return <ScreenError onNext={() => retry('connect')} onBack={() => retry('refundAccount')}/>;
    } else {
      if (screen === 'deposit')    return <ScreenDeposit onNext={advance} merchant={merchant} depositAddress={depositAddress} depositMemo={depositMemo} amountToSend={depositAmount} sourceToken={depositToken} sourceChain={depositChain} loading={depositLoading} error={depositError} onChainChange={onDepositChainChange} ready={!!orderId && !!depositAddress && !depositLoading} apiKey={apiKey} orderId={orderId}/>;
      if (screen === 'wallet')     return <ScreenBalances onNext={() => advanceToQuote()} merchant={merchant} balances={BALANCES} selected={selectedBalance} setSelected={setSelectedBalance}/>;
      if (screen === 'quote')      return <ScreenQuote merchant={merchant} balance={balance} onConfirm={confirmOfframp} submitting={submitting} error={apiError} quote={quote} quoteLoading={quoteLoading}/>;
      if (screen === 'processing') return <ScreenProcessing onNext={advance} merchant={merchant} mode="crypto" apiKey={apiKey} orderId={orderId}/>;
      if (screen === 'success')    return <ScreenSuccess onNext={advance} balance={balance} merchant={merchant} direction={direction} apiKey={apiKey} orderId={orderId}/>;
      if (screen === 'error')      return <ScreenError onNext={() => retry('connect')} onBack={() => retry('quote')}/>;
    }
    return null;
  })();

  const showBack =
    (['wallet', 'quote', 'deposit'].includes(screen) && !isOnramp) ||
    (['refundAccount', 'vaccount'].includes(screen) && isOnramp);
  const backTarget =
    screen === 'quote'    ? 'wallet' :
    screen === 'vaccount' ? 'refundAccount' :
                            'connect';

  return (
    <div style={{
      width: 400,
      background: WEAVE.surface,
      borderRadius: 16,
      boxShadow: '0 30px 80px rgba(11, 15, 14, 0.22), 0 0 0 1px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      color: WEAVE.ink,
      animation: 'wslide 0.35s cubic-bezier(0.2, 1, 0.3, 1)',
    }}>
      <WidgetHeader
        merchantName={merchant.name}
        onClose={() => setClosed(true)}
        showBack={showBack}
        onBack={() => setScreen(backTarget)}
      />
      <div key={screen} style={{ animation: 'wfade 0.25s ease' }}>
        {body}
      </div>
      <WidgetFooter/>
    </div>
  );
}
