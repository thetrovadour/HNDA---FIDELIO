'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getGcaRedemptions,
  approveGcaRedemption,
  rejectGcaRedemption,
  getGcaPriceFloor,
  setGcaPriceFloor,
  type GcaRedemptionRequest,
  type GcaPriceFloor,
} from '@/lib/api';

export default function GcaAdminPanel({ token }: { token: string }) {
  const [redemptions, setRedemptions] = useState<GcaRedemptionRequest[]>([]);
  const [floor, setFloor] = useState<GcaPriceFloor | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceMsg, setPriceMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, f] = await Promise.all([getGcaRedemptions(token), getGcaPriceFloor(token)]);
      setRedemptions(r.data);
      setFloor(f.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GCA data.');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    await approveGcaRedemption(id, token);
    load();
  }

  async function handleReject(id: string) {
    await rejectGcaRedemption(id, token);
    load();
  }

  async function handleSetPrice(e: React.FormEvent) {
    e.preventDefault();
    setPriceMsg('');
    try {
      await setGcaPriceFloor({ price_hnl: parseFloat(newPrice) }, token);
      setPriceMsg('Price floor updated.');
      setNewPrice('');
      load();
    } catch (err) {
      setPriceMsg(err instanceof Error ? err.message : 'Failed to update price floor.');
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Price floor */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gray-800">GCA Price Floor</h2>
        {floor && (
          <p className="text-sm text-gray-600">
            Current: <strong>L. {parseFloat(floor.price_hnl).toFixed(4)} / GCA</strong>
          </p>
        )}
        <form onSubmit={handleSetPrice} className="flex gap-2 items-end max-w-sm">
          <label className="flex flex-col gap-1 text-sm text-gray-600 flex-1">
            New price (HNL per GCA)
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="e.g. 1.5"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </label>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700"
          >
            Set Floor
          </button>
        </form>
        {priceMsg && <p className="text-sm text-indigo-600">{priceMsg}</p>}
      </section>

      {/* Redemption queue */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Pending GCA Redemptions</h2>
        {redemptions.length === 0 ? (
          <p className="text-sm text-gray-400">No pending redemption requests.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {redemptions.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {r.merchant?.name ?? r.merchant_id}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-sm text-gray-600 grid grid-cols-3 gap-2">
                  <span>{parseFloat(r.amount_gca).toFixed(2)} GCA</span>
                  <span>@ L. {parseFloat(r.price_floor_hnl).toFixed(4)}</span>
                  <span className="font-semibold">≈ L. {parseFloat(r.amount_hnl_estimated).toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
