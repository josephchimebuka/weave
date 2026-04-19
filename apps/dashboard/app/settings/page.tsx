import React from 'react';

export default function SettingsPage() {
  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Configuration</h1>
        <p className="text-gray-500 mt-1">Manage API Keys and fee configurations for your checkout.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">API Credentials</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weave Public Key</label>
            <input type="text" readOnly value="pk_live_8A7b6C5d4E3F2g" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-mono text-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weave Secret Key</label>
            <input type="password" readOnly value="sk_live_********************" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-mono text-gray-600" />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">Regenerate Keys</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-gray-100 pb-2">Fee Configuration</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weave Sender Fee (%)</label>
            <p className="text-xs text-gray-500 mb-2">This is the spread you earn per transaction.</p>
            <input type="number" defaultValue={0.75} step={0.05} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ChainRails App Fee (%)</label>
            <p className="text-xs text-gray-500 mb-2">Optional protocol fee added to ChainRails routing.</p>
            <input type="number" defaultValue={0.1} step={0.05} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
          </div>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition">Save Changes</button>
        </div>
      </div>
    </main>
  );
}
