'use client';

import type { ProgressStep } from '@weave/shared';

export function CashoutProgressTimeline({
  steps,
  accent,
  ink,
  mute,
  hair,
}: {
  steps: ProgressStep[];
  accent: string;
  ink: string;
  mute: string;
  hair: string;
}) {
  const explorer = steps.find(s => s.explorerUrl)?.explorerUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {explorer && (
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, fontWeight: 600, color: accent, textAlign: 'center', marginBottom: 12, textDecoration: 'none' }}
        >
          View on Stellar Explorer →
        </a>
      )}
      {steps.map(s => {
        const done = s.state === 'done';
        const active = s.state === 'active';
        return (
          <div key={s.id} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
            <div style={{
              width: 22, height: 22, borderRadius: 11, flexShrink: 0,
              background: done ? accent : '#fff',
              border: done ? 'none' : `1.5px solid ${active ? accent : hair}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12L10 17L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {active && !done && (
                <div style={{ width: 8, height: 8, borderRadius: 4, background: accent, opacity: 0.85 }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: done || active ? ink : mute }}>{s.label}</div>
              <div style={{ fontSize: 12, color: mute, lineHeight: 1.45, marginTop: 2 }}>
                {done ? 'Done' : active ? s.sub : 'Up next'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
