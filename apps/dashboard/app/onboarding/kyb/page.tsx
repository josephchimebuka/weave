'use client';

import { useState, useEffect } from 'react';
import { Check, Info, ArrowRight, Upload, Building2, User, FileText, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

type StepStatus = 'done' | 'active' | 'pending';
type Step = { label: string; key: string };

const STEPS: Step[] = [
  { label: 'Identity',         key: 'identity' },
  { label: 'Business Details', key: 'business' },
  { label: 'Documents',        key: 'documents' },
  { label: 'Review',           key: 'review' },
];

const INPUT =
  'w-full bg-cream-deep/40 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 focus:bg-cream-soft transition-colors';

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
          {label}
          {hint && <Info size={12} strokeWidth={1.9} className="text-ink-faint" />}
        </label>
        {optional && <span className="text-[11px] text-ink-faint">Optional</span>}
      </div>
      {children}
    </div>
  );
}

export interface VerificationFormData {
  firstName: string;
  lastName: string;
  dob: string;
  personalAddress: string;
  legalName: string;
  dba: string;
  entityType: string;
  regNumber: string;
  businessAddress: string;
  city: string;
  state: string;
  postalCode: string;
  website: string;
  taxId: string;
}

export default function KybPage() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<VerificationFormData>({
    firstName: '',
    lastName: '',
    dob: '',
    personalAddress: '',
    legalName: '',
    dba: '',
    entityType: '',
    regNumber: '',
    businessAddress: '',
    city: '',
    state: '',
    postalCode: '',
    website: '',
    taxId: '',
  });

  useEffect(() => {
    // Fetch existing progress
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/verification');
        const json = await res.json();
        if (json.success && json.data) {
          setFormData(prev => ({ ...prev, ...json.data }));
        }
      } catch (err) {
        console.error('Failed to fetch verification progress', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveProgress = async () => {
    try {
      await fetch('/api/verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch (err) {
      console.error('Failed to save progress', err);
    }
  };

  const handleNext = async () => {
    await saveProgress();
    if (currentIdx < STEPS.length - 1) {
      setCurrentIdx(currentIdx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/verification/submit', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        router.push('/settings?verification=pending');
      }
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-ink-muted">Loading your progress...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="fade-up">
        <h1 className="font-display text-[42px] font-semibold text-ink tracking-tight leading-none">
          Business Verification
        </h1>
        <p className="text-ink-muted text-[15px] mt-3">
          Complete your business profile to start accepting live payments.
        </p>
      </div>

      {/* Stepper */}
      <div className="relative rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf px-8 py-7 fade-up" style={{ animationDelay: '80ms' }}>
        <ol className="grid grid-cols-4 gap-0 relative">
          {STEPS.map((step, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const isLast = idx === STEPS.length - 1;
            const connectorDone = idx < currentIdx;

            return (
              <li key={step.label} className="relative flex flex-col items-center">
                {!isLast && (
                  <span className={`absolute top-[18px] left-1/2 h-[3px] w-full rounded-full ${connectorDone ? 'bg-forest' : idx === currentIdx ? 'bg-gradient-to-r from-forest to-hair' : 'bg-hair'}`} />
                )}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[13px] transition-all ${done || active ? 'bg-forest text-cream-soft shadow-leaf' : 'bg-cream-deep text-ink-muted border border-hair'}`}>
                  {done ? <Check size={16} strokeWidth={2.5} /> : idx + 1}
                </div>
                <p className={`mt-3 text-[13px] ${active ? 'text-ink font-semibold' : done ? 'text-forest-deep font-medium' : 'text-ink-muted'}`}>
                  {step.label}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step Content */}
      <div className="relative rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf px-8 py-8 fade-up" style={{ animationDelay: '120ms' }}>
        {currentIdx === 0 && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-[30px] font-semibold text-ink tracking-tight leading-tight">Personal Identity</h2>
              <p className="text-[14px] text-ink-muted mt-2">Required for the primary signatory or legal owner of the business.</p>
            </div>
            <div className="rule-dotted" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="First Name">
                <input name="firstName" value={formData.firstName} onChange={handleInputChange} className={INPUT} placeholder="Enter your first name" />
              </Field>
              <Field label="Last Name">
                <input name="lastName" value={formData.lastName} onChange={handleInputChange} className={INPUT} placeholder="Enter your last name" />
              </Field>
              <Field label="Date of Birth" hint>
                <input name="dob" type="date" value={formData.dob} onChange={handleInputChange} className={INPUT} />
              </Field>
              <Field label="Home Address">
                <input name="personalAddress" value={formData.personalAddress} onChange={handleInputChange} className={INPUT} placeholder="Residential address" />
              </Field>
            </div>
          </div>
        )}

        {currentIdx === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-[30px] font-semibold text-ink tracking-tight leading-tight">Business Details</h2>
              <p className="text-[14px] text-ink-muted mt-2">Provide official information about your company.</p>
            </div>
            <div className="rule-dotted" />
            <div className="space-y-6">
              <Field label="Legal Business Name" hint>
                <input name="legalName" value={formData.legalName} onChange={handleInputChange} className={INPUT} placeholder="e.g. Green Valley Farms LLC" />
              </Field>
              <Field label="Doing Business As (DBA)" optional>
                <input name="dba" value={formData.dba} onChange={handleInputChange} className={INPUT} placeholder="e.g. Green Valley Market" />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Entity Type">
                  <div className="relative">
                    <select name="entityType" value={formData.entityType} onChange={handleInputChange} className={`${INPUT} appearance-none pr-10 cursor-pointer`}>
                      <option value="" disabled>Select type...</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                      <option value="LLC">LLC</option>
                      <option value="Cooperative">Cooperative</option>
                      <option value="Corporation">Corporation</option>
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted text-[11px]">▾</span>
                  </div>
                </Field>
                <Field label="Registration / EIN Number">
                  <input name="regNumber" value={formData.regNumber} onChange={handleInputChange} className={INPUT} placeholder="XX-XXXXXXX" />
                </Field>
              </div>
              <div className="pt-4">
                <h3 className="font-display text-[22px] font-semibold text-ink mb-4">Registered Business Address</h3>
                <div className="space-y-5">
                  <Field label="Street Address">
                    <input name="businessAddress" value={formData.businessAddress} onChange={handleInputChange} className={INPUT} />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="City"><input name="city" value={formData.city} onChange={handleInputChange} className={INPUT} /></Field>
                    <Field label="State / Province"><input name="state" value={formData.state} onChange={handleInputChange} className={INPUT} /></Field>
                    <Field label="Postal Code"><input name="postalCode" value={formData.postalCode} onChange={handleInputChange} className={INPUT} /></Field>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentIdx === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-[30px] font-semibold text-ink tracking-tight leading-tight">Verification Documents</h2>
              <p className="text-[14px] text-ink-muted mt-2">Upload clear photos or PDFs of the required legal documents.</p>
            </div>
            <div className="rule-dotted" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border-2 border-dashed border-hair rounded-[24px] hover:border-forest/40 transition-colors cursor-pointer bg-cream-deep/20 text-center">
                <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-4 text-forest-deep"><Upload size={20} /></div>
                <h4 className="font-semibold text-ink text-[16px]">Business Certificate</h4>
                <p className="text-ink-muted text-[12px] mt-1">Incorporation or Registration papers (PDF, JPG)</p>
              </div>
              <div className="p-6 border-2 border-dashed border-hair rounded-[24px] hover:border-forest/40 transition-colors cursor-pointer bg-cream-deep/20 text-center">
                <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-4 text-forest-deep"><User size={20} /></div>
                <h4 className="font-semibold text-ink text-[16px]">Identity Document</h4>
                <p className="text-ink-muted text-[12px] mt-1">Passport or Government Issued ID</p>
              </div>
            </div>
            <div className="bg-tan-soft/30 rounded-2xl p-4 flex gap-3 border border-tan-mist/50">
              <Info size={16} className="text-tan-deep mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-tan-deep leading-relaxed">Please ensure all edges of the documents are visible and the text is clearly legible. Verification usually take 2-3 business days.</p>
            </div>
          </div>
        )}

        {currentIdx === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-[30px] font-semibold text-ink tracking-tight leading-tight">Final Review</h2>
              <p className="text-[14px] text-ink-muted mt-2">Please double check your information before submitting.</p>
            </div>
            <div className="rule-dotted" />
            <div className="bg-cream-deep/30 rounded-[28px] p-6 border border-hair-soft space-y-6">
              <div className="grid grid-cols-2 gap-y-4 text-[14px]">
                <span className="text-ink-muted">Signatory</span><span className="font-medium text-ink">{formData.firstName} {formData.lastName}</span>
                <span className="text-ink-muted">Business</span><span className="font-medium text-ink">{formData.legalName}</span>
                <span className="text-ink-muted">Type</span><span className="font-medium text-ink">{formData.entityType}</span>
                <span className="text-ink-muted">Address</span><span className="font-medium text-ink">{formData.businessAddress}, {formData.city}, {formData.state}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-hair-soft">
          <button
            type="button"
            onClick={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)}
            className={`text-[14px] font-medium transition-colors ${currentIdx === 0 ? 'text-ink-faint cursor-not-allowed' : 'text-ink-muted hover:text-forest-deep underline underline-offset-4'}`}
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => { await saveProgress(); router.push('/settings'); }}
              className="px-6 py-3 rounded-full border border-hair hover:border-forest/30 bg-cream-soft text-ink-soft hover:text-forest-deep text-[14px] font-medium transition-all"
            >
              Save &amp; exit
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-forest text-cream-soft text-[14px] font-semibold hover:bg-forest-deep transition-all shadow-leaf disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : currentIdx === STEPS.length - 1 ? 'Submit Application' : 'Continue'}
              {!submitting && <ArrowRight size={14} strokeWidth={2.2} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
