'use client';

import { useState, useEffect } from 'react';
import { Plus, Link as LinkIcon, ExternalLink, Copy, Check, Info, Search, X } from 'lucide-react';
import { isFiat } from '@weave/shared';
import { createPortal } from 'react-dom';

export default function LinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('fiat:NGN');
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [supportedAssets, setSupportedAssets] = useState<{ fiat: any[], crypto: any[] }>({ fiat: [], crypto: [] });

  useEffect(() => {
    fetchLinks();
    fetchSupportedAssets();
  }, []);

  async function fetchSupportedAssets() {
    try {
      const res = await fetch(`/api/assets`);
      const json = await res.json();
      if (json.success) setSupportedAssets(json.data);
    } catch (e) {
      console.error('Failed to fetch supported assets:', e);
    }
  }

  async function fetchLinks() {
    try {
      const res = await fetch('/api/merchant/links');
      const data = await res.json();
      setLinks(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); }
  }

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setSaving(true);
    try {
      const res = await fetch('/api/merchant/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          amount: parseFloat(amount),
          asset
        })
      });
      if (res.ok) {
        setIsCreating(false);
        setTitle('');
        setDescription('');
        setAmount('');
        fetchLinks();
      }
    } catch {}
    finally { setSaving(false); }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/merchant/links?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current })
      });
      if (res.ok) fetchLinks();
    } catch {}
  }

  async function deleteLink(id: string) {
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/merchant/links?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchLinks();
    } catch {}
  }

  function copy(id: string) {
    const url = `${window.location.origin}/pay/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 fade-up">
        <div className="max-w-2xl">
          <h1 className="font-display text-[32px] sm:text-[42px] font-semibold text-ink tracking-tight leading-[1.05]">
            Payment Links
          </h1>
          <p className="text-ink-muted text-[15px] mt-3 leading-relaxed">
            Create reusable hosted checkout pages. Share the link with customers to let them pay you directly via Weave.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 self-start bg-forest text-cream-soft hover:bg-forest-deep px-5 py-3 rounded-full text-[14px] font-medium transition-all shadow-leaf shrink-0"
        >
          <Plus size={16} strokeWidth={2.2} />
          Create Link
        </button>
      </div>

      {isCreating && (
        <Card delay={0}>
          <div className="flex items-center gap-3 mb-6 border-b border-hair-soft pb-4">
            <LinkIcon size={18} strokeWidth={1.9} className="text-forest" />
            <h2 className="font-display text-[22px] font-semibold text-ink">New Payment Link</h2>
          </div>
          
          <form onSubmit={createLink} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[12px] font-semibold text-ink-soft uppercase tracking-widest mb-2">
                  Title / Product Name *
                </label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="e.g. Consultation Session"
                  className="w-full bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink-soft uppercase tracking-widest mb-2">
                  Description
                </label>
                <input 
                  type="text" 
                  placeholder="Optional details shown on payment page"
                  className="w-full bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40"
                  value={description} onChange={(e) => setDescription(e.target.value)}
                />
              </div>
               <div>
                <label className="block text-[12px] font-semibold text-ink-soft uppercase tracking-widest mb-2">
                  Amount *
                </label>
                <input 
                  type="text" 
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40"
                  value={amount} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setAmount(val);
                    }
                  }}
                />
                <p className="mt-1.5 text-[11px] text-ink-muted">
                  {asset.startsWith('crypto:') 
                    ? "Enter the exact token amount the customer will send."
                    : "Enter the fiat amount the customer will pay."}
                </p>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink-soft uppercase tracking-widest mb-2">
                  Asset
                </label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsAssetPickerOpen(true)}
                    className="w-full bg-cream-deep/50 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink text-left flex items-center justify-between hover:border-forest/30 transition-all group"
                  >
                    <span>
                      {isFiat(asset) 
                        ? supportedAssets.fiat.find(f => f.key === asset)?.name || asset
                        : supportedAssets.crypto.find(c => c.key === asset)?.token + ' (' + (supportedAssets.crypto.find(c => c.key === asset)?.name || asset) + ')'
                      }
                    </span>
                    <svg className="text-ink-muted group-hover:text-forest transition-colors" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 rounded-full text-[14px] font-medium text-ink-soft hover:bg-hair transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving || !title}
                className="px-6 py-2.5 rounded-full bg-forest text-cream-soft hover:bg-forest-deep transition-all text-[14px] font-medium disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card delay={80}>
        {loading ? (
           <div className="space-y-4 animate-pulse">
             <div className="h-12 bg-cream-deep/60 rounded-xl" />
             <div className="h-12 bg-cream-deep/60 rounded-xl" />
           </div>
        ) : links.length === 0 ? (
          <div className="py-12 bg-cream-deep/30 rounded-[28px] border border-hair border-dashed flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-cream-soft shadow-leaf flex items-center justify-center text-forest/40 mb-4">
              <LinkIcon size={24} strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-[18px] font-semibold text-ink">No Payment Links yet</h3>
            <p className="text-[14px] text-ink-muted mt-2 max-w-sm">
              Create a link to share securely with your customers across emails, chats, or social media.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hair-soft">
                  <th className="pb-4 px-4 text-[11px] font-semibold text-ink-soft uppercase tracking-widest whitespace-nowrap">Title</th>
                  <th className="hidden sm:table-cell pb-4 px-4 text-[11px] font-semibold text-ink-soft uppercase tracking-widest whitespace-nowrap">Amount</th>
                  <th className="pb-4 px-4 text-[11px] font-semibold text-ink-soft uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="pb-4 px-4 text-[11px] font-semibold text-ink-soft uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b border-hair-soft/50 last:border-0 hover:bg-cream-deep/20 transition-colors group">
                    <td className="py-4 px-4">
                      <p className="font-medium text-[14px] text-ink">{link.title}</p>
                      <div className="flex flex-col sm:hidden mt-0.5">
                        <p className="text-[12px] text-ink-muted font-medium tabular-nums">
                          {link.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {link.asset.split(':').pop()}
                        </p>
                      </div>
                      {link.description && <p className="hidden sm:block text-[12px] text-ink-muted truncate max-w-[200px] mt-0.5">{link.description}</p>}
                    </td>
                    <td className="hidden sm:table-cell py-4 px-4">
                      <p className="text-[14px] text-ink font-medium tabular-nums">
                        {link.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {link.asset.split(':').pop()}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <button 
                        onClick={() => toggleActive(link.id, link.isActive)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all ${
                          link.isActive 
                            ? 'bg-forest/10 text-forest-deep hover:bg-forest/20' 
                            : 'bg-hair-soft text-ink-soft hover:bg-hair'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${link.isActive ? 'bg-forest' : 'bg-ink-muted'}`} />
                        {link.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => window.open(`/pay/${link.id}`, '_blank')}
                          className="w-8 h-8 rounded-full border border-hair-soft flex items-center justify-center text-ink-muted hover:text-ink hover:bg-cream-deep transition-colors"
                          title="Open Link"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button 
                          onClick={() => copy(link.id)}
                          className="w-8 h-8 rounded-full border border-hair-soft flex items-center justify-center text-ink-muted hover:text-forest-deep hover:bg-forest/5 hover:border-forest/20 transition-colors"
                          title="Copy Link"
                        >
                          {copiedId === link.id ? <Check size={14} className="text-forest" /> : <Copy size={14} />}
                        </button>
                        <button 
                          onClick={() => deleteLink(link.id)}
                          className="w-8 h-8 rounded-full border border-hair-soft flex items-center justify-center text-ink-faint hover:text-ink hover:bg-ink-faint transition-colors"
                          title="Delete Link"
                        >
                          <Plus size={14} className="rotate-45" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      
      <div className="flex gap-3 items-center px-4 py-3 bg-forest/5 border border-forest/10 rounded-2xl">
        <Info size={16} className="text-forest flex-shrink-0" />
        <p className="text-[13px] text-forest-deep">Payment links bypass server SDK setup and immediately use your Default Payout Destination rules from the Settings panel.</p>
      </div>

      {/* Asset Picker Modal (Portal) */}
      {isAssetPickerOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-cream-soft border border-hair-soft rounded-[24px] w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-hair-soft bg-white/50 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-ink">Select Asset</h3>
                <button 
                  onClick={() => setIsAssetPickerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-hair transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div className="relative">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search currency or token..."
                  className="w-full bg-cream-deep/60 border border-hair-soft rounded-xl pl-9 pr-4 py-2.5 text-[14px] text-ink focus:outline-none focus:border-forest/40 transition-colors"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                  <Search size={16} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin">
              {/* Fiat Section */}
              {supportedAssets.fiat.filter(f => f.name.toLowerCase().includes(assetSearch.toLowerCase()) || f.key.toLowerCase().includes(assetSearch.toLowerCase())).length > 0 && (
                <div className="mb-2">
                  <div className="sticky top-0 z-10 bg-cream-soft/95 backdrop-blur-sm px-4 py-2 text-[10px] font-bold text-ink-muted uppercase tracking-[0.1em]">Fiat Currencies</div>
                  {supportedAssets.fiat.filter(f => f.name.toLowerCase().includes(assetSearch.toLowerCase()) || f.key.toLowerCase().includes(assetSearch.toLowerCase())).map(f => (
                    <button
                      key={f.key}
                      onClick={() => { setAsset(f.key); setIsAssetPickerOpen(false); setAssetSearch(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all hover:bg-white group ${asset === f.key ? 'bg-forest/5 border border-forest/10 shadow-sm' : 'border border-transparent'}`}
                    >
                      <div className="w-8 h-8 shrink-0 rounded-full bg-cream-deep flex items-center justify-center text-lg shadow-sm border border-hair-soft">
                        {f.flag}
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-[14px] font-semibold text-ink leading-tight">{f.name}</div>
                        <div className="text-[11px] text-ink-muted uppercase tracking-wider mt-0.5">{f.symbol} • {f.country}</div>
                      </div>
                      {asset === f.key && <div className="text-forest shrink-0"><Check size={16} strokeWidth={3} /></div>}
                    </button>
                  ))}
                </div>
              )}

              {/* Crypto Section */}
              {supportedAssets.crypto.filter(c => c.token.toLowerCase().includes(assetSearch.toLowerCase()) || c.name.toLowerCase().includes(assetSearch.toLowerCase())).length > 0 && (
                <div>
                  <div className="sticky top-0 z-10 bg-cream-soft/95 backdrop-blur-sm px-4 py-2 text-[10px] font-bold text-ink-muted uppercase tracking-[0.1em]">Crypto Tokens</div>
                  {supportedAssets.crypto.filter(c => c.token.toLowerCase().includes(assetSearch.toLowerCase()) || c.name.toLowerCase().includes(assetSearch.toLowerCase())).map(c => (
                    <button
                      key={c.key}
                      onClick={() => { setAsset(c.key); setIsAssetPickerOpen(false); setAssetSearch(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all hover:bg-white group ${asset === c.key ? 'bg-forest/5 border border-forest/10 shadow-sm' : 'border border-transparent'}`}
                    >
                      <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden shadow-sm border border-hair-soft relative bg-cream-deep">
                        <img 
                          src={c.logo} 
                          alt={c.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { 
                            e.currentTarget.style.display = 'none'; 
                            e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                          }} 
                        />
                        <div className="hidden absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink-soft uppercase bg-hair">
                          {c.token.slice(0, 2)}
                        </div>
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-[14px] font-semibold text-ink group-hover:text-forest transition-colors leading-tight">{c.token}</div>
                        <div className="text-[11px] text-ink-muted mt-0.5">{c.name}</div>
                      </div>
                      {asset === c.key && <div className="text-forest shrink-0"><Check size={16} strokeWidth={3} /></div>}
                    </button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {supportedAssets.fiat.filter(f => f.name.toLowerCase().includes(assetSearch.toLowerCase())).length === 0 && 
               supportedAssets.crypto.filter(c => c.token.toLowerCase().includes(assetSearch.toLowerCase()) || c.name.toLowerCase().includes(assetSearch.toLowerCase())).length === 0 && (
                 <div className="py-12 text-center text-ink-muted">
                   <div className="mb-3 opacity-20"><Search size={32} className="mx-auto" /></div>
                   <p className="text-[14px] font-medium text-ink">No assets found</p>
                   <p className="text-[12px] mt-1">Try another search term</p>
                 </div>
               )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Shared Card Helper ────────────────────────────────────────────────────────
function Card({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`bg-cream-soft rounded-[32px] p-6 md:p-8 border border-hair-soft shadow-sm fade-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
