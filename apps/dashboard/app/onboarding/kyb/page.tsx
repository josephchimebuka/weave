'use client';

import { useState, useEffect } from 'react';
import { Check, Info, ArrowRight, Upload, Building2, User, FileText, Search, Bell } from 'lucide-react';
import { Select } from '../../../components/Select';
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

// Industry taxonomy mirrors our payment processor's required `industry` enum exactly
// (canonical underscore values), grouped with friendly labels for the dropdown. The
// stored value is the canonical one, so onboarding relays it directly.
const INDUSTRY_GROUPS: Array<{ group: string; options: Array<{ value: string; label: string }> }> = [
  { group: 'Commerce & Retail', options: [
    { value: 'Commerce_PhysicalGoods', label: 'Physical Goods' },
    { value: 'Commerce_DigitalGoods', label: 'Digital Goods' },
    { value: 'Commerce_DigitalServices', label: 'Digital Services' },
    { value: 'Commerce_PhysicalServices', label: 'Physical Services' },
    { value: 'Commerce_ProfessionalServices', label: 'Professional Services' },
    { value: 'Commerce_LegalServices', label: 'Legal Services' },
    { value: 'Commerce_Automobiles', label: 'Automobiles' },
    { value: 'Commerce_RealEstate', label: 'Real Estate' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Wholesale', label: 'Wholesale' },
    { value: 'Construction', label: 'Construction' },
    { value: 'FreelanceProfessional', label: 'Freelance Professional' },
  ] },
  { group: 'Food & Hospitality', options: [
    { value: 'Hospitality_Restaurants', label: 'Restaurants' },
    { value: 'Hospitality_Hotels', label: 'Hotels' },
  ] },
  { group: 'Health', options: [
    { value: 'Health_Hospitals', label: 'Hospitals' },
    { value: 'Health_Pharmacies', label: 'Pharmacies' },
    { value: 'Health_Gyms', label: 'Gyms' },
    { value: 'Health_Telemedicine', label: 'Telemedicine' },
    { value: 'Health_MedicalLaboratories', label: 'Medical Laboratories' },
    { value: 'Health_HerbalMedicine', label: 'Herbal Medicine' },
  ] },
  { group: 'Education', options: [
    { value: 'Education_NurserySchools', label: 'Nursery Schools' },
    { value: 'Education_PrimarySchools', label: 'Primary Schools' },
    { value: 'Education_SecondarySchools', label: 'Secondary Schools' },
    { value: 'Education_TertiaryInstitutions', label: 'Tertiary Institutions' },
    { value: 'Education_VocationalTraining', label: 'Vocational Training' },
    { value: 'Education_VirtualLearning', label: 'Virtual Learning' },
    { value: 'Education_OtherEducationalServices', label: 'Other Educational Services' },
  ] },
  { group: 'Financial Services', options: [
    { value: 'FinancialServices_PaymentSolutionServiceProviders', label: 'Payment Solution Providers' },
    { value: 'FinancialServices_CorporateServices', label: 'Corporate Services' },
    { value: 'FinancialServices_FinancialCooperatives', label: 'Financial Cooperatives' },
    { value: 'FinancialServices_Insurance', label: 'Insurance' },
    { value: 'FinancialServices_Investments', label: 'Investments' },
    { value: 'FinancialServices_AgriculturalInvestments', label: 'Agricultural Investments' },
    { value: 'FinancialServices_Lending', label: 'Lending' },
    { value: 'FinancialServices_BillPayments', label: 'Bill Payments' },
    { value: 'FinancialServices_Payroll', label: 'Payroll' },
    { value: 'FinancialServices_Remittances', label: 'Remittances' },
    { value: 'FinancialServices_Savings', label: 'Savings' },
    { value: 'FinancialServices_MobileWallets', label: 'Mobile Wallets' },
  ] },
  { group: 'Logistics & Travel', options: [
    { value: 'Logistics_CourierServices', label: 'Courier Services' },
    { value: 'Logistics_FreightServices', label: 'Freight Services' },
    { value: 'Travel_Airlines', label: 'Airlines' },
    { value: 'Travel_Ridesharing', label: 'Ridesharing' },
    { value: 'Travel_TourServices', label: 'Tour Services' },
    { value: 'Travel_Transportation', label: 'Transportation' },
    { value: 'Travel_TravelAgencies', label: 'Travel Agencies' },
  ] },
  { group: 'Media, Arts & Nonprofits', options: [
    { value: 'Nonprofits_NGOs', label: 'NGOs' },
    { value: 'Nonprofits_ReligiousOrganizations', label: 'Religious Organizations' },
    { value: 'Nonprofits_ProfessionalAssociations', label: 'Professional Associations' },
    { value: 'Nonprofits_PoliticalParties', label: 'Political Parties' },
    { value: 'Nonprofits_Leisure_Entertainment', label: 'Leisure & Entertainment' },
    { value: 'Nonprofits_Cinemas', label: 'Cinemas' },
    { value: 'Nonprofits_Nightclubs', label: 'Nightclubs' },
    { value: 'Nonprofits_Events', label: 'Events' },
    { value: 'Nonprofits_Press_Media', label: 'Press & Media' },
    { value: 'Nonprofits_RecreationCentres', label: 'Recreation Centres' },
    { value: 'Nonprofits_StreamingServices', label: 'Streaming Services' },
    { value: 'Unions', label: 'Unions' },
  ] },
  { group: 'Utilities', options: [
    { value: 'Utilities_Electricity', label: 'Electricity' },
    { value: 'Utilities_Water', label: 'Water' },
    { value: 'Utilities_Internet', label: 'Internet' },
    { value: 'Utilities_Telecoms', label: 'Telecoms' },
    { value: 'Utilities_CableTelevision', label: 'Cable Television' },
    { value: 'Utilities_Garbage_Disposal', label: 'Garbage Disposal' },
  ] },
  { group: 'Agriculture', options: [
    { value: 'Agriculture_AgriculturalServices', label: 'Agricultural Services' },
    { value: 'Agriculture_AgriculturalCooperatives', label: 'Agricultural Cooperatives' },
  ] },
  { group: 'Gaming', options: [
    { value: 'Gaming_Betting', label: 'Betting' },
    { value: 'Gaming_Lotteries', label: 'Lotteries' },
    { value: 'Gaming_PredictionServices', label: 'Prediction Services' },
  ] },
  { group: 'Other', options: [
    { value: 'OtherProfessionalServices', label: 'Other Professional Services' },
  ] },
];

// Friendly label for a stored industry value (falls back to de-underscored raw).
function industryLabel(value: string): string {
  for (const g of INDUSTRY_GROUPS) {
    const o = g.options.find(x => x.value === value);
    if (o) return o.label;
  }
  return (value || '').replace(/_/g, ' ');
}

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
  websiteUrl: string;
  productDescription: string;
  supportEmail: string;
  productCategory: string;
  socialMedia: string;
  businessBvn: string;
  dateOfRegistration: string;
  directorBvn: string;
  directorPhone: string;
  ownershipPercentage: string;
  documentUrls?: Array<{ type: string; url: string }>;
}

export default function KybPage() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('none');
  // A submitted-but-not-yet-approved (pending) KYB can be reopened for editing.
  const [editing, setEditing] = useState(false);
  
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
    websiteUrl: '',
    productDescription: '',
    supportEmail: '',
    productCategory: '',
    socialMedia: '',
    businessBvn: '',
    dateOfRegistration: '',
    directorBvn: '',
    directorPhone: '',
    ownershipPercentage: '',
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
          // Existing merchants who submitted KYB before the business-profile fields
          // existed are missing them — flag it (computed once, at load) so they get a
          // focused prompt to fill just the gap rather than nothing.
          const bp = ['websiteUrl', 'productDescription', 'supportEmail', 'productCategory', 'businessBvn', 'dateOfRegistration', 'directorBvn'] as const;
          // A phone that's present but not a valid 11-digit NG number also counts as
          // "missing" so the merchant can re-enter it (a verified merchant otherwise
          // has no way to correct an already-submitted bad value).
          const normNgPhone = (raw: string) => {
            let n = String(raw ?? '').replace(/\D/g, '');
            if (n.startsWith('234')) n = '0' + n.slice(3);
            else if (n.length === 10) n = '0' + n;
            return n.length === 11;
          };
          setProfileMissing(bp.some(k => !json.data[k]) || !normNgPhone(json.data.directorPhone));
        }
      } catch (err) {
        console.error('Failed to fetch verification progress', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveProgress = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to save progress', err);
      return false;
    }
  };

  // Save just the business-profile gap for an already-submitted merchant (no status
  // change — a partial PATCH). Clears the prompt so they fall through to their status.
  const saveBusinessProfile = async () => {
    setSavingProfile(true);
    const ok = await saveProgress();
    setSavingProfile(false);
    // Only dismiss the prompt if the save actually persisted — otherwise the merchant
    // would think they finished while their details were silently dropped.
    if (ok) setProfileMissing(false);
    else alert('Could not save your details. Please check your connection and try again.');
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
    const signRes = await fetch('/api/cloudinary-sign', { method: 'POST' });
    if (!signRes.ok) throw new Error('Failed to get upload signature');
    const { timestamp, signature, apiKey, cloudName, folder, type } = await signRes.json();

    const data = new FormData();
    data.append('file', file);
    data.append('timestamp', String(timestamp));
    data.append('signature', signature);
    data.append('api_key', apiKey);
    data.append('folder', folder);
    if (type) data.append('type', type);

    // type=authenticated tells Cloudinary to gate delivery behind signed URLs.
    // The /image/<type>/... segment in the returned secure_url reflects this.
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
        setEditing(false);
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
          <h1 className="font-display text-[32px] sm:text-[48px] lg:text-[56px] font-semibold text-ink tracking-tight leading-none">Application Under Review</h1>
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

  // Already-submitted merchants missing the newer business-profile fields — prompt
  // for just those, without redoing (or invalidating) their existing verification.
  if (!loading && profileMissing && (verificationStatus === 'verified' || verificationStatus === 'pending')) {
    return (
      <div className="max-w-2xl mx-auto py-16 fade-up">
        <div className="text-center space-y-3 mb-8">
          <h2 className="font-display text-[32px] sm:text-[40px] font-semibold text-ink tracking-tight">A few new details</h2>
          <p className="text-ink-muted text-[15px] max-w-lg mx-auto leading-relaxed">
            A few extra details are needed to enable naira payments and keep your compliance current. Your verification stays intact — just fill these in.
          </p>
        </div>
        <div className="bg-cream-soft border border-hair-soft rounded-[24px] shadow-leaf p-7 space-y-5">
          <Field label="Business Website">
            <input name="websiteUrl" type="url" value={formData.websiteUrl} onChange={handleInputChange} className={INPUT} placeholder="https://yourbusiness.com" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Support Email">
              <input name="supportEmail" type="email" value={formData.supportEmail} onChange={handleInputChange} className={INPUT} placeholder="support@yourbusiness.com" />
            </Field>
            <Field label="Product Category">
              <Select name="productCategory" value={formData.productCategory} onChange={handleInputChange} className={`${INPUT.replace('px-4', 'pl-4')} cursor-pointer`}>
                <option value="" disabled>Select an industry…</option>
                {INDUSTRY_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Product / Service Description">
            <textarea name="productDescription" value={formData.productDescription} onChange={handleInputChange} rows={3} className={`${INPUT} resize-none`} placeholder="What does your business sell or offer?" />
          </Field>
          <Field label="Social Media" optional>
            <input name="socialMedia" value={formData.socialMedia} onChange={handleInputChange} className={INPUT} placeholder="Instagram / X / LinkedIn handle or URL" />
          </Field>

          <div className="pt-2 border-t border-hair-soft" />
          <p className="text-[13px] text-ink-soft">Required to enable <span className="font-medium text-ink">naira payments</span>:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Business BVN">
              <input name="businessBvn" inputMode="numeric" maxLength={11} value={formData.businessBvn} onChange={handleInputChange} className={INPUT} placeholder="11-digit business BVN" />
            </Field>
            <Field label="Date of Registration">
              <input name="dateOfRegistration" type="date" value={formData.dateOfRegistration} onChange={handleInputChange} className={INPUT} />
            </Field>
            <Field label="Director's BVN">
              <input name="directorBvn" inputMode="numeric" maxLength={11} value={formData.directorBvn} onChange={handleInputChange} className={INPUT} placeholder="11-digit BVN" />
            </Field>
            <Field label="Director's Phone">
              <input name="directorPhone" type="tel" value={formData.directorPhone} onChange={handleInputChange} className={INPUT} placeholder="e.g. 08012345678" />
            </Field>
            <Field label="Ownership Stake (%)" optional>
              <input name="ownershipPercentage" inputMode="numeric" value={formData.ownershipPercentage} onChange={handleInputChange} className={INPUT} placeholder="e.g. 100" />
            </Field>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={saveBusinessProfile}
              disabled={savingProfile || !formData.websiteUrl || !formData.supportEmail || !formData.productCategory || !formData.productDescription || !formData.businessBvn || !formData.dateOfRegistration || !formData.directorBvn}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-forest text-cream-soft text-[14px] font-semibold hover:bg-forest-deep transition-all shadow-leaf disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingProfile ? 'Saving…' : 'Save & finish'}
            </button>
          </div>
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
          <h2 className="font-display text-[32px] sm:text-[48px] font-semibold text-ink tracking-tight leading-tight">Merchant Verified</h2>
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

  if (verificationStatus === 'pending' && !editing) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-10 fade-up">
        <div className="w-20 h-20 bg-cream-deep rounded-full flex items-center justify-center mx-auto text-ink-muted ring-8 ring-cream-soft">
          <Search size={36} />
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-[30px] sm:text-[42px] font-semibold text-ink tracking-tight leading-tight">Review in Progress</h2>
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

        <p className="text-[13px] text-ink-muted">Need to fix something? You can still edit your details while the review is in progress.</p>

        <div className="pt-4 flex items-center justify-center gap-6">
          <button
            onClick={() => { setEditing(true); setCurrentIdx(0); }}
            className="text-[14px] font-semibold text-forest-deep hover:text-forest transition-colors"
          >
            Edit details
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="text-[14px] font-semibold text-ink-soft hover:text-ink flex items-center justify-center gap-2 transition-colors"
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
        <h1 className="font-display text-[32px] sm:text-[42px] font-semibold text-ink tracking-tight leading-none">
          Business Verification
        </h1>
        <p className="text-ink-muted text-[15px] mt-3">
          Complete your business profile to start accepting live payments.
        </p>
      </div>

      {/* Stepper */}
      <div className="relative rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf px-4 sm:px-8 py-7 fade-up" style={{ animationDelay: '80ms' }}>
        <ol className="flex sm:grid sm:grid-cols-4 gap-4 sm:gap-0 relative overflow-x-auto sm:overflow-visible no-scrollbar">
          {STEPS.map((step, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const isLast = idx === STEPS.length - 1;
            const connectorDone = idx < currentIdx;

            return (
              <li key={step.label} className="relative flex flex-col items-center min-w-[80px] sm:min-w-0 flex-1">
                {!isLast && (
                  <span className={`hidden sm:block absolute top-[18px] left-1/2 h-[3px] w-full rounded-full ${connectorDone ? 'bg-forest' : idx === currentIdx ? 'bg-gradient-to-r from-forest to-hair' : 'bg-hair'}`} />
                )}
                <div className={`relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-[12px] sm:text-[13px] transition-all ${done || active ? 'bg-forest text-cream-soft shadow-leaf' : 'bg-cream-deep text-ink-muted border border-hair'}`}>
                  {done ? <Check size={16} strokeWidth={2.5} /> : idx + 1}
                </div>
                <p className={`mt-3 text-[11px] sm:text-[13px] text-center whitespace-nowrap ${active ? 'text-ink font-semibold' : done ? 'text-forest-deep font-medium' : 'text-ink-muted'}`}>
                  {step.label}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step Content */}
      <div className="relative rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf px-5 sm:px-8 py-8 fade-up" style={{ animationDelay: '120ms' }}>
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
              <Field label="Bank Verification Number (BVN)">
                <input name="directorBvn" inputMode="numeric" maxLength={11} value={formData.directorBvn} onChange={handleInputChange} className={INPUT} placeholder="11-digit BVN" />
              </Field>
              <Field label="Phone Number">
                <input name="directorPhone" type="tel" value={formData.directorPhone} onChange={handleInputChange} className={INPUT} placeholder="e.g. 08012345678" />
              </Field>
              <Field label="Ownership Stake (%)" optional>
                <input name="ownershipPercentage" inputMode="numeric" value={formData.ownershipPercentage} onChange={handleInputChange} className={INPUT} placeholder="e.g. 100" />
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
                <Field label="Registration Type">
                  <Select name="entityType" value={formData.entityType} onChange={handleInputChange} className={`${INPUT.replace('px-4', 'pl-4')} cursor-pointer`}>
                    <option value="" disabled>Select type...</option>
                    <option value="Private_Incorporated">Private Limited Company (LTD)</option>
                    <option value="Public_Incorporated">Public Limited Company (PLC)</option>
                    <option value="Business_Name">Business Name / Sole Proprietorship</option>
                    <option value="Incorporated_Trustees">Incorporated Trustees (NGO / Association)</option>
                    <option value="Cooperative_Society">Cooperative Society</option>
                    <option value="Free_Zone">Free Zone Entity</option>
                    <option value="Private_Incorporated_Gov">Government-Owned Company</option>
                    <option value="Gov">Government Agency</option>
                  </Select>
                </Field>
                <Field label="Registration / EIN Number">
                  <input name="regNumber" value={formData.regNumber} onChange={handleInputChange} className={INPUT} placeholder="XX-XXXXXXX" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Business BVN">
                  <input name="businessBvn" inputMode="numeric" maxLength={11} value={formData.businessBvn} onChange={handleInputChange} className={INPUT} placeholder="11-digit business BVN" />
                </Field>
                <Field label="Date of Registration">
                  <input name="dateOfRegistration" type="date" value={formData.dateOfRegistration} onChange={handleInputChange} className={INPUT} />
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
              <div className="pt-4">
                <h3 className="font-display text-[22px] font-semibold text-ink mb-4">Business Profile</h3>
                <div className="space-y-5">
                  <Field label="Business Website">
                    <input name="websiteUrl" type="url" value={formData.websiteUrl} onChange={handleInputChange} className={INPUT} placeholder="https://yourbusiness.com" />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Support Email">
                      <input name="supportEmail" type="email" value={formData.supportEmail} onChange={handleInputChange} className={INPUT} placeholder="support@yourbusiness.com" />
                    </Field>
                    <Field label="Product Category">
                      <Select name="productCategory" value={formData.productCategory} onChange={handleInputChange} className={`${INPUT.replace('px-4', 'pl-4')} cursor-pointer`}>
                        <option value="" disabled>Select an industry…</option>
                {INDUSTRY_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </optgroup>
                ))}
                      </Select>
                    </Field>
                  </div>
                  <Field label="Product / Service Description">
                    <textarea name="productDescription" value={formData.productDescription} onChange={handleInputChange} rows={3} className={`${INPUT} resize-none`} placeholder="What does your business sell or offer?" />
                  </Field>
                  <Field label="Social Media" optional>
                    <input name="socialMedia" value={formData.socialMedia} onChange={handleInputChange} className={INPUT} placeholder="Instagram / X / LinkedIn handle or URL" />
                  </Field>
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
              {(() => {
                const Row = ({ label, value }: { label: string; value: string }) => (
                  <>
                    <span className="text-ink-muted">{label}</span>
                    <span className="font-medium text-ink break-words">{value || '—'}</span>
                  </>
                );
                const fd = formData;
                const docCount =
                  ((certificateFile || fd.documentUrls?.some(d => d.type === 'business_certificate')) ? 1 : 0) +
                  ((identityFile || fd.documentUrls?.some(d => d.type === 'identity_document')) ? 1 : 0);
                const addr = [fd.businessAddress, fd.city, fd.state, fd.postalCode].filter(Boolean).join(', ');
                return (
                  <>
                    <div>
                      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-3">Primary Signatory</h3>
                      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
                        <Row label="Name" value={`${fd.firstName} ${fd.lastName}`.trim()} />
                        <Row label="Date of Birth" value={fd.dob} />
                        <Row label="Home Address" value={fd.personalAddress} />
                        <Row label="BVN" value={fd.directorBvn} />
                        <Row label="Phone" value={fd.directorPhone} />
                        <Row label="Ownership" value={fd.ownershipPercentage ? `${fd.ownershipPercentage}%` : ''} />
                      </div>
                    </div>
                    <div className="rule-dotted" />
                    <div>
                      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-3">Business</h3>
                      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
                        <Row label="Legal Name" value={fd.legalName} />
                        {fd.dba ? <Row label="Trading As" value={fd.dba} /> : null}
                        <Row label="Registration Type" value={fd.entityType.replace(/_/g, ' ')} />
                        <Row label="Registration No." value={fd.regNumber} />
                        <Row label="Business BVN" value={fd.businessBvn} />
                        <Row label="Date of Registration" value={fd.dateOfRegistration} />
                        <Row label="Address" value={addr} />
                      </div>
                    </div>
                    <div className="rule-dotted" />
                    <div>
                      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-3">Business Profile</h3>
                      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
                        <Row label="Industry" value={industryLabel(fd.productCategory)} />
                        <Row label="Website" value={fd.websiteUrl} />
                        <Row label="Support Email" value={fd.supportEmail} />
                        <Row label="Description" value={fd.productDescription} />
                        {fd.socialMedia ? <Row label="Social Media" value={fd.socialMedia} /> : null}
                      </div>
                    </div>
                    <div className="rule-dotted" />
                    <div>
                      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-3">Documents</h3>
                      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
                        <Row label="Attached" value={`${docCount} file${docCount === 1 ? '' : 's'}`} />
                      </div>
                    </div>
                  </>
                );
              })()}
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
