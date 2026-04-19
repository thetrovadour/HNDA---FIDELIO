'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRewardQueue, approveRewardPayout, type RewardPayout } from '@/lib/api';

interface Props { token: string; }

const C = {
  surface:   '#0C1018',
  surfaceHi: '#111820',
  border:    'rgba(255,255,255,0.07)',
  gold:      '#C9A84C',
  white:     '#F1F5F9',
  slate:     '#64748B',
  slateHi:   '#94A3B8',
  danger:    '#EF4444',
  success:   '#10B981',
  successBg: 'rgba(16,185,129,0.08)',
};
const font = { fontFamily: 'var(--font-body)' };

function statusColor(s: string) {
  if (s === 'APPROVED') return '#10B981';
  if (s === 'FAILED')   return '#EF4444';
  return '#F59E0B';
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
    try { await approveRewardPayout(id, token); load(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Approve failed.'); }
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
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
              <th style={thStyle}>User ID</th>
              <th style={thStyle}>Amount (CATR)</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.7rem' }}>{p.user_id}</td>
                <td style={{ ...tdStyle, color: C.gold }}>{p.amount_catr}</td>
                <td style={tdStyle}>
                  <span style={{ color: statusColor(p.status) }}>{p.status}</span>
                </td>
                <td style={{ ...tdStyle, fontSize: '0.7rem' }}>
                  {new Date(p.created_at).toLocaleDateString('es-HN')}
                </td>
                <td style={tdStyle}>
                  {p.status === 'PENDING' && (
                    <button
                      onClick={() => handleApprove(p.id)}
                      style={{ ...font, background: C.successBg, border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.25rem', color: C.success, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && payouts.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: C.slate, padding: '1.5rem' }}>
                  No pending payouts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
