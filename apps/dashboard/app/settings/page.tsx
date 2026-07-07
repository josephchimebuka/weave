'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound, Copy, Eye, EyeOff, Webhook, Plus, Palette,
  FileText, ShoppingBag, Pencil, Check, User, Mail, Building2, Save,
  Wallet, Landmark, AlertTriangle, X, Trash2,
  Shield
} from 'lucide-react';
import { createPortal } from 'react-dom';

type ThemePreset = 'organic' | 'minimal';
type AccentKey   = 'forest' | 'tan' | 'ink';
type CodeTab     = 'html' | 'react';
type SettingsTab = 'developer' | 'profile' | 'payouts';

import { WeaveCheckout } from '@weave-sdk/widget';
import { apiFetch } from '../lib/api-fetch';
import { toast } from '../components/Toaster';

const ACCENT_OPTIONS: { key: AccentKey; hex: string; swatchClass: string }[] = [
  { key: 'forest', hex: '#3D6B50', swatchClass: 'bg-forest' },
  { key: 'tan',    hex: '#B8935A', swatchClass: 'bg-tan' },
  { key: 'ink',    hex: '#1C1B17', swatchClass: 'bg-ink' },
];

const REACT_SNIPPET = `<script src="https://unpkg.com/@weave-sdk/widget/dist/umd.js"></script>

<div id="weave-checkout"></div>

<script>
  Weave.mount('#weave-checkout', {
    apiKey: 'pk_live_...',
    theme: 'organic',
    accentColor: '#3D6B50',
    borderRadius: 12,
    merchant: {
      name: 'My Store',
      amount: 45.00,
      currency: 'NGN'
    }
  });
</script>`;

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-cream-deep/20 h-96 rounded-3xl" />}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTabUrl = searchParams.get('tab');
  const initialTab: SettingsTab = ['profile', 'payouts'].includes(initialTabUrl ?? '') ? (initialTabUrl as SettingsTab) : 'developer';

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Developer tab state
  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied]               = useState<string | null>(null);
  const [theme, setTheme]                 = useState<ThemePreset>('organic');
  const [radius, setRadius]               = useState(65);
  const [accent, setAccent]               = useState<AccentKey>('forest');
  const [codeTab, setCodeTab]             = useState<CodeTab>('html');
  const [publicKey, setPublicKey]         = useState<string | null>(null);
  const [secretKey, setSecretKey]         = useState<string | null>(null);
  const [keysLoading, setKeysLoading]     = useState(true);
  const [regenerating, setRegenerating]   = useState(false);

  // Sandbox secret is only returned once, right after (re)generation.
  const [sandboxSecretKey, setSandboxSecretKey]       = useState<string | null>(null);
  const [sandboxSecretVisible, setSandboxSecretVisible] = useState(false);
  const [regeneratingSandbox, setRegeneratingSandbox] = useState(false);

  // Profile tab state
  const [profile, setProfile]       = useState<{ id: string; name: string; email: string; publishableKey: string | null; sandboxPublishableKey: string | null; kycLevel: string; createdAt: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editName, setEditName]     = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved]   = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason]           = useState('');
  const [deletingAccount, setDeletingAccount]     = useState(false);
  const [deleteSuccess, setDeleteSuccess]         = useState(false);

  // Payouts tab state
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutKind, setPayoutKind] = useState<'bank_account'|'crypto_wallet'>('bank_account');
  const [payoutAssetKey, setPayoutAssetKey] = useState('fiat:NGN');
  const [bankInstitution, setBankInstitution] = useState('');
  const [bankAccountIdentifier, setBankAccountIdentifier] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [activePayout, setActivePayout] = useState<any>(null);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [banks, setBanks] = useState<{name: string; code: string}[]>([]);
  const [resolvingName, setResolvingName] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const userEditedBankFields = useRef(false);

  // Webhooks state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookUrlLoading, setWebhookUrlLoading] = useState(true);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [rotatingSecret, setRotatingSecret] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status: number } | null>(null);

  const SETTLEMENT_ASSETS = [
    { key: 'crypto:BASE:USDC', label: 'USDC (Base)', active: true },
    { key: 'crypto:SOLANA:USDT', label: 'USDT (Solana)', active: false },
    { key: 'crypto:ETHEREUM:USDT', label: 'USDT (Ethereum)', active: false },
    { key: 'crypto:POLYGON:USDC', label: 'USDC (Polygon)', active: false },
  ];


  // Sync tab from URL if it changes externally
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile') setActiveTab('profile');
    else if (tab === 'payouts') setActiveTab('payouts');
    else if (tab === 'developer' || !tab) setActiveTab('developer');
  }, [searchParams]);

  // Fetch API keys
  useEffect(() => {
    fetch('/api/merchant/api-key')
      .then((r) => r.json())
      .then((d) => { setPublicKey(d.publishableKey ?? d.publicKey ?? null); setSecretKey(d.secretKey ?? null); })
      .catch(() => {})
      .finally(() => setKeysLoading(false));
  }, []);

  // Fetch profile
  useEffect(() => {
    fetch('/api/merchant/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) { setProfile(d); setEditName(d.name ?? ''); }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // Fetch payouts
  useEffect(() => {
    fetch('/api/merchant/payouts')
      .then((r) => r.ok ? r.json() : null)
      .then((resp) => {
        const d = resp;
        if (d) {
          setActivePayout(d);
          setPayoutKind(d.kind || 'bank_account');
          setPayoutAssetKey(d.assetKey || 'fiat:NGN');
          setBankInstitution(d.bankInstitution || '');
          setBankAccountIdentifier(d.bankAccountIdentifier || '');
          setBankAccountName(d.bankAccountName || '');
          setWalletAddress(d.walletAddress || '');
        }
      })
      .catch(() => {})
      .finally(() => setPayoutsLoading(false));
  }, []);

  // Fetch banks
  useEffect(() => {
    fetch('/api/institutions?currency=NGN')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setBanks(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Fetch webhooks
  useEffect(() => {
    fetch('/api/merchant/webhook')
      .then(r => r.ok ? r.json() : null)
      .then(resp => {
        if (resp?.success && resp.data) {
          setWebhookUrl(resp.data.url || '');
        }
      })
      .catch(() => {})
      .finally(() => setWebhookUrlLoading(false));
  }, []);

  // Auto-resolve account name via Paystack — only when the user manually edits the fields,
  // not on initial load (which already has the name from the server).
  useEffect(() => {
    if (!userEditedBankFields.current) return;
    if (bankAccountIdentifier.length !== 10 || !bankInstitution) return;
    setResolvingName(true);
    setResolutionError(null);
    setBankAccountName(''); // Clear previous name while resolving new one

    fetch('/api/merchant/payouts/resolve-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber: bankAccountIdentifier, institution: bankInstitution }),
    })
      .then((r) => r.json())
      .then((resp) => {
        if (resp.success && resp.data) {
          setBankAccountName(resp.data);
        } else {
          setResolutionError('Could not resolve — enter name manually');
        }
      })
      .catch(() => setResolutionError('Resolution timed out — enter name manually'))
      .finally(() => setResolvingName(false));
  }, [bankAccountIdentifier, bankInstitution]);

  async function regenerateKeys() {
    setRegenerating(true);
    const result = await apiFetch<{ publishableKey?: string; publicKey?: string; secretKey?: string }>('/api/merchant/api-key', {
      method: 'POST',
      body: JSON.stringify({ mode: 'live' }),
    });
    setRegenerating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPublicKey(result.data.publishableKey ?? result.data.publicKey ?? null);
    setSecretKey(result.data.secretKey ?? null);
    setCopied(null);
    toast.success('New API keys generated. Copy your secret key now — it won’t be shown again.');
  }

  async function regenerateSandboxKeys() {
    setRegeneratingSandbox(true);
    const result = await apiFetch<{ publishableKey?: string; secretKey?: string }>('/api/merchant/api-key', {
      method: 'POST',
      body: JSON.stringify({ mode: 'sandbox' }),
    });
    setRegeneratingSandbox(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    // Regeneration rotates the sandbox publishable key too — keep the UI in sync.
    setProfile((p) => p ? { ...p, sandboxPublishableKey: result.data.publishableKey ?? p.sandboxPublishableKey } : p);
    setSandboxSecretKey(result.data.secretKey ?? null);
    setSandboxSecretVisible(true);
    setCopied(null);
    toast.success('New sandbox keys generated. Copy your secret key now — it won’t be shown again.');
  }

  async function saveName() {
    if (!editName.trim()) return;
    setSavingName(true);
    const result = await apiFetch<{ name?: string }>('/api/merchant/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: editName.trim() }),
    });
    setSavingName(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setProfile((p) => p ? { ...p, name: result.data.name ?? editName.trim() } : p);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
    toast.success('Business name updated.');
  }

  async function savePayout() {
    setSavingPayout(true);
    const result = await apiFetch('/api/merchant/payouts', {
      method: 'PUT',
      body: JSON.stringify({
        kind: payoutKind,
        assetKey: payoutAssetKey,
        bankInstitution,
        bankAccountIdentifier,
        bankAccountName,
        walletAddress,
      }),
    });
    setSavingPayout(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPayoutSaved(true);
    setTimeout(() => setPayoutSaved(false), 2000);
    toast.success('Payout destination saved.');
    setTimeout(() => {
      fetch('/api/merchant/payouts')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setActivePayout(d); })
        .catch(() => {});
    }, 1200);
  }

  async function submitDeletionRequest() {
    setDeletingAccount(true);
    const result = await apiFetch('/api/merchant/request-deletion', {
      method: 'POST',
      body: JSON.stringify({ reason: deleteReason }),
    });
    setDeletingAccount(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDeleteSuccess(true);
    toast.success('Deletion request submitted. Our team will be in touch.');
  }

  async function saveWebhook() {
    setSavingWebhook(true);
    const result = await apiFetch('/api/merchant/webhook', {
      method: 'PATCH',
      body: JSON.stringify({ url: webhookUrl.trim() || null }),
    });
    setSavingWebhook(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 2000);
    toast.success(webhookUrl.trim() ? 'Webhook endpoint saved.' : 'Webhook endpoint cleared.');
  }

  async function sendTestEvent() {
    setSendingTest(true);
    setTestResult(null);
    const result = await apiFetch<{ ok?: boolean; status?: number }>('/api/merchant/webhook/test', { method: 'POST' });
    setSendingTest(false);
    if (!result.ok) {
      setTestResult({ ok: false, status: result.status });
      toast.error(`Test webhook failed: ${result.error}`);
      setTimeout(() => setTestResult(null), 4000);
      return;
    }
    const ok = result.data.ok ?? true;
    const status = result.data.status ?? 200;
    setTestResult({ ok, status });
    if (ok) toast.success(`Test event delivered · ${status}`);
    else    toast.error(`Endpoint responded ${status}.`);
    setTimeout(() => setTestResult(null), 4000);
  }

  async function rotateSecret() {
    setRotatingSecret(true);
    const result = await apiFetch<{ secret: string }>('/api/merchant/webhook/secret', { method: 'POST' });
    setRotatingSecret(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setWebhookSecret(result.data.secret);
    setShowSecretModal(true);
    toast.success('Webhook secret rotated. Update your server before closing.');
  }

  const accentHex = ACCENT_OPTIONS.find((o) => o.key === accent)!.hex;
  const radiusPx  = Math.round((radius / 100) * 20);
  const initials  = (profile?.name ?? 'My Store')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const snippetReact = `import { WeaveCheckout } from '@weave-sdk/widget';

export default function CheckoutPage() {
  return (
    <WeaveCheckout 
      apiKey="${publicKey ?? 'pk_live_...'}"
      theme="${theme}"
      accentColor="${accentHex}"
      borderRadius={${radiusPx}}
      merchant={{
        name: '${profile?.name?.replace(/'/g, "\\'") ?? 'My Store'}',
        amount: 45.00,
        currency: 'NGN' // Base fiat matching your settings
      }}
    />
  );
}`;

  const snippetHtml = `<!-- Drop this into your HTML page -->
<div id="weave-checkout"></div>

<script src="https://unpkg.com/@weave-sdk/widget/dist/umd.js"></script>
<script>
  Weave.mount('#weave-checkout', {
    apiKey: '${publicKey ?? 'pk_live_...'}',
    theme: '${theme}',
    accentColor: '${accentHex}',
    borderRadius: ${radiusPx},
    merchant: {
      name: '${profile?.name?.replace(/'/g, "\\'") ?? 'My Store'}',
      amount: 45.00,
      currency: 'NGN'
    }
  });
</script>`;

  const snippet = codeTab === 'react' ? snippetReact : snippetHtml;

  function copy(id: string, value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1400);
  }



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 fade-up">
        <div className="max-w-2xl">
          <h1 className="font-display text-[32px] sm:text-[42px] font-semibold text-ink tracking-tight leading-[1.05]">
            Settings
          </h1>
          <p className="text-ink-muted text-[15px] mt-3 leading-relaxed">
            Manage your profile, API keys, webhooks, and checkout customisation.
          </p>
        </div>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 self-start bg-cream-soft border border-hair hover:border-forest/30 text-forest-deep px-5 py-3 rounded-full text-[14px] font-medium transition-all shadow-leaf shrink-0"
        >
          <FileText size={15} strokeWidth={1.9} />
          API Docs
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-cream-deep/50 rounded-2xl border border-hair-soft w-fit overflow-x-auto">
        {([
          { id: 'profile',   label: 'Profile',    icon: User },
          { id: 'payouts',   label: 'Payouts',    icon: Landmark },
          { id: 'developer', label: 'Developer',  icon: KeyRound },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              router.replace(id === 'developer' ? '/settings' : '?tab=' + id);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all shrink-0 ${
              activeTab === id
                ? 'bg-cream-soft text-forest-deep shadow-leaf'
                : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            <Icon size={15} strokeWidth={activeTab === id ? 2.2 : 1.75} />
            {label}
          </button>
        ))}
      </div>

      <div className="rule-dotted" />

      {/* ── Profile tab ─────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity card */}
          <Card delay={80}>
            <div className="flex items-center gap-3 mb-6 text-forest-deep">
              <User size={18} strokeWidth={1.9} />
              <h2 className="font-display text-[22px] font-semibold text-ink">Merchant Profile</h2>
            </div>

            {profileLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-cream-deep/60 rounded-xl" />
                <div className="h-10 bg-cream-deep/60 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4 pb-5 border-b border-hair-soft">
                  <div className="w-16 h-16 rounded-full bg-forest text-cream-soft flex items-center justify-center font-display font-semibold text-xl shadow-leaf">
                    {initials}
                  </div>
                  <div>
                    <p className="font-display text-[18px] font-semibold text-ink">{profile?.name ?? '—'}</p>
                    <p className="text-[13px] text-ink-muted">{profile?.email ?? '—'}</p>
                  </div>
                </div>

                {/* Edit name */}
                <div>
                  <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-widest">
                    Business / Display Name
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => { setEditName(e.target.value); setNameSaved(false); }}
                      className="flex-1 bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40 transition-colors"
                      placeholder="Your business name"
                    />
                    <button
                      onClick={saveName}
                      disabled={savingName || !editName.trim() || editName.trim() === profile?.name}
                      className="w-11 h-11 rounded-xl bg-forest text-cream-soft hover:bg-forest-deep flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Save name"
                    >
                      {nameSaved
                        ? <Check size={15} strokeWidth={2.3} />
                        : <Save size={15} strokeWidth={1.9} />}
                    </button>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-widest">
                    Email Address
                  </label>
                  <div className="mt-2 flex items-center gap-3 bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3">
                    <Mail size={15} strokeWidth={1.75} className="text-ink-muted shrink-0" />
                    <span className="text-[14px] text-ink-soft">{profile?.email ?? '—'}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-ink-muted">
                    To change your email, contact <a href="mailto:support@weave.dev" className="text-forest-deep underline underline-offset-2">support@weave.dev</a>.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Account details */}
          <Card delay={120}>
            <div className="flex items-center gap-3 mb-6 text-forest-deep">
              <Building2 size={18} strokeWidth={1.9} />
              <h2 className="font-display text-[22px] font-semibold text-ink">Account Details</h2>
            </div>

            <div className="space-y-5">
              <FieldRow label="Account ID" value={profile?.id ?? '—'} mono />
              <FieldRow label="KYC Level" value={profile?.kycLevel ?? '—'} />
              <FieldRow
                label="Member Since"
                value={profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                  : '—'}
              />
              <FieldRow
                label="Publishable Key"
                value={profile?.publishableKey ?? '—'}
                mono
                onCopy={() => profile?.publishableKey && copy('pk-profile', profile.publishableKey)}
                copied={copied === 'pk-profile'}
              />
            </div>
          </Card>

          {/* Danger Zone */}
          <Card delay={160} className="border-red-500/20 bg-red-50/50">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle size={18} strokeWidth={1.9} />
              <h2 className="font-display text-[22px] font-semibold">Danger Zone</h2>
            </div>
            
            <p className="text-[14px] text-red-950/70 mb-6 leading-relaxed">
              Permanently close your Weave account. This will invalidate all API keys, cancel pending Webhooks, and remove your access. Financial audit logs will be retained to comply with AML laws.
            </p>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-full text-[14px] font-semibold transition-all shadow-sm"
            >
              Request Account Deletion
            </button>
          </Card>
        </div>
      )}

      {/* ── Payouts tab ─────────────────────────────────────────────────── */}
      {activeTab === 'payouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-up">
          <Card delay={80}>
            <div className="flex items-center gap-3 mb-6 text-forest-deep">
              <Landmark size={18} strokeWidth={1.9} />
              <h2 className="font-display text-[22px] font-semibold text-ink">Payout Destination</h2>
            </div>
            
            <p className="text-[14px] text-ink-muted mb-6 leading-relaxed">
              Choose how you want to receive funds. Your default destination will be used for all successful orders unless you override it in a specific checkout session.
            </p>

            {payoutsLoading ? (
               <div className="h-10 bg-cream-deep/60 animate-pulse rounded-xl" />
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-widest">
                    Destination Type
                  </label>
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => setPayoutKind('bank_account')}
                      className={`flex-1 py-3 px-4 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                        payoutKind === 'bank_account' 
                          ? 'border-forest bg-forest/5 text-forest-deep' 
                          : 'border-hair-soft bg-cream-deep/30 text-ink-muted hover:border-hair hover:text-ink-soft'
                      }`}
                    >
                      <Landmark size={16} /> Fiat Bank (NGN)
                    </button>
                    <button
                      onClick={() => setPayoutKind('crypto_wallet')}
                      className={`flex-1 py-3 px-4 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                        payoutKind === 'crypto_wallet' 
                          ? 'border-forest bg-forest/5 text-forest-deep' 
                          : 'border-hair-soft bg-cream-deep/30 text-ink-muted hover:border-hair hover:text-ink-soft'
                      }`}
                    >
                      <Wallet size={16} /> Crypto Wallet
                    </button>
                  </div>
                </div>

                {payoutKind === 'bank_account' ? (
                   <div className="space-y-4 fade-up">
                     <p className="text-[12px] text-ink-muted mb-2">Funds cross our bridging infrastructure and hit this NGN bank account directly via Paycrest.</p>
                     <div>
                       <label className="block text-[12px] font-medium text-ink-soft mb-1.5">Bank Institution</label>
                       <div className="relative">
                         <select 
                           value={bankInstitution}
                           onChange={(e) => { userEditedBankFields.current = true; setBankInstitution(e.target.value); }}
                           className="w-full bg-cream-deep/50 border border-hair-soft rounded-xl pl-4 pr-10 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40 appearance-none"
                         >
                           <option value="" disabled>Select a bank</option>
                           {banks.map((b) => (
                             <option key={b.code} value={b.code}>{b.name}</option>
                           ))}
                           {bankInstitution && !banks.some(b => b.code === bankInstitution) && (
                             <option value={bankInstitution}>{bankInstitution}</option>
                           )}
                         </select>
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                         </div>
                       </div>
                     </div>
                     <div>
                       <label className="block text-[12px] font-medium text-ink-soft mb-1.5">Account Number</label>
                       <input 
                         type="text"
                         value={bankAccountIdentifier}
                         onChange={(e) => { userEditedBankFields.current = true; setBankAccountIdentifier(e.target.value); }}
                         placeholder="e.g. 0000000000"
                         className="w-full bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40"
                       />
                     </div>
                     <div>
                       <label className="block text-[12px] font-medium text-ink-soft mb-1.5">Account Name</label>
                       <input
                         type="text"
                         value={resolvingName ? '' : bankAccountName}
                         onChange={(e) => setBankAccountName(e.target.value)}
                         readOnly={resolvingName || (!resolutionError && !!bankAccountName)}
                         placeholder={resolvingName ? 'Resolving…' : 'Auto-filled when account number is entered'}
                         className={`w-full border rounded-xl px-4 py-3 text-[14px] focus:outline-none transition-colors ${
                           resolvingName
                             ? 'bg-cream-deep/30 border-hair-soft text-ink-muted animate-pulse cursor-default select-none'
                             : (resolutionError || !bankAccountName)
                             ? 'bg-cream-deep/50 border-hair-soft text-ink focus:border-forest/40'
                             : 'bg-forest/5 border-forest/20 text-forest-deep font-medium cursor-default select-none'
                         }`}
                       />
                       {resolutionError && (
                         <p className="mt-1 text-[11px] text-amber-600">{resolutionError}</p>
                       )}
                     </div>
                   </div>
                ) : (
                   <div className="space-y-4 fade-up">
                      <p className="text-[12px] text-ink-muted mb-2">We will settle exactly to this target address bypassing the fiat rail.</p>
                      
                      <div>
                        <label className="block text-[12px] font-medium text-ink-soft mb-1.5">Settlement Asset</label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {SETTLEMENT_ASSETS.map((asset) => (
                            <button
                              key={asset.key}
                              type="button"
                              disabled={!asset.active}
                              onClick={() => setPayoutAssetKey(asset.key)}
                              title={!asset.active ? 'Coming Soon' : ''}
                              className={`px-3 py-2.5 rounded-xl border text-[13px] font-medium transition-all text-left flex items-center justify-between group relative ${
                                payoutAssetKey === asset.key 
                                  ? 'border-forest bg-forest/5 text-forest-deep' 
                                  : 'border-hair-soft bg-cream-deep/30 text-ink-muted' + (asset.active ? ' hover:border-hair hover:text-ink-soft' : ' opacity-50 cursor-not-allowed')
                              }`}
                            >
                              {asset.label}
                              {!asset.active && <span className="text-[9px] uppercase tracking-tighter bg-hair px-1.5 py-0.5 rounded text-ink-muted group-hover:bg-ink group-hover:text-cream-soft transition-colors">Soon</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                     <div>
                       <label className="block text-[12px] font-medium text-ink-soft mb-1.5">USDC Wallet Address</label>
                       <input 
                         type="text"
                         value={walletAddress}
                         onChange={(e) => setWalletAddress(e.target.value)}
                         placeholder="0x..."
                         className="w-full bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40 font-mono"
                       />
                     </div>
                   </div>
                )}

                {/* Paystack subaccount sync status — only shown for NGN bank accounts */}
                {payoutKind === 'bank_account' && activePayout?.paystackSubaccountStatus && (
                  <div className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl border ${
                    activePayout.paystackSubaccountStatus === 'SYNCED'
                      ? 'bg-forest/5 border-forest/20 text-forest-deep'
                      : activePayout.paystackSubaccountStatus === 'FAILED'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      activePayout.paystackSubaccountStatus === 'SYNCED' ? 'bg-forest' :
                      activePayout.paystackSubaccountStatus === 'FAILED' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    {activePayout.paystackSubaccountStatus === 'SYNCED' && 'Paystack settlement active — NGN payments route directly to your bank (T+1 business day)'}
                    {activePayout.paystackSubaccountStatus === 'PENDING' && 'Paystack sync pending — save your payout details to activate NGN settlements'}
                    {activePayout.paystackSubaccountStatus === 'FAILED' && 'Paystack sync failed — we’re retrying automatically in the background. If it doesn’t clear shortly, double-check your account details and re-save.'}
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between border-t border-hair-soft">
                  <div className="text-[13px] text-ink-muted">
                    {activePayout?.kind === payoutKind ? (
                       <span className="text-forest-deep flex items-center gap-1.5"><Check size={14}/> Saved Configuration</span>
                    ) : (
                       <span>Unsaved configuration</span>
                    )}
                  </div>
                  <button
                    onClick={savePayout}
                    disabled={savingPayout || (payoutKind === 'bank_account' ? (!bankInstitution || !bankAccountIdentifier || !bankAccountName) : !walletAddress)}
                    className="px-6 py-2.5 rounded-full bg-forest text-cream-soft hover:bg-forest-deep transition-all text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {payoutSaved ? <><Check size={16}/> Saved</> : (savingPayout ? 'Saving...' : 'Save Changes')}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Developer tab ────────────────────────────────────────────────── */}
      {activeTab === 'developer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Keys */}
          <Card delay={80}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5 text-forest-deep">
                <KeyRound size={18} strokeWidth={1.9} />
                <h2 className="font-display text-[22px] font-semibold text-ink">API Keys</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-forest text-cream-soft px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-cream-soft animate-pulse" />
                Live
              </span>
            </div>

            <div className="space-y-4">
              <KeyField
                label="Publishable Key"
                value={keysLoading ? 'Loading…' : publicKey ?? 'Not found'}
                canCopy={!!publicKey}
                onCopy={() => publicKey && copy('pub', publicKey)}
                copied={copied === 'pub'}
              />

              <div>
                <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-widest">
                  Secret Key
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 font-mono text-[13px] text-ink-soft">
                    {keysLoading ? 'Loading…' : secretKey
                      ? (secretVisible ? secretKey : '••••••••••••••••••••')
                      : 'Not available — regenerate to receive a new key'}
                  </div>
                  <button
                    onClick={() => setSecretVisible((v) => !v)}
                    className="w-11 h-11 rounded-xl bg-cream-deep/50 border border-hair-soft hover:border-forest/30 flex items-center justify-center text-ink-soft hover:text-forest-deep transition-all"
                    aria-label="Toggle visibility"
                    disabled={!secretKey}
                  >
                    {secretVisible ? <EyeOff size={15} strokeWidth={1.9} /> : <Eye size={15} strokeWidth={1.9} />}
                  </button>
                  <button
                    onClick={() => secretKey && copy('secret', secretKey)}
                    className="w-11 h-11 rounded-xl bg-cream-deep/50 border border-hair-soft hover:border-forest/30 flex items-center justify-center text-ink-soft hover:text-forest-deep transition-all"
                    aria-label="Copy"
                    disabled={!secretKey}
                  >
                    {copied === 'secret' ? <Check size={15} strokeWidth={2.2} className="text-forest" /> : <Copy size={15} strokeWidth={1.9} />}
                  </button>
                </div>
                {!secretKey && !keysLoading && (
                  <p className="mt-2 text-[12px] text-ink-muted leading-snug">
                    The secret key is only shown once at signup or after regeneration. Regenerate to get a new one.
                  </p>
                )}
              </div>

              <button
                onClick={regenerateKeys}
                disabled={keysLoading || regenerating}
                className="w-full mt-3 py-3 rounded-full border border-forest/40 text-forest-deep font-semibold text-[14px] hover:bg-forest-surface/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? 'Regenerating…' : 'Regenerate Keys'}
              </button>
            </div>
          </Card>

          {/* Test Keys */}
          <Card delay={100}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5 text-amber-700">
                <KeyRound size={18} strokeWidth={1.9} />
                <h2 className="font-display text-[22px] font-semibold text-ink">Test Keys</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Sandbox
              </span>
            </div>

            <p className="text-[13px] text-ink-muted mb-5 leading-relaxed">
              Use the sandbox keys during development — no real funds move. The <span className="font-mono text-ink-soft">pk_test_</span> key powers the widget; pair it with the <span className="font-mono text-ink-soft">sk_test_</span> secret to drive checkout sessions and orders server-side from your backend.
            </p>

            <div className="space-y-4">
              <KeyField
                label="Sandbox Publishable Key"
                value={profileLoading ? 'Loading…' : profile?.sandboxPublishableKey ?? 'Not available'}
                canCopy={!!profile?.sandboxPublishableKey}
                onCopy={() => profile?.sandboxPublishableKey && copy('sandbox-pub', profile.sandboxPublishableKey)}
                copied={copied === 'sandbox-pub'}
              />

              <div>
                <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-widest">
                  Sandbox Secret Key
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 font-mono text-[13px] text-ink-soft truncate">
                    {sandboxSecretKey
                      ? (sandboxSecretVisible ? sandboxSecretKey : '••••••••••••••••••••')
                      : 'Not available — regenerate to receive a new key'}
                  </div>
                  <button
                    onClick={() => setSandboxSecretVisible((v) => !v)}
                    className="w-11 h-11 rounded-xl bg-cream-deep/50 border border-hair-soft hover:border-forest/30 flex items-center justify-center text-ink-soft hover:text-forest-deep transition-all disabled:opacity-40"
                    aria-label="Toggle visibility"
                    disabled={!sandboxSecretKey}
                  >
                    {sandboxSecretVisible ? <EyeOff size={15} strokeWidth={1.9} /> : <Eye size={15} strokeWidth={1.9} />}
                  </button>
                  <button
                    onClick={() => sandboxSecretKey && copy('sandbox-secret', sandboxSecretKey)}
                    className="w-11 h-11 rounded-xl bg-cream-deep/50 border border-hair-soft hover:border-forest/30 flex items-center justify-center text-ink-soft hover:text-forest-deep transition-all disabled:opacity-40"
                    aria-label="Copy"
                    disabled={!sandboxSecretKey}
                  >
                    {copied === 'sandbox-secret' ? <Check size={15} strokeWidth={2.2} className="text-forest" /> : <Copy size={15} strokeWidth={1.9} />}
                  </button>
                </div>
                {!sandboxSecretKey && (
                  <p className="mt-2 text-[12px] text-ink-muted leading-snug">
                    The sandbox secret is only shown once at signup or after regeneration. Regenerate to get a new one.
                  </p>
                )}
              </div>

              <button
                onClick={regenerateSandboxKeys}
                disabled={regeneratingSandbox}
                className="w-full mt-1 py-3 rounded-full border border-amber-400/50 text-amber-700 font-semibold text-[14px] hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regeneratingSandbox ? 'Regenerating…' : 'Regenerate Sandbox Keys'}
              </button>
            </div>

            <div className="mt-5 p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl">
              <p className="text-[12px] text-amber-800 leading-relaxed">
                <strong>Sandbox orders</strong> are isolated — they appear in your dashboard with a sandbox badge and are excluded from revenue metrics. Regenerating rotates <em>both</em> sandbox keys and invalidates the old pair.
              </p>
            </div>
          </Card>

          {/* Checkout UI + Preview */}
          <Card delay={120} className="flex flex-col lg:flex-row gap-0 !p-0 overflow-hidden">
            <div className="flex-1 p-7">
              <div className="flex items-center gap-2.5 mb-6 text-forest-deep">
                <Palette size={18} strokeWidth={1.9} />
                <h2 className="font-display text-[22px] font-semibold text-ink">Checkout UI</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[12px] font-semibold text-ink-soft uppercase tracking-[0.1em]">Theme</p>
                  <div className="mt-2.5 inline-flex p-1 bg-cream-deep/60 rounded-full border border-hair-soft">
                    {(['organic', 'minimal'] as ThemePreset[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-5 py-2 rounded-full text-[13px] font-medium capitalize transition-all ${
                          theme === t ? 'bg-cream-soft text-forest-deep shadow-leaf' : 'text-ink-muted hover:text-ink-soft'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-ink-soft uppercase tracking-[0.1em]">Corner Radius</p>
                  <input
                    type="range" min={0} max={100} value={radius}
                    onChange={(e) => setRadius(+e.target.value)}
                    className="organic-range w-full mt-3"
                  />
                  <div className="flex justify-between text-[12px] text-ink-muted mt-1.5">
                    <span>Sharp</span><span>Soft</span>
                  </div>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-ink-soft uppercase tracking-[0.1em]">Accent Color</p>
                  <div className="mt-3 flex gap-3">
                    {ACCENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setAccent(opt.key)}
                        className={`w-9 h-9 rounded-full ${opt.swatchClass} transition-all ${
                          accent === opt.key ? 'ring-2 ring-offset-2 ring-offset-cream-soft ring-forest scale-110' : 'hover:scale-110'
                        }`}
                        aria-label={opt.key}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-gradient-to-br from-cream-deep/50 to-parchment/30 p-6 border-l border-hair-soft sm:min-w-[340px] flex flex-col">
              <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.13em] mb-3">Live Preview</p>
              
              <div className="flex-1 w-full flex justify-center shrink-0 scale-[0.80] origin-top">
                <div style={{ pointerEvents: 'none' }}>
                  <WeaveCheckout 
                    theme={theme as any}
                    accentColor={accentHex}
                    borderRadius={radiusPx}
                    merchant={{
                      name: profile?.name ?? 'My Store',
                      amount: 45.00,
                      currency: 'NGN'
                    }}
                    apiKey="pk_test_visual_preview"
                    userAddress=""
                    onSuccess={() => {}}
                    onError={() => {}}
                    onClose={() => {}}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Webhooks */}
          <Card delay={160}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5 text-forest-deep">
                <Webhook size={18} strokeWidth={1.9} />
                <h2 className="font-display text-[22px] font-semibold text-ink">Webhooks</h2>
              </div>
            </div>

            <p className="text-[13px] text-ink-muted mb-5 leading-relaxed">
              Weave will send a POST request with HMAC-SHA256 signature to this URL whenever an order status changes.
            </p>

            <div className="space-y-6">
              <div>
                <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-widest">
                  Endpoint URL
                </label>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-api.com/webhooks/weave"
                    disabled={webhookUrlLoading}
                    className="flex-1 min-w-0 bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40 transition-colors"
                  />
                  <button
                    onClick={saveWebhook}
                    disabled={savingWebhook || webhookUrlLoading}
                    className="h-11 px-5 rounded-xl bg-forest text-cream-soft hover:bg-forest-deep flex items-center justify-center transition-all disabled:opacity-40 text-[13px] font-medium"
                  >
                    {webhookSaved ? <Check size={16} strokeWidth={2.3} /> : (savingWebhook ? 'Saving...' : 'Save')}
                  </button>
                  <button
                    onClick={sendTestEvent}
                    disabled={sendingTest || !webhookUrl || webhookUrlLoading}
                    className="h-11 px-5 rounded-xl border border-hair hover:border-forest/30 text-forest-deep text-[13px] font-medium transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    {sendingTest ? 'Sending...' : 'Send Test'}
                  </button>
                  {testResult !== null && (
                    <span className={`text-[12px] font-medium px-3 py-1.5 rounded-lg ${testResult.ok ? 'bg-forest-surface text-forest-deep' : 'bg-terracotta-soft text-terracotta'}`}>
                      {testResult.ok ? `Delivered · ${testResult.status}` : `Failed · ${testResult.status || 'no response'}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-5 border-t border-hair-soft">
                <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-widest">
                  Signing Secret
                </label>
                <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full bg-cream-deep/30 border border-hair-soft border-dashed rounded-xl px-4 py-3 text-[13px] text-ink-muted flex items-center gap-2">
                    <Shield size={14} />
                    <span>HMAC-SHA256 signature active</span>
                  </div>
                  <button
                    onClick={rotateSecret}
                    disabled={rotatingSecret}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-hair hover:border-forest/30 text-forest-deep text-[13px] font-semibold transition-all"
                  >
                    {rotatingSecret ? 'Rotating...' : 'Rotate Secret'}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Code snippet */}
          <div className="relative rounded-[24px] bg-ink text-cream-soft overflow-hidden fade-up shadow-leaf-lg" style={{ animationDelay: '200ms' }}>
            <div className="scale-95 flex items-center justify-between px-6 pt-5 pb-2 border-b border-cream-soft/10">
              <div className="flex gap-1">
                {(['html', 'react'] as CodeTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCodeTab(t)}
                    className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      codeTab === t ? 'bg-cream-soft/10 text-cream-soft' : 'text-cream-soft/50 hover:text-cream-soft/80'
                    }`}
                  >
                    {t === 'html' ? 'HTML/JS' : 'React'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => copy('code', snippet)}
                className="inline-flex items-center gap-1.5 text-[12px] text-cream-soft/60 hover:text-cream-soft transition-colors"
              >
                {copied === 'code' ? (
                  <><Check size={13} strokeWidth={2.2} className="text-forest-light" />Copied</>
                ) : (
                  <><Copy size={13} strokeWidth={1.9} />Copy</>
                )}
              </button>
            </div>
            <pre className="px-6 py-5 overflow-x-auto text-[12.5px] leading-[1.65] font-mono">
              <code className="text-cream-soft/85">{highlight(snippet)}</code>
            </pre>
          </div>

          {/* Integration notes */}
          <div className="lg:col-span-2 rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf px-7 py-6 fade-up" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center gap-2.5 mb-3 text-forest-deep">
              <ShoppingBag size={17} strokeWidth={1.9} />
              <h2 className="font-display text-[20px] font-semibold text-ink">Checkout integration</h2>
            </div>
            <p className="text-[14px] text-ink-muted leading-relaxed max-w-3xl">
              Drop the script into your checkout page, mount the element, and orders flow directly into Weave.
              Test with the sandbox publishable key first, then swap to <span className="font-mono text-ink">pk_live</span>{' '}
              when you&apos;re ready to accept real payments.
            </p>
          </div>
        </div>
      )}

      {/* Account Deletion Modal (Portal) */}
      {isDeleteModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-cream-soft border border-hair-soft rounded-[24px] w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-hair-soft bg-white/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 size={20} strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">Delete Account</h3>
                </div>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-hair transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {deleteSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-forest/10 border border-forest/20 text-forest mx-auto flex items-center justify-center mb-4">
                    <Check size={32} strokeWidth={2.5} />
                  </div>
                  <h4 className="text-lg font-semibold text-ink mb-2">Request Submitted</h4>
                  <p className="text-[14px] text-ink-muted leading-relaxed">
                    Our compliance team has received your request. An account manager will reach out to <strong>{profile?.email}</strong> shortly to process the final settlement and closure.
                  </p>
                  <button
                    onClick={() => { setIsDeleteModalOpen(false); setDeleteSuccess(false); setDeleteReason(''); }}
                    className="mt-6 w-full py-3 bg-ink text-cream-soft rounded-xl font-semibold text-[14px] hover:bg-ink-deep transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[14px] text-ink-muted leading-relaxed mb-6">
                    Because your account holds potential financial balances and transaction history, our compliance team must verify this request and settle any remaining funds before full closure.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-ink-soft mb-2 uppercase tracking-widest">
                        Why are you leaving? (Optional)
                      </label>
                      <textarea 
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Missing features, pricing, etc."
                        className="w-full bg-cream-deep/50 border border-hair-soft rounded-xl p-4 text-[14px] text-ink focus:outline-none focus:border-red-400 transition-colors resize-none h-24"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={deletingAccount}
                      className="flex-1 py-3 bg-cream-deep/50 text-ink border border-hair hover:border-hair-soft rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitDeletionRequest}
                      disabled={deletingAccount}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[14px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deletingAccount ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Webhook Secret Modal (Portal) */}
      {showSecretModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-cream-soft border border-hair-soft rounded-[24px] w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-hair-soft bg-white/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-forest-deep">
                  <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center">
                    <Shield size={20} strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">Webhook Secret</h3>
                </div>
                <button 
                  onClick={() => setShowSecretModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-hair transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-[14px] text-ink-muted leading-relaxed">
                Copy your new webhook signing secret now. For security, we won&apos;t show it again. Use this secret to verify <code>x-weave-signature</code> headers.
              </p>

              <div className="bg-ink rounded-xl p-4 font-mono text-[13px] text-cream-soft break-all flex items-start gap-3 relative group">
                <div className="flex-1">{webhookSecret}</div>
                <button 
                  onClick={() => webhookSecret && copy('wh-secret', webhookSecret)}
                  className="shrink-0 p-1.5 rounded-lg bg-cream-soft/10 text-cream-soft/60 hover:text-cream-soft hover:bg-cream-soft/20 transition-all"
                >
                  {copied === 'wh-secret' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[12px] text-amber-800 flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  Existing secrets are invalidated immediately. Update your server code before closing this modal.
                </p>
              </div>

              <button
                onClick={() => setShowSecretModal(false)}
                className="w-full py-3 bg-forest text-cream-soft rounded-xl font-semibold text-[14px] hover:bg-forest-deep transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`relative rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf fade-up ${className}`}
      style={{ animationDelay: `${delay}ms`, padding: className.includes('!p-0') ? 0 : undefined }}
    >
      {!className.includes('!p-0') && <div className="p-7">{children}</div>}
      {className.includes('!p-0') && children}
    </div>
  );
}

function KeyField({
  label, value, canCopy, onCopy, copied,
}: { label: string; value: string; canCopy: boolean; onCopy: () => void; copied: boolean }) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-widest">{label}</label>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 font-mono text-[13px] text-ink-soft truncate">
          {value}
        </div>
        <button
          onClick={onCopy}
          disabled={!canCopy}
          className="w-11 h-11 rounded-xl bg-cream-deep/50 border border-hair-soft hover:border-forest/30 flex items-center justify-center text-ink-soft hover:text-forest-deep transition-all disabled:opacity-40"
          aria-label="Copy"
        >
          {copied ? <Check size={15} strokeWidth={2.2} className="text-forest" /> : <Copy size={15} strokeWidth={1.9} />}
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, value, mono = false, onCopy, copied }: {
  label: string; value: string; mono?: boolean; onCopy?: () => void; copied?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest">{label}</p>
        <p className={`mt-1 text-[14px] text-ink truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="shrink-0 w-8 h-8 rounded-lg bg-cream-deep/50 border border-hair-soft hover:border-forest/30 flex items-center justify-center text-ink-soft hover:text-forest-deep transition-all" aria-label="Copy">
          {copied ? <Check size={13} strokeWidth={2.2} className="text-forest" /> : <Copy size={13} strokeWidth={1.9} />}
        </button>
      )}
    </div>
  );
}

function highlight(src: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  src.split('\n').forEach((line, li) => {
    const tokens: React.ReactNode[] = [];
    if (line.trim().startsWith('//') || line.trim().startsWith('<!--')) {
      tokens.push(<span key={li} className="text-cream-soft/45">{line}</span>);
    } else {
      let rest = line, lastIdx = 0, idx = 0;
      const re = /('[^']*'|"[^"]*"|\b(const|new|import|from|export|default|function|return)\b|<\/?[\w-]+|[#][a-fA-F0-9]{3,8}|\b\d+px\b)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(rest))) {
        if (m.index > lastIdx) tokens.push(<span key={`${li}-t-${idx++}`}>{rest.slice(lastIdx, m.index)}</span>);
        const token = m[0];
        let cls = '';
        if (token.startsWith("'") || token.startsWith('"')) cls = 'text-tan-soft';
        else if (/^(const|new|import|from|export|default|function|return)$/.test(token)) cls = 'text-forest-light font-semibold';
        else if (token.startsWith('<')) cls = 'text-forest-light';
        else if (token.startsWith('#') || /\d+px/.test(token)) cls = 'text-tan-soft';
        tokens.push(<span key={`${li}-k-${idx++}`} className={cls}>{token}</span>);
        lastIdx = m.index + token.length;
      }
      if (lastIdx < rest.length) tokens.push(<span key={`${li}-rest`}>{rest.slice(lastIdx)}</span>);
    }
    parts.push(<span key={li}>{tokens}{'\n'}</span>);
  });
  return parts;
}
