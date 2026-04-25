'use client';

import { useState, useEffect } from 'react';
import { Check, Info, ArrowRight, Upload, Building2, User, FileText, Search, Bell } from 'lucide-react';
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
  documentUrls?: Array<{ type: string; url: string }>;
}

export default function KybPage() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('none');
  
  // File state (kept in memory until final submission)
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  
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
          setVerificationStatus(json.data.status || 'none');
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

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'weave-cloud';
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'kyb_documents';
    
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', preset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: data,
    });
    
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const json = await res.json();
    return json.secure_url;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setUploading(true);
    try {
      // Start with existing URLs so we don't overwrite with empty
      const documentUrls: Array<{ type: string; url: string }> = [...(formData.documentUrls || [])];
      
      // 1. Upload new files only if selected
      if (certificateFile) {
        const url = await uploadToCloudinary(certificateFile);
        // Replace existing of same type or add
        const idx = documentUrls.findIndex(d => d.type === 'business_certificate');
        if (idx > -1) documentUrls[idx].url = url;
        else documentUrls.push({ type: 'business_certificate', url });
      }
      if (identityFile) {
        const url = await uploadToCloudinary(identityFile);
        const idx = documentUrls.findIndex(d => d.type === 'identity_document');
        if (idx > -1) documentUrls[idx].url = url;
        else documentUrls.push({ type: 'identity_document', url });
      }

      // 2. Save final metadata with URLs
      await fetch('/api/verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, documentUrls }),
      });

      // 3. Final submission
      const res = await fetch('/api/verification/submit', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setIsSuccess(true);
        setVerificationStatus('pending');
      }
    } catch (err) {
      console.error('Submission failed', err);
      alert('Failed to submit application. Please check your document sizes and try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-ink-muted">Loading your progress...</div>;

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-10 fade-up">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-forest/20 rounded-full animate-ping opacity-25" />
          <div className="relative w-24 h-24 bg-forest rounded-full flex items-center justify-center shadow-leaf-lg ring-8 ring-forest-surface">
            <Check size={44} className="text-white" strokeWidth={3} />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="font-display text-[48px] lg:text-[56px] font-semibold text-ink tracking-tight leading-none">Application Under Review</h1>
          <p className="text-ink-muted text-[17px] max-w-lg mx-auto leading-relaxed">
            Your business verification is being processed by our compliance team. We've received your documents safely.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
          <div className="bg-cream-soft border border-hair-soft rounded-3xl p-6 text-left space-y-2 hover:border-forest/20 transition-colors">
            <div className="w-10 h-10 bg-forest/10 rounded-full flex items-center justify-center text-forest-deep mb-2">
              <Search size={20} />
            </div>
            <p className="text-[15px] font-semibold text-ink">1-3 Day Review</p>
            <p className="text-[13px] text-ink-muted leading-snug">Our team manually verifies all documents to ensure platform security.</p>
          </div>
          <div className="bg-cream-soft border border-hair-soft rounded-3xl p-6 text-left space-y-2 hover:border-forest/20 transition-colors">
            <div className="w-10 h-10 bg-forest/10 rounded-full flex items-center justify-center text-forest-deep mb-2">
              <Bell size={20} />
            </div>
            <p className="text-[15px] font-semibold text-ink">Email Update</p>
            <p className="text-[13px] text-ink-muted leading-snug">We&apos;ll send you a confirmation email as soon as your account is approved.</p>
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => router.push('/settings')}
            className="inline-flex items-center gap-2 bg-ink text-white px-10 py-4 rounded-full text-[15px] font-semibold hover:bg-forest-deep transition-all shadow-leaf"
          >
            Return to Dashboard
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'verified') {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-10 fade-up">
        <div className="w-24 h-24 bg-forest/10 rounded-full flex items-center justify-center mx-auto text-forest ring-8 ring-forest/5">
          <Check size={48} strokeWidth={3} />
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-[48px] font-semibold text-ink tracking-tight leading-tight">Merchant Verified</h2>
          <p className="text-ink-muted text-[17px] max-w-lg mx-auto leading-relaxed">
            Your business has been fully verified. Your account is active and you can now accept live payments with higher limits.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
          <div className="bg-forest/5 border border-forest/10 rounded-3xl p-6 text-left space-y-1">
             <p className="text-[14px] font-semibold text-forest-deep">Compliance Status</p>
             <p className="text-[12px] text-forest/70 uppercase font-bold tracking-widest">Active & Verified</p>
          </div>
          <div className="bg-cream-soft border border-hair-soft rounded-3xl p-6 text-left space-y-1">
             <p className="text-[14px] font-semibold text-ink">Next Renewal</p>
             <p className="text-[12px] text-ink-muted uppercase font-bold tracking-widest">April 2027</p>
          </div>
        </div>

        <div className="pt-8">
          <button 
            onClick={() => router.push('/settings')}
            className="inline-flex items-center gap-2 bg-ink text-white px-10 py-4 rounded-full text-[15px] font-semibold hover:bg-forest-deep transition-all shadow-leaf"
          >
            Go to Settings
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'pending') {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-10 fade-up">
        <div className="w-20 h-20 bg-cream-deep rounded-full flex items-center justify-center mx-auto text-ink-muted ring-8 ring-cream-soft">
          <Search size={36} />
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-[42px] font-semibold text-ink tracking-tight leading-tight">Review in Progress</h2>
          <p className="text-ink-muted text-[17px] max-w-lg mx-auto leading-relaxed">
            We are currently reviewing your business details. This typically takes <strong>1-3 business days</strong>. We will notify you via email as soon as the review is complete.
          </p>
        </div>

        <div className="rule-dotted max-w-xs mx-auto" />
        
        <div className="inline-flex items-center gap-3 bg-white border border-hair-soft px-5 py-3 rounded-2xl shadow-sm">
          <div className="w-2 h-2 rounded-full bg-tan animate-pulse" />
          <span className="text-[13px] font-semibold text-ink-soft uppercase tracking-widest">
            Current Status: <span className="text-tan-deep underline decoration-2 underline-offset-4">{verificationStatus}</span>
          </span>
        </div>

        <div className="pt-8">
          <button 
            onClick={() => router.push('/settings')}
            className="text-[14px] font-semibold text-forest-deep hover:text-forest flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            ← Back to settings
          </button>
        </div>
      </div>
    );
  }

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
              <label className={`block p-6 border-2 border-dashed rounded-[24px] transition-all cursor-pointer text-center ${certificateFile || formData.documentUrls?.some(d => d.type === 'business_certificate') ? 'border-forest bg-forest/5' : 'border-hair bg-cream-deep/20 hover:border-forest/40'}`}>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                />
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${(certificateFile || formData.documentUrls?.some(d => d.type === 'business_certificate')) ? 'bg-forest text-white' : 'bg-forest/10 text-forest-deep'}`}>
                  {(certificateFile || formData.documentUrls?.some(d => d.type === 'business_certificate')) ? <Check size={20} /> : <Upload size={20} />}
                </div>
                <h4 className="font-semibold text-ink text-[16px]">Business Certificate</h4>
                <p className="text-ink-muted text-[12px] mt-1">
                  {certificateFile ? certificateFile.name : formData.documentUrls?.find(d => d.type === 'business_certificate') ? 'Document attached' : 'Incorporation or Registration papers (PDF, JPG)'}
                </p>
              </label>

              <label className={`block p-6 border-2 border-dashed rounded-[24px] transition-all cursor-pointer text-center ${identityFile || formData.documentUrls?.some(d => d.type === 'identity_document') ? 'border-forest bg-forest/5' : 'border-hair bg-cream-deep/20 hover:border-forest/40'}`}>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setIdentityFile(e.target.files?.[0] || null)}
                />
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${(identityFile || formData.documentUrls?.some(d => d.type === 'identity_document')) ? 'bg-forest text-white' : 'bg-forest/10 text-forest-deep'}`}>
                  {(identityFile || formData.documentUrls?.some(d => d.type === 'identity_document')) ? <Check size={20} /> : <User size={20} />}
                </div>
                <h4 className="font-semibold text-ink text-[16px]">Identity Document</h4>
                <p className="text-ink-muted text-[12px] mt-1">
                  {identityFile ? identityFile.name : formData.documentUrls?.find(d => d.type === 'identity_document') ? 'Document attached' : 'Passport or Government Issued ID'}
                </p>
              </label>
            </div>
            <div className="bg-tan-soft/30 rounded-2xl p-4 flex gap-3 border border-tan-mist/50">
              <Info size={16} className="text-tan-deep mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-tan-deep leading-relaxed">Please ensure all edges of the documents are visible and the text is clearly legible. Files are uploaded securely only when you click submit.</p>
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
                <span className="text-ink-muted">Documents</span><span className="font-medium text-ink">
                  {((certificateFile || formData.documentUrls?.some(d => d.type === 'business_certificate')) ? 1 : 0) + 
                   ((identityFile || formData.documentUrls?.some(d => d.type === 'identity_document')) ? 1 : 0)} files attached
                </span>
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
              {uploading ? 'Uploading Docs...' : submitting ? 'Submitting...' : currentIdx === STEPS.length - 1 ? 'Submit Application' : 'Continue'}
              {!submitting && !uploading && <ArrowRight size={14} strokeWidth={2.2} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
