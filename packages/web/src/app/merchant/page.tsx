'use client';

import { useState } from 'react';
import { getMerchant, type Merchant } from '@/lib/api';
import RedemptionForm from '@/components/RedemptionForm';

export default function MerchantPage() {
  const [merchantId, setMerchantId] = useState('');
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redeemKey, setRedeemKey] = useState(0);

  async function loadMerchant() {
    if (!merchantId.trim()) return;
    setLoading(true);
    setLoadError('');
    setMerchant(null);
    try {
      const res = await getMerchant(merchantId.trim());
      setMerchant(res.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load merchant.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-indigo-700">Merchant Dashboard</h1>

      <div className="flex gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Merchant ID
          <input
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMerchant()}
            placeholder="Enter merchant UUID"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <button
          onClick={loadMerchant}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load Merchant'}
        </button>
      </div>
      {loadError && <p className="text-red-600 text-sm">{loadError}</p>}

      {merchant && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-semibold">{merchant.name}</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {merchant.category}
              </span>
              <span className={`text-sm font-medium ${merchant.active ? 'text-green-600' : 'text-red-500'}`}>
                {merchant.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-sm text-gray-500 font-mono">{merchant.wallet_address}</div>
          </div>

          <section>
            <h2 className="text-lg font-semibold mb-3">Request CATR Redemption</h2>
            <RedemptionForm
              key={redeemKey}
              merchantId={merchant.id}
              onSuccess={() => setRedeemKey((k) => k + 1)}
            />
          </section>
        </>
      )}
    </div>
  );
}
