'use client';

import { useState, useEffect } from 'react';
import { getGcaBalance, redeemGca, type GcaBalance } from '@/lib/api';

export default function GcaWidget({ merchantId }: { merchantId: string }) {
  const [data, setData] = useState<GcaBalance | null>(null);
  const [error, setError] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemMsg, setRedeemMsg] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    getGcaBalance(merchantId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load GCA data.'));
  }, [merchantId]);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setRedeemMsg('');
    setRedeeming(true);
    try {
      await redeemGca({ merchant_id: merchantId, amount_gca: parseFloat(redeemAmount) });
      setRedeemMsg('Redemption request submitted — pending admin approval.');
      setRedeemAmount('');
      const res = await getGcaBalance(merchantId);
      setData(res.data);
    } catch (err) {
      setRedeemMsg(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setRedeeming(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-400">Loading GCA balance…</p>;

  const progress = (data.milestones_claimed / 10) * 100;

  return (
    <div className="flex flex-col gap-5 bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-indigo-700">Guacacoin (GCA)</h3>
        <span className="text-2xl font-bold text-gray-800">{parseFloat(data.gca_balance).toFixed(2)} GCA</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Est. HNL Value</span>
          <span className="font-semibold text-gray-700">L. {parseFloat(data.estimated_hnl_value).toFixed(2)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Price Floor</span>
          <span className="font-semibold text-gray-700">L. {parseFloat(data.price_floor_hnl).toFixed(4)} / GCA</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Milestones</span>
          <span className="font-semibold text-gray-700">{data.milestones_claimed} / 10</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Next milestone at</span>
          <span className="font-semibold text-gray-700">{parseFloat(data.next_milestone_at).toLocaleString()} eff. CATR</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Vesting progress</span>
          <span>{data.milestones_claimed * 100 + 200} / 1200 GCA earned</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleRedeem} className="flex flex-col gap-2 border-t pt-4">
        <p className="text-xs text-gray-500">Redeem GCA for Lempiras (requires admin approval)</p>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            step="any"
            value={redeemAmount}
            onChange={(e) => setRedeemAmount(e.target.value)}
            placeholder="Amount GCA"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            disabled={redeeming}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {redeeming ? 'Submitting…' : 'Redeem'}
          </button>
        </div>
        {redeemMsg && <p className="text-sm text-indigo-600">{redeemMsg}</p>}
      </form>
    </div>
  );
}
