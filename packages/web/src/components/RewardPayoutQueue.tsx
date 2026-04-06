'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRewardQueue, approveRewardPayout, type RewardPayout } from '@/lib/api';

interface Props {
  token: string;
}

export default function RewardPayoutQueue({ token }: Props) {
  const [payouts, setPayouts] = useState<RewardPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRewardQueue(token);
      setPayouts(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reward queue.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    try {
      await approveRewardPayout(id, token);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approve failed.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={load} className="text-indigo-600 text-sm hover:underline">Refresh</button>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-3 py-2 border border-gray-200">User ID</th>
              <th className="px-3 py-2 border border-gray-200">Amount (CATR)</th>
              <th className="px-3 py-2 border border-gray-200">Status</th>
              <th className="px-3 py-2 border border-gray-200">Date</th>
              <th className="px-3 py-2 border border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border border-gray-200 text-xs text-gray-500">{p.user_id}</td>
                <td className="px-3 py-2 border border-gray-200 font-mono">{p.amount_catr}</td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className={
                    p.status === 'APPROVED' ? 'text-green-600' :
                    p.status === 'FAILED' ? 'text-red-500' : 'text-yellow-600'
                  }>
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200 text-xs text-gray-500">
                  {new Date(p.created_at).toLocaleDateString('es-HN')}
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  {p.status === 'PENDING' && (
                    <button
                      onClick={() => handleApprove(p.id)}
                      className="text-green-600 hover:underline text-xs"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && payouts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-gray-400">No pending payouts.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
