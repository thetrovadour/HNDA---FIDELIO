'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMerchants, type Merchant } from '@/lib/api';
import MerchantList from '@/components/MerchantList';
import RedemptionQueue from '@/components/RedemptionQueue';
import RewardPayoutQueue from '@/components/RewardPayoutQueue';
import AwardPoints from '@/components/AwardPoints';

type Tab = 'merchants' | 'redemptions' | 'payouts' | 'award';

export default function AdminPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<Tab>('merchants');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantsError, setMerchantsError] = useState('');

  const loadMerchants = useCallback(async () => {
    if (!token) return;
    setMerchantsError('');
    try {
      const res = await getMerchants();
      setMerchants(res.data);
    } catch (err) {
      setMerchantsError(err instanceof Error ? err.message : 'Failed to load merchants.');
    }
  }, [token]);

  useEffect(() => {
    if (token) loadMerchants();
  }, [token, loadMerchants]);

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setToken(tokenInput.trim());
  }

  const TAB_LABELS: Record<Tab, string> = {
    merchants: 'Merchants',
    redemptions: 'Redemptions',
    payouts: 'Reward Payouts',
    award: 'Award Points',
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-indigo-700">Admin Dashboard</h1>
        <form onSubmit={handleConnect} className="flex flex-col gap-3 max-w-sm">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Admin JWT Token
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your admin JWT here"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </label>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700"
          >
            Connect
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-700">Admin Dashboard</h1>
        <button
          onClick={() => setToken('')}
          className="text-sm text-red-500 hover:underline"
        >
          Disconnect
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'merchants' && (
        <section>
          {merchantsError && <p className="text-red-600 text-sm mb-3">{merchantsError}</p>}
          <MerchantList merchants={merchants} token={token} onRefresh={loadMerchants} />
        </section>
      )}

      {tab === 'redemptions' && (
        <section>
          <RedemptionQueue token={token} />
        </section>
      )}

      {tab === 'payouts' && (
        <section>
          <RewardPayoutQueue token={token} />
        </section>
      )}

      {tab === 'award' && (
        <section>
          <AwardPoints token={token} />
        </section>
      )}
    </div>
  );
}
