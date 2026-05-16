'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGcaRedeemLog, type GcaRedeemLogEntry } from '@/lib/api';

const C = {
  surface:   '#0C1018',
  surfaceHi: '#111820',
  border:    'rgba(255,255,255,0.07)',
  gold:      '#C9A84C',
  white:     '#F1F5F9',
  slate:     '#64748B',
  slateHi:   '#94A3B8',
  success:   '#10B981',
  error:     '#EF4444',
  warn:      '#F59E0B',
};

const font = { fontFamily: 'var(--font-body)' };

const PAGE_SIZE = 20;

const STATUS_COLOR: Record<string, string> = {
  APPROVED:      C.success,
  PENDING:       C.warn,
  REJECTED:      C.error,
  LEMPIRAS_SENT: C.slateHi,
};

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      ...font,
      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
      padding: '0.18rem 0.5rem', borderRadius: '999px',
      background: `${color}18`, color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

export default function GcaRedeemLog({ token }: { token: string }) {
  const [entries, setEntries] = useState<GcaRedeemLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const r = await getGcaRedeemLog(token, PAGE_SIZE, p * PAGE_SIZE);
      setEntries(r.data);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar historial.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(page); }, [load, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '1rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ ...font, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: C.slate, textTransform: 'uppercase' }}>
          Historial de canjes GCA — {total} total
        </p>
        <button
          onClick={() => load(page)}
          style={{ ...font, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: C.slate }}
        >
          ↻
        </button>
      </div>

      {loading ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Cargando…</p>
      ) : error ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.error }}>{error}</p>
      ) : entries.length === 0 ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Sin canjes registrados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {entries.map((e) => (
            <div
              key={e.id}
              style={{
                background: C.surfaceHi, border: `1px solid ${C.border}`,
                borderRadius: '0.75rem', padding: '0.75rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
              }}
            >
              {/* Merchant */}
              <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                <p style={{ ...font, fontSize: '0.85rem', fontWeight: 600, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.merchant.name}
                </p>
                <p style={{ ...font, fontSize: '0.65rem', color: C.slate, marginTop: '0.1rem' }}>
                  {new Date(e.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {new Date(e.created_at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Amounts */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ ...font, fontSize: '0.95rem', fontWeight: 300, color: C.gold }}>
                  {parseFloat(e.amount_gca).toFixed(2)} GCA
                </p>
                <p style={{ ...font, fontSize: '0.65rem', color: C.slate }}>
                  @ L. {parseFloat(e.price_floor_hnl).toFixed(4)} · ≈ L. {parseFloat(e.amount_hnl_estimated).toFixed(2)}
                </p>
              </div>

              {/* Status */}
              <div style={{ flexShrink: 0 }}>
                <Pill label={e.status} color={STATUS_COLOR[e.status] ?? C.slateHi} />
              </div>

              {/* Notes */}
              {e.notes && (
                <p style={{ ...font, fontSize: '0.65rem', color: C.slate, flexShrink: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.notes}>
                  {e.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            style={{ ...font, background: 'none', border: 'none', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? C.slate : C.slateHi, fontSize: '0.8rem', opacity: page === 0 ? 0.4 : 1 }}
          >
            ← Anterior
          </button>
          <span style={{ ...font, fontSize: '0.7rem', color: C.slate }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            style={{ ...font, background: 'none', border: 'none', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: page >= totalPages - 1 ? C.slate : C.slateHi, fontSize: '0.8rem', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
