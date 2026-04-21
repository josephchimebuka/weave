const ROLE_OPTIONS = ['owner', 'admin', 'finance', 'developer', 'read-only'] as const;

export default function SettingsPage() {
  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Business settings</h1>
        <p className="text-gray-500 mt-1">Configure fees, team access, alerts, risk controls, and support workflows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Fee configuration</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sender fee (%)</label>
            <input type="number" defaultValue={0.75} step={0.05} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App fee (%)</label>
            <input type="number" defaultValue={0.1} step={0.05} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition">Save fee policy</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Team & roles</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invite team member</label>
            <input type="email" placeholder="teammate@company.com" className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select className="w-full border border-gray-300 rounded-lg p-2 text-sm">
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition">Invite user</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Alerts & notifications</h3>
          <div className="space-y-2 text-sm">
            {[
              'Failed payouts',
              'KYB updates',
              'Webhook delivery failures',
              'Abnormal transaction drop',
            ].map((label) => (
              <label key={label} className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                {label}
              </label>
            ))}
          </div>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition">Save alerts</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Risk controls</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination change cooldown (hours)</label>
            <input type="number" defaultValue={24} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily payout velocity limit (USD)</label>
            <input type="number" defaultValue={50000} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition">Save controls</button>
        </div>
      </div>
    </main>
  );
}
