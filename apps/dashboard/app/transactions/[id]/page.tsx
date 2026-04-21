import Link from 'next/link';
import { fetchOrder } from '../../lib/dashboard-api';
import { assetLabel } from '../../types';

function money(value: number | null, dp = 2) {
  if (value == null) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: dp });
}

export default async function TransactionReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await fetchOrder(id, 10);

  if (!order) {
    return (
      <main className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold">Transaction not found</h1>
          <p className="text-gray-500 mt-2">This receipt does not exist or is not available for your account.</p>
          <Link href="/transactions" className="inline-block mt-4 text-emerald-700 hover:underline">Back to transactions</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transaction receipt</h1>
          <p className="text-gray-500 mt-1 font-mono text-sm">{order.id}</p>
        </div>
        <Link href="/transactions" className="text-sm text-emerald-700 hover:underline">Back to list</Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Status</p>
          <p className="font-semibold text-gray-900 capitalize">{order.status.replace('_', ' ')}</p>
        </div>
        <div>
          <p className="text-gray-500">Created</p>
          <p className="font-semibold text-gray-900">{new Date(order.createdAt).toLocaleString('en-GB')}</p>
        </div>
        <div>
          <p className="text-gray-500">From</p>
          <p className="font-semibold text-gray-900">{assetLabel(order.sourceAssetKey)}</p>
        </div>
        <div>
          <p className="text-gray-500">To</p>
          <p className="font-semibold text-gray-900">{assetLabel(order.destAssetKey)}</p>
        </div>
        <div>
          <p className="text-gray-500">Customer paid</p>
          <p className="font-semibold text-gray-900">{money(order.sourceAmount, 4)}</p>
        </div>
        <div>
          <p className="text-gray-500">Merchant received</p>
          <p className="font-semibold text-gray-900">{money(order.destAmount, 4)}</p>
        </div>
        <div>
          <p className="text-gray-500">Payout destination</p>
          <p className="font-semibold text-gray-900">
            {order.destInstrument?.bankAccountIdentifier
              ? `${order.destInstrument.bankInstitution || 'Bank'} · ${order.destInstrument.bankAccountIdentifier}`
              : order.destInstrument?.walletAddress || '—'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Fees</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-gray-500">Sender fee (USD)</p>
            <p className="font-semibold">{money(order.senderFeeUsd)}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-gray-500">App fee (USD)</p>
            <p className="font-semibold">{money(order.appFeeUsd)}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-gray-500">Bridge fee (USD)</p>
            <p className="font-semibold">{money(order.bridgeFeeUsd)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Route timeline</h2>
        <div className="space-y-3">
          {order.steps?.map((step) => (
            <div key={step.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{step.provider}</p>
                  <p className="text-xs text-gray-500">{step.fromAsset} → {step.toAsset}</p>
                </div>
                <p className="text-xs capitalize text-gray-700">{step.status.replace('_', ' ')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-gray-600">
                <p>Provider ID: {step.externalId || '—'}</p>
                <p>Deposit: {step.depositAddress || '—'}</p>
                <p>Memo: {step.depositMemo || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Status audit trail</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>Order created · {new Date(order.createdAt).toLocaleString('en-GB')}</li>
          <li>Last updated · {new Date(order.updatedAt).toLocaleString('en-GB')}</li>
          {order.paycrestStatus ? <li>Paycrest status · {order.paycrestStatus}</li> : null}
          {order.nearStatus ? <li>NEAR Intents status · {order.nearStatus}</li> : null}
          {(order.steps || []).map((step) => (
            <li key={`${step.id}-audit`}>
              {step.provider} step {step.sequence} · {step.status}
              {step.startedAt ? ` · started ${new Date(step.startedAt).toLocaleString('en-GB')}` : ''}
              {step.completedAt ? ` · completed ${new Date(step.completedAt).toLocaleString('en-GB')}` : ''}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
