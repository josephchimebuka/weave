// Maps raw audit `action` strings to human-friendly display — a label, a
// severity tone, a category, and a description derived from the event metadata.
// Shared by the audit-log client view and the CSV export route, so this module
// must stay free of any client- or server-only imports.

export type Severity = 'success' | 'info' | 'sensitive' | 'critical';
export type Category = 'security' | 'settlements' | 'api' | 'compliance' | 'account' | 'payments';

export interface AuditEvent {
  id: string;
  action: string;
  actorType: 'merchant' | 'admin' | 'system';
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  // Admin (platform-wide) view only:
  ip?: string | null;
  userAgent?: string | null;
  device?: string | null;
  merchantId?: string | null;
  merchant?: { id: string; email: string; name: string } | null;
}

interface ActionMeta {
  label: string;
  severity: Severity;
  category: Category;
  describe?: (m: Record<string, unknown> | null | undefined) => string;
}

const s = (m: Record<string, unknown> | null | undefined, k: string): string =>
  m && m[k] != null ? String(m[k]) : '';

const ACTIONS: Record<string, ActionMeta> = {
  'payout.updated': {
    label: 'Payout destination updated', severity: 'sensitive', category: 'settlements',
    describe: (m) =>
      s(m, 'kind') === 'bank_account'
        ? `${s(m, 'bankInstitution') || 'Bank'} ····${s(m, 'accountLast4')}`.trim()
        : s(m, 'walletTail') ? `Wallet ····${s(m, 'walletTail')}` : '',
  },
  'key.regenerated': {
    label: 'API keys regenerated', severity: 'sensitive', category: 'api',
    describe: (m) => (s(m, 'mode') ? `${s(m, 'mode')} keys` : ''),
  },
  'webhook.secret_rotated': { label: 'Webhook signing secret rotated', severity: 'sensitive', category: 'api' },
  'webhook.config_updated': {
    label: 'Webhook endpoint updated', severity: 'info', category: 'api',
    describe: (m) => s(m, 'url') || 'Endpoint cleared',
  },
  'profile.updated': {
    label: 'Business profile updated', severity: 'info', category: 'account',
    describe: (m) => (s(m, 'name') ? `Name → ${s(m, 'name')}` : ''),
  },
  'merchant.deletion_requested': {
    label: 'Account deletion requested', severity: 'critical', category: 'account',
    describe: (m) => s(m, 'reason'),
  },
  'link.created': {
    label: 'Payment link created', severity: 'info', category: 'payments',
    describe: (m) => s(m, 'title'),
  },
  'link.deleted': {
    label: 'Payment link deleted', severity: 'info', category: 'payments',
    describe: (m) => s(m, 'title'),
  },
  'link.updated': {
    label: 'Payment link updated', severity: 'info', category: 'payments',
    describe: (m) => {
      const changed = Array.isArray((m as Record<string, unknown>)?.changed)
        ? ((m as Record<string, unknown>).changed as unknown[]).join(', ')
        : '';
      return [s(m, 'title'), changed].filter(Boolean).join(' · ');
    },
  },
  'kyb.submitted': { label: 'KYB submitted for review', severity: 'info', category: 'compliance' },
  'kyb.approved': { label: 'KYB approved', severity: 'success', category: 'compliance' },
  'kyb.rejected': {
    label: 'KYB rejected', severity: 'sensitive', category: 'compliance',
    describe: (m) => s(m, 'reason'),
  },
  'email.verified': {
    label: 'Email verified', severity: 'success', category: 'security',
    describe: (m) => s(m, 'email'),
  },
  'auth.signup': {
    label: 'Account created', severity: 'info', category: 'security',
    describe: (m) => s(m, 'email'),
  },
  'auth.login_failed': {
    label: 'Failed sign-in attempt', severity: 'critical', category: 'security',
    describe: (m) =>
      s(m, 'reason') === 'unknown_email' ? 'Unknown email'
      : s(m, 'reason') === 'bad_password' ? 'Incorrect password' : '',
  },
  'auth.password_reset': {
    label: 'Password reset', severity: 'sensitive', category: 'security',
    describe: (m) => s(m, 'email'),
  },
  'auth.login': {
    label: 'Signed in', severity: 'info', category: 'security',
    describe: (m) => s(m, 'email'),
  },
  'kyb.document_viewed': {
    label: 'KYB document viewed', severity: 'sensitive', category: 'compliance',
    describe: (m) => (s(m, 'docType') ? `${s(m, 'docType')} (#${s(m, 'docIndex')})` : `Document #${s(m, 'docIndex')}`),
  },
  'checkout_session.created': {
    label: 'Checkout session created', severity: 'info', category: 'payments',
    describe: (m) => (s(m, 'reference') ? `Ref ${s(m, 'reference')}` : ''),
  },
  'checkout_session.completed': {
    label: 'Checkout session completed', severity: 'success', category: 'payments',
  },
};

export function actionMeta(action: string): ActionMeta {
  return ACTIONS[action] ?? { label: action, severity: 'info', category: 'account' };
}

export function describeEvent(e: AuditEvent): string {
  return actionMeta(e.action).describe?.(e.metadata) ?? '';
}

// Actor label. For the merchant's own log every actor is themselves; pass the
// current merchant name as the fallback. Admin-initiated and system events are
// labelled explicitly.
export function actorLabel(e: AuditEvent, ownName?: string): string {
  if (e.actorType === 'admin') return 'Weave admin';
  if (e.actorType === 'system') return 'Weave system';
  // A merchant actor: use the attached merchant (platform view), else the
  // supplied own-account name (own view). Never fall back to the viewer's name
  // in the platform view — an orphan event (e.g. failed login with an unknown
  // email) has no known actor.
  return e.merchant?.name ?? ownName ?? 'Unknown';
}

export const SEVERITY_STYLE: Record<Severity, { chip: string; dot: string; label: string }> = {
  success:   { chip: 'bg-forest-surface text-forest-deep', dot: 'bg-forest', label: 'Success' },
  info:      { chip: 'bg-cream-deep text-ink-soft', dot: 'bg-ink-faint', label: 'Info' },
  sensitive: { chip: 'bg-tan-mist text-tan-deep', dot: 'bg-tan', label: 'Sensitive' },
  critical:  { chip: 'bg-terracotta-soft text-terracotta', dot: 'bg-terracotta', label: 'Critical' },
};

export const CATEGORIES: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'All events' },
  { key: 'security', label: 'Security' },
  { key: 'settlements', label: 'Settlements' },
  { key: 'api', label: 'API & webhooks' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'payments', label: 'Payments' },
  { key: 'account', label: 'Account' },
];
