'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, CheckCircle2, XCircle, X } from 'lucide-react';

export type NoticeTone = 'info' | 'warning' | 'error' | 'success';

type ToneStyle = {
  wrap: string;
  icon: string;
  Icon: typeof Info;
};

// Tone → design-token classes. Uses the dashboard's natural palette so a banner
// always reads as part of the system, never a bolt-on alert.
const TONES: Record<NoticeTone, ToneStyle> = {
  info:    { wrap: 'bg-forest-mist border-forest-light text-forest-deep',        icon: 'text-forest',      Icon: Info },
  warning: { wrap: 'bg-tan-mist border-hair-strong text-tan-deep',              icon: 'text-tan-deep',    Icon: AlertTriangle },
  error:   { wrap: 'bg-terracotta-soft border-terracotta/40 text-[#6E2A24]',    icon: 'text-terracotta',  Icon: XCircle },
  success: { wrap: 'bg-forest-surface border-forest-light text-forest-deep',    icon: 'text-forest',      Icon: CheckCircle2 },
};

export type NoticeBannerProps = {
  /** Visual tone. Defaults to `info`. */
  tone?: NoticeTone;
  /** Optional bold lead-in shown before the message. */
  title?: string;
  /** The notice body. Plain string or any node. */
  message: React.ReactNode;
  /** Show a close button. Requires `storageKey` to remember the dismissal. */
  dismissible?: boolean;
  /**
   * localStorage key that remembers a dismissal across reloads. Bump the suffix
   * (e.g. `paystack-outage-2` ) to re-show a banner after editing its message.
   */
  storageKey?: string;
  /** Optional trailing call-to-action link. */
  action?: { label: string; href: string };
  className?: string;
};

/**
 * Agnostic dashboard notice banner. Reuse it for any transient message —
 * outages, migrations, launches — by passing a different `tone` + `message`.
 *
 *   <NoticeBanner tone="warning" title="Service notice" message="…" />
 *   <NoticeBanner tone="success" message="…" dismissible storageKey="x-launch" />
 */
export function NoticeBanner({
  tone = 'info',
  title,
  message,
  dismissible = false,
  storageKey,
  action,
  className = '',
}: NoticeBannerProps) {
  const canPersist = dismissible && !!storageKey;
  // Start hidden when we may have a stored dismissal, to avoid a flash before
  // the effect reads localStorage. Non-persistent banners render immediately.
  const [hidden, setHidden] = useState(canPersist);

  useEffect(() => {
    if (!canPersist) return;
    try {
      setHidden(localStorage.getItem(`weave-notice-${storageKey}`) === '1');
    } catch {
      setHidden(false);
    }
  }, [canPersist, storageKey]);

  if (hidden) return null;

  const t = TONES[tone] ?? TONES.info;
  const Icon = t.Icon;

  const dismiss = () => {
    setHidden(true);
    if (storageKey) {
      try { localStorage.setItem(`weave-notice-${storageKey}`, '1'); } catch { /* ignore */ }
    }
  };

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${t.wrap} ${className}`}
    >
      <Icon size={17} strokeWidth={2} className={`mt-0.5 shrink-0 ${t.icon}`} aria-hidden />
      <div className="flex-1 min-w-0">
        {title && <span className="font-semibold">{title}. </span>}
        <span>{message}</span>
        {action && (
          <>
            {' '}
            <Link href={action.href} className="font-semibold underline underline-offset-2 hover:opacity-80">
              {action.label}
            </Link>
          </>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="mt-0.5 -mr-1 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
