'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRedemptions, approveRedemption, rejectRedemption, type RedemptionRequest } from '@/lib/api';

interface Props {
  token: string;
}

const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'FAILED'];

export default function RedemptionQueue({ token }: Props) {
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = filter !== 'ALL' ? { status: filter } : undefined;
      const res = await getRedemptions(token, filters);
      setRedemptions(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load redemptions.');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    try {
      await approveRedemption(id, token);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approve failed.');
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectRedemption(id, token);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reject failed.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">
          Status:
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <button onClick={load} className="text-indigo-600 text-sm hover:underline">Refresh</button>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-3 py-2 border border-gray-200">Merchant ID</th>
              <th className="px-3 py-2 border border-gray-200">Amount (CATR)</th>
              <th className="px-3 py-2 border border-gray-200">Tier</th>
              <th className="px-3 py-2 border border-gray-200">Status</th>
              <th className="px-3 py-2 border border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border border-gray-200 text-xs text-gray-500">{r.merchant_id}</td>
                <td className="px-3 py-2 border border-gray-200 font-mono">{r.amount_catr}</td>
                <td className="px-3 py-2 border border-gray-200">{r.tier}</td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className={
                    r.status === 'APPROVED' ? 'text-green-600' :
                    r.status === 'FAILED' ? 'text-red-500' : 'text-yellow-600'
                  }>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        className="text-green-600 hover:underline text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && redemptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-gray-400">No redemptions.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
