'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRedemptions, approveRedemption, rejectRedemption, type RedemptionRequest } from '@/lib/api';

interface Props { token: string; }

const C = {
  surface:   '#0C1018',
  surfaceHi: '#111820',
  border:    'rgba(255,255,255,0.07)',
  gold:      '#C9A84C',
  goldDim:   'rgba(201,168,76,0.12)',
  white:     '#F1F5F9',
  slate:     '#64748B',
  slateHi:   '#94A3B8',
  danger:    '#EF4444',
  dangerBg:  'rgba(239,68,68,0.08)',
  success:   '#10B981',
  successBg: 'rgba(16,185,129,0.08)',
  warn:      '#F59E0B',
};
const font = { fontFamily: 'var(--font-body)' };

const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'FAILED'];

function statusColor(s: string) {
  if (s === 'APPROVED') return '#10B981';
  if (s === 'FAILED')   return '#EF4444';
  return '#F59E0B';
}

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
    try { await approveRedemption(id, token); load(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Approve failed.'); }
  }

  async function handleReject(id: string) {
    try { await rejectRedemption(id, token); load(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Reject failed.'); }
  }

  const thStyle: React.CSSProperties = {
    ...font, padding: '0.5rem 0.75rem', fontSize: '0.6rem', fontWeight: 400,
    letterSpacing: '0.12em', textTransform: 'uppercase', color: C.slate,
    borderBottom: `1px solid ${C.border}`, textAlign: 'left',
  };
  const tdStyle: React.CSSProperties = {
    ...font, padding: '0.6rem 0.75rem', fontSize: '0.78rem',
    color: C.slateHi, borderBottom: `1px solid ${C.border}`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ ...font, fontSize: '0.65rem', letterSpacing: '0.1em', color: C.slate, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Status
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ ...font, background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: '0.375rem', color: C.white, fontSize: '0.75rem', padding: '0.25rem 0.5rem', outline: 'none' }}
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <button
          onClick={load}
          style={{ ...font, background: 'none', border: 'none', color: C.gold, fontSize: '0.7rem', letterSpacing: '0.08em', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {loading && <p style={{ ...font, color: C.slate, fontSize: '0.8rem' }}>Loading...</p>}
      {error   && <p style={{ ...font, color: C.danger, fontSize: '0.8rem' }}>{error}</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.surfaceHi }}>
              <th style={thStyle}>Merchant ID</th>
              <th style={thStyle}>Amount (CATR)</th>
              <th style={thStyle}>Tier</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.map((r) => (
              <tr key={r.id}>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.7rem' }}>{r.merchant_id}</td>
                <td style={{ ...tdStyle, color: C.gold }}>{r.amount_catr}</td>
                <td style={tdStyle}>{r.tier}</td>
                <td style={tdStyle}>
                  <span style={{ color: statusColor(r.status) }}>{r.status}</span>
                </td>
                <td style={tdStyle}>
                  {r.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApprove(r.id)} style={{ ...font, background: C.successBg, border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.25rem', color: C.success, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                        Approve
                      </button>
                      <button onClick={() => handleReject(r.id)} style={{ ...font, background: C.dangerBg, border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.25rem', color: C.danger, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && redemptions.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: C.slate, padding: '1.5rem' }}>
                  No redemptions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
