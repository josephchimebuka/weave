'use client';

import { useEffect, useState } from 'react';
import { Banknote, Plus, Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { Select } from '../../components/Select';

type PayoutLink = {
  id: string;
  title: string;
  description: string | null;
  sourceAsset: string | null;   // null = any chain/token
  payoutCurrency: string;
  amount: string | null;
  isActive: boolean;
  createdAt: string;
};
type CryptoAsset = { key: string; token: string; network: string; name: string };

export default function PayoutLinksPage() {
  const [links, setLinks] = useState<PayoutLink[]>([]);
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [kycLevel, setKycLevel] = useState('none');
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceAsset, setSourceAsset] = useState(''); // '' = any chain/token
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function loadLinks() {
    fetch('/api/merchant/payout-links').then(r => r.ok ? r.json() : []).then(d => setLinks(Array.isArray(d) ? d : [])).catch(() => {});
  }

  useEffect(() => {
    loadLinks();
    fetch('/api/assets').then(r => r.ok ? r.json() : null).then(j => {
      const c = j?.crypto ?? j?.data?.crypto ?? [];
      setAssets(c);
    }).catch(() => {}).finally(() => setLoading(false));
    fetch('/api/merchant/profile').then(r => r.ok ? r.json() : null).then(j => { if (j?.kycLevel) setKycLevel(j.kycLevel); }).catch(() => {});
  }, []);

  const canCreate = kycLevel !== 'none';

  async function createLink() {
    setFormError(null);
    if (!title.trim()) { setFormError('A title is required.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/merchant/payout-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          sourceAsset: sourceAsset || undefined,   // omit = chain-agnostic
          amount: amount.trim() ? Number(amount) : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok || j.error) { setFormError(j.error || 'Could not create the link.'); return; }
      setTitle(''); setDescription(''); setAmount('');
      loadLinks();
    } catch {
      setFormError('Could not create the link.');
    } finally {
      setCreating(false);
    }
  }

  async function toggle(link: PayoutLink) {
    await fetch(`/api/merchant/payout-links?id=${link.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !link.isActive }),
    });
    loadLinks();
  }

  async function remove(id: string) {
    await fetch(`/api/merchant/payout-links?id=${id}`, { method: 'DELETE' });
    loadLinks();
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/cashout/${id}`;
    navigator.clipboard.writeText(url).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 1600); }).catch(() => {});
  }

  function assetLabel(key: string | null) {
    if (!key) return 'Any chain/token';
    const a = assets.find(x => x.key === key);
    if (a) return `${a.token} on ${a.network}`;
    const p = key.split(':');
    return `${p[2] ?? key} on ${p[1] ?? ''}`;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-2 text-forest-deep">
        <Banknote size={20} strokeWidth={1.9} />
        <h1 className="font-display text-[28px] font-semibold text-ink">Cash-out Links</h1>
      </div>
      <p className="text-[14px] text-ink-muted mb-8 leading-relaxed max-w-2xl">
        Share a link that lets your users cash out crypto to their own bank account. They open it, enter their bank details,
        and send their crypto — Weave settles the naira straight to them. You never hold the funds.
      </p>

      {/* Create */}
      <div className="rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf p-6 mb-8">
        <div className="flex items-center gap-2 mb-5 text-forest-deep">
          <Plus size={16} strokeWidth={2.2} />
          <h2 className="font-display text-[16px] font-semibold text-ink">New link</h2>
        </div>

        {!canCreate ? (
          <div className="rounded-xl border border-hair-strong bg-tan-mist px-4 py-3 text-[13px] text-tan-deep">
            Verify your email to create cash-out links.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-soft uppercase tracking-wide">Title</span>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Cash out USDC"
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-hair-soft bg-cream-deep/50 text-[14px] text-ink focus:outline-none focus:border-forest/40" />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-soft uppercase tracking-wide">Accepted crypto</span>
                <Select value={sourceAsset} onChange={e => setSourceAsset(e.target.value)}
                  wrapperClassName="mt-1.5"
                  className="w-full pl-4 py-3 rounded-xl border border-hair-soft bg-cream-deep/50 text-[14px] text-ink focus:outline-none focus:border-forest/40">
                  <option value="">Any chain / token (recommended)</option>
                  {assets.map(a => <option key={a.key} value={a.key}>Only {a.token} on {a.network}</option>)}
                </Select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-[12px] font-semibold text-ink-soft uppercase tracking-wide">Description (optional)</span>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Withdraw your balance to your bank"
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-hair-soft bg-cream-deep/50 text-[14px] text-ink focus:outline-none focus:border-forest/40" />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-soft uppercase tracking-wide">Fixed amount (optional)</span>
                <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Leave blank — user chooses"
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-hair-soft bg-cream-deep/50 text-[14px] text-ink focus:outline-none focus:border-forest/40" />
              </label>
            </div>
            {formError && <p className="text-[13px] text-terracotta">{formError}</p>}
            <button onClick={createLink} disabled={creating}
              className="px-6 py-2.5 rounded-full bg-forest text-cream-soft hover:bg-forest-deep transition-all text-[14px] font-medium disabled:opacity-50">
              {creating ? 'Creating…' : 'Create link'}
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="h-16 bg-cream-deep/50 animate-pulse rounded-2xl" />
      ) : links.length === 0 ? (
        <p className="text-[14px] text-ink-muted">No cash-out links yet.</p>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="rounded-[20px] bg-cream-soft border border-hair-soft p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-ink truncate">{link.title}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${link.isActive ? 'bg-forest-surface text-forest-deep' : 'bg-cream-deep text-ink-muted'}`}>
                    {link.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-[12.5px] text-ink-muted mt-0.5">
                  {assetLabel(link.sourceAsset)} → {link.payoutCurrency}
                  {link.amount ? ` · ${link.amount}` : ' · user chooses amount'}
                </p>
              </div>
              <button onClick={() => copyLink(link.id)} title="Copy link"
                className="p-2 rounded-lg text-ink-muted hover:text-forest hover:bg-forest/5 transition-colors">
                {copiedId === link.id ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <a href={`/cashout/${link.id}`} target="_blank" rel="noreferrer" title="Open"
                className="p-2 rounded-lg text-ink-muted hover:text-forest hover:bg-forest/5 transition-colors">
                <ExternalLink size={16} />
              </a>
              <button onClick={() => toggle(link)}
                className="text-[12px] font-medium text-ink-muted hover:text-ink px-2">
                {link.isActive ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => remove(link.id)} title="Delete"
                className="p-2 rounded-lg text-ink-muted hover:text-terracotta hover:bg-terracotta/5 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
