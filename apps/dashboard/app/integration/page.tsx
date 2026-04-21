export default function IntegrationPage() {
  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Checkout integration</h1>
        <p className="text-gray-500 mt-1">Configure keys, webhooks, and embeddable setup for your platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold border-b border-gray-100 pb-2">API keys</h2>
          <input readOnly value="pk_live_************************" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
          <input readOnly value="sk_live_************************" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">Rotate keys (OTP required)</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold border-b border-gray-100 pb-2">Webhook setup</h2>
          <input placeholder="https://merchant.com/weave/webhook" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input readOnly value="whsec_************************" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">Save endpoint</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold border-b border-gray-100 pb-2">Embeddable checkout code (no-code copy)</h2>
        <textarea
          readOnly
          className="w-full min-h-28 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono"
          value={`<script src="https://cdn.weavepay.com/widget.js"></script>\n<div id="weave-checkout" data-public-key="pk_live_xxx"></div>`}
        />
        <p className="text-sm text-gray-500">Copy this snippet into your checkout page and replace the public key.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Integration health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-gray-500">Last webhook delivery</p>
            <p className="font-semibold">2 mins ago</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-gray-500">Recent API errors (24h)</p>
            <p className="font-semibold">0</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-gray-500">Key usage recency</p>
            <p className="font-semibold">active now</p>
          </div>
        </div>
      </div>
    </main>
  );
}

