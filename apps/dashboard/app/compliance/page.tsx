export default function CompliancePage() {
  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Compliance & operations</h1>
        <p className="text-gray-500 mt-1">Track disputes, reconciliation, audit logs, and support operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Disputes / refunds</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>Open disputes: 0</p>
            <p>Pending refunds: 0</p>
            <p>Resolved this month: 0</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Reconciliation</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>Last settlement export: —</p>
            <p>Unmatched entries: 0</p>
            <button className="mt-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
              Download settlement statement
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Audit log</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• API key rotated</li>
            <li>• Payout mode changed</li>
            <li>• KYB field edited</li>
            <li>• Team member invited</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Support tooling</h2>
          <textarea
            className="w-full min-h-28 border border-gray-200 rounded-lg p-3 text-sm"
            placeholder="Open a support request with prefilled order IDs and merchant notes..."
          />
          <button className="mt-3 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800">
            Submit support ticket
          </button>
        </div>
      </div>
    </main>
  );
}

