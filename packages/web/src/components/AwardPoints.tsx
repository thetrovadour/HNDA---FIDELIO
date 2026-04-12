'use client';

import { useState, useEffect } from 'react';
import { getAdminUsers, adminMint, type AdminUser } from '@/lib/api';

interface Props {
  token: string;
}

export default function AwardPoints({ token }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference_code: string; wallet_address: string; amount: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminUsers(token)
      .then((res) => setUsers(res.data))
      .catch((err) => setUsersError(err instanceof Error ? err.message : 'Failed to load users.'))
      .finally(() => setLoadingUsers(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      const res = await adminMint({ user_id: selectedUserId, amount: Number(amount) }, token);
      setResult(res.data);
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-800">Award CATR Points</h2>

      {loadingUsers && <p className="text-sm text-gray-500">Loading users...</p>}
      {usersError && <p className="text-sm text-red-600">{usersError}</p>}

      {!loadingUsers && !usersError && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* User selector */}
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Select user
            <select
              value={selectedUserId}
              onChange={(e) => { setSelectedUserId(e.target.value); setResult(null); setError(''); }}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">— choose a user —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
          </label>

          {/* Show wallet info */}
          {selectedUser && (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-500 break-all">
              <span className="font-medium text-gray-700">Wallet: </span>
              {selectedUser.wallet ? (
                <>
                  <span>{selectedUser.wallet.address}</span>
                  <span className="ml-2 text-indigo-600 font-medium">
                    {Number(selectedUser.wallet.catr_balance).toFixed(2)} CATR
                  </span>
                </>
              ) : (
                <span className="text-red-500">No wallet assigned</span>
              )}
            </div>
          )}

          {/* Amount */}
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Amount (CATR)
            <input
              type="number"
              min="1"
              max="10000"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !selectedUserId || !amount}
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending to bridge...' : 'Award Points'}
          </button>
        </form>
      )}

      {/* Success */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm flex flex-col gap-1">
          <p className="font-semibold text-green-700">Mint queued successfully.</p>
          <p className="text-gray-600">The bridge will execute the on-chain transaction shortly.</p>
          <p className="text-xs text-gray-500 mt-1 break-all">
            <span className="font-medium">Reference:</span> {result.reference_code}
          </p>
          <p className="text-xs text-gray-500 break-all">
            <span className="font-medium">Wallet:</span> {result.wallet_address}
          </p>
          <p className="text-xs text-gray-500">
            <span className="font-medium">Amount:</span> {result.amount} CATR
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
