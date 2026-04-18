'use client';

import { useState, useEffect } from 'react';
import { getRunway, type RunwayData } from '@/lib/api';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 bg-white border border-gray-200 rounded-lg">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-indigo-700">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

export default function RunwayWidget({ token }: { token: string }) {
  const [data, setData] = useState<RunwayData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRunway(token)
      .then((res) => setData(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load runway data.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-gray-500">Loading system health...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const netPositive = !data.monthly_net.startsWith('-');
  const runwayLabel =
    data.projected_runway_months === 'sustainable'
      ? '∞ — Surplus'
      : `${data.projected_runway_months} mo`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Reward Pool</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Pool Balance" value={`${parseFloat(data.pool_balance).toFixed(2)} CATR`} />
          <Stat label="Monthly Inflow" value={`+${parseFloat(data.monthly_pool_inflow).toFixed(2)} CATR`} sub="last 30 days" />
          <Stat label="Monthly Outflow" value={`-${parseFloat(data.monthly_cashback_outflow).toFixed(2)} CATR`} sub="cashback paid" />
          <Stat
            label="Monthly Net"
            value={`${netPositive ? '+' : ''}${parseFloat(data.monthly_net).toFixed(2)} CATR`}
            sub={netPositive ? 'pool growing' : 'pool shrinking'}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Runway & Growth</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Projected Runway" value={runwayLabel} sub="at current burn rate" />
          <Stat label="Active Merchants" value={String(data.active_merchants)} />
          <Stat label="Total Transactions" value={String(data.total_transactions)} />
        </div>
      </div>

      {data.breakeven_merchants !== 'N/A' && (
        <p className="text-sm text-gray-500">
          Breakeven at approx. <strong>{data.breakeven_merchants} merchants</strong> based on current admin costs.
        </p>
      )}
    </div>
  );
}
