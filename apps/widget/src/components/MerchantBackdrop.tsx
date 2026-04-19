const WEAVE = {
  ink: '#0B0F0E',
  ink2: '#3A4240',
  mute: '#6B7572',
  hair: '#E8EAE6',
  page: '#F5F4EF',
} as const;

const CURRENCY_SYMBOL: Record<string, string> = { NGN: '₦' };

const fmt = (n: number, cur: string) =>
  `${CURRENCY_SYMBOL[cur] ?? ''}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`;

export interface MerchantBackdropProps {
  currency?: string;
  amount?: number;
}

export function MerchantBackdrop({ currency = 'NGN', amount = 150000 }: MerchantBackdropProps) {
  const items = [
    { name: 'Ẹ̀wà Handwoven Throw', sub: 'Indigo / 150 × 200cm', price: 120000 },
    { name: 'Aso-Oke Runner', sub: 'Earth / 35 × 180cm', price: 25000 },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: WEAVE.page,
      fontFamily: 'Inter, -apple-system, sans-serif',
      color: WEAVE.ink,
      overflow: 'hidden',
    }}>
      <div style={{
        height: 56, padding: '0 32px', borderBottom: `1px solid ${WEAVE.hair}`,
        display: 'flex', alignItems: 'center', background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: '#2B1810', color: '#F5DEB3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, fontFamily: 'Georgia, serif',
          }}>A</div>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.1 }}>Afriloom</span>
          <span style={{ color: WEAVE.mute, fontSize: 13, marginLeft: 16 }}>Shop · Journal · About</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 13, color: WEAVE.ink2 }}>
          <span>Search</span><span>Account</span><span>Cart (2)</span>
        </div>
      </div>

      <div style={{ display: 'flex', padding: '32px 32px', gap: 40, height: 'calc(100% - 56px)' }}>
        <div style={{ flex: '0 0 340px' }}>
          <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
            Order summary
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: `1px solid ${WEAVE.hair}` }}>
              <div style={{
                width: 60, height: 72, borderRadius: 6, flexShrink: 0,
                background: i === 0
                  ? 'repeating-linear-gradient(90deg, #2D3E60 0 6px, #1F2D45 6px 12px, #3A4F75 12px 16px)'
                  : 'repeating-linear-gradient(0deg, #8B6D47 0 4px, #6B5236 4px 8px, #A8855D 8px 14px)',
              }}/>
              <div style={{ flex: 1, fontSize: 12.5 }}>
                <div style={{ fontWeight: 500 }}>{item.name}</div>
                <div style={{ color: WEAVE.mute, fontSize: 11.5, marginTop: 2 }}>{item.sub}</div>
                <div style={{ marginTop: 4 }}>{fmt(item.price, currency)}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: '12px 0', fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: WEAVE.mute }}>
              <span>Subtotal</span><span>{fmt(145000, currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: WEAVE.mute }}>
              <span>Shipping</span><span>{fmt(5000, currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14, marginTop: 6, color: WEAVE.ink }}>
              <span>Total</span><span>{fmt(amount, currency)}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, maxWidth: 440 }}>
          <div style={{ fontSize: 11, color: WEAVE.mute, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
            Payment
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.4 }}>
            <div style={{ height: 42, border: `1px solid ${WEAVE.hair}`, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, color: WEAVE.mute }}>Email</div>
            <div style={{ height: 42, border: `1px solid ${WEAVE.hair}`, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, color: WEAVE.mute }}>Card number</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, height: 42, border: `1px solid ${WEAVE.hair}`, borderRadius: 8, background: '#fff' }}/>
              <div style={{ flex: 1, height: 42, border: `1px solid ${WEAVE.hair}`, borderRadius: 8, background: '#fff' }}/>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(11, 15, 14, 0.35)',
        backdropFilter: 'blur(1px)',
      }}/>
    </div>
  );
}
