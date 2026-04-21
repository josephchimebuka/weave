export default function OtpSecurityPage() {
  return (
    <main className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">OTP security</h1>
        <p className="text-gray-500 mt-1">Require OTP verification for sensitive merchant operations.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold">Request OTP key</h2>
        <p className="text-sm text-gray-500">Generate a new OTP seed and scan it with your authenticator app.</p>
        <button className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800">
          Generate OTP setup key
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold">Step-up policy</h2>
        <div className="space-y-2 text-sm">
          {[
            'API key rotation',
            'Payout destination changes',
            'Webhook endpoint changes',
            'Team role/permission changes',
          ].map((item) => (
            <label key={item} className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              {item}
            </label>
          ))}
        </div>
      </div>
    </main>
  );
}

