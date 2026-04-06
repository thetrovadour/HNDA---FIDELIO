'use client';

import { useState } from 'react';
import { getUser, getUserTransactions, getUserRewards, getMerchants, spendCATR } from '@/lib/api';
import type { UserRecord, Transaction, Milestone, Merchant } from '@/lib/api';
import TransactionList from '@/components/TransactionList';
import RewardStatus from '@/components/RewardStatus';

export default function ClientPage() {
  const [userId, setUserId] = useState('');
  const [user, setUser] = useState<UserRecord | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

  // Spend form
  const [spendMerchant, setSpendMerchant] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendStatus, setSpendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [spendMessage, setSpendMessage] = useState('');

  async function loadUser() {
    if (!userId.trim()) return;
    setLoading(true);
    setLoadError('');
    setUser(null);
    try {
      const [userRes, txRes, rewardRes, merchantRes] = await Promise.all([
        getUser(userId.trim()),
        getUserTransactions(userId.trim()),
        getUserRewards(userId.trim()),
        getMerchants(),
      ]);
      setUser(userRes.data);
      setTransactions(txRes.data);
      setMilestones(rewardRes.data);
      setMerchants(merchantRes.data);
      setSpendMerchant(merchantRes.data[0]?.id ?? '');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load user.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSpend(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !spendMerchant || !spendAmount) return;
    setSpendStatus('loading');
    setSpendMessage('');
    try {
      await spendCATR({ user_id: user.id, merchant_id: spendMerchant, amount_catr: spendAmount });
      setSpendStatus('success');
      setSpendMessage('Transaction submitted successfully.');
      setSpendAmount('');
      // Refresh transactions
      const txRes = await getUserTransactions(user.id);
      setTransactions(txRes.data);
      const userRes = await getUser(user.id);
      setUser(userRes.data);
    } catch (err) {
      setSpendStatus('error');
      setSpendMessage(err instanceof Error ? err.message : 'Transaction failed.');
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-indigo-700">Client Dashboard</h1>

      {/* Load user */}
      <div className="flex gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          User ID
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUser()}
            placeholder="Enter your UUID"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <button
          onClick={loadUser}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load User'}
        </button>
      </div>
      {loadError && <p className="text-red-600 text-sm">{loadError}</p>}

      {user && (
        <>
          {/* User info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-2">
            <div className="flex items-baseline gap-4">
              <h2 className="text-xl font-semibold">{user.full_name}</h2>
              <span className="text-gray-500 text-sm">{user.email}</span>
            </div>
            <div className="mt-2">
              <span className="text-4xl font-bold text-indigo-600">{user.catr_balance}</span>
              <span className="ml-2 text-gray-500 text-sm">CATR</span>
            </div>
          </div>

          {/* Reward milestones */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Reward Milestones</h2>
            <RewardStatus milestones={milestones} />
          </section>

          {/* Spend CATR */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Spend CATR</h2>
            <form onSubmit={handleSpend} className="flex flex-col gap-3 max-w-sm">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Merchant
                <select
                  value={spendMerchant}
                  onChange={(e) => setSpendMerchant(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                Amount (CATR)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={spendAmount}
                  onChange={(e) => setSpendAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={spendStatus === 'loading'}
                className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {spendStatus === 'loading' ? 'Processing…' : 'Spend CATR'}
              </button>
              {spendStatus === 'success' && <p className="text-green-600 text-sm">{spendMessage}</p>}
              {spendStatus === 'error' && <p className="text-red-600 text-sm">{spendMessage}</p>}
            </form>
          </section>

          {/* Transaction history */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Transaction History</h2>
            <TransactionList transactions={transactions} />
          </section>
        </>
      )}
    </div>
  );
}
