export default function KybPage() {
  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">KYB onboarding (Nigeria)</h1>
        <p className="text-gray-500 mt-1">Complete business verification before live payouts are enabled.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Verification status pipeline</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {['draft', 'submitted', 'under_review', 'approved', 'rejected'].map((stage) => (
            <span key={stage} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{stage}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Business profile</h3>
          <input placeholder="Registered company name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="CAC RC number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="TIN (Tax Identification Number)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Business category" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Registered business address" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-24" />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Directors & beneficial owners</h3>
          <input placeholder="Director full name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Director BVN/NIN" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Beneficial owner full name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Beneficial owner ownership %" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Required documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            'CAC certificate (status: pending upload)',
            'MEMART / company constitution (status: pending upload)',
            'Board resolution for account operation (status: pending upload)',
            'Proof of business address (status: pending upload)',
            'Corporate bank statement or account proof (status: pending upload)',
          ].map((doc) => (
            <div key={doc} className="p-3 rounded-lg border border-gray-200">{doc}</div>
          ))}
        </div>
        <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">Submit KYB package</button>
      </div>
    </main>
  );
}

