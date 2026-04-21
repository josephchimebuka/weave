export default function PayoutsPage() {
  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payout configuration</h1>
        <p className="text-gray-500 mt-1">Choose payout mode and configure where merchant settlements are delivered.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Payout mode</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <label className="p-4 border border-emerald-200 rounded-lg bg-emerald-50">
            <input type="radio" name="payoutMode" defaultChecked className="mr-2" />
            Fiat bank payout
          </label>
          <label className="p-4 border border-gray-200 rounded-lg">
            <input type="radio" name="payoutMode" className="mr-2" />
            Stablecoin wallet payout
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Fiat destinations</h3>
          <input placeholder="Bank name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Account number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Account name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">Add bank account</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Stablecoin destinations</h3>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>USDC on BASE</option>
            <option>USDC on ETHEREUM</option>
            <option>USDT on TRON</option>
          </select>
          <input placeholder="Wallet address" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">Add wallet</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Payout policy</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <input placeholder="Default corridor (e.g. fiat:NGN)" className="border border-gray-200 rounded-lg px-3 py-2" />
          <input placeholder="Fallback destination ID" className="border border-gray-200 rounded-lg px-3 py-2" />
          <input placeholder="Minimum payout threshold" type="number" className="border border-gray-200 rounded-lg px-3 py-2" />
        </div>
        <button className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800">Save payout policy</button>
      </div>
    </main>
  );
}

