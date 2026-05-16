'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getFailedRows, resetFailedMint, resetFailedTransfer,
  type FailedMint, type FailedTransfer,
} from '@/lib/api';

const C = {
  surface:   '#0C1018',
  surfaceHi: '#111820',
  border:    'rgba(255,255,255,0.07)',
  white:     '#F1F5F9',
  slate:     '#64748B',
  slateHi:   '#94A3B8',
  success:   '#10B981',
  error:     '#EF4444',
  errorBg:   'rgba(239,68,68,0.06)',
  errorBorder:'rgba(239,68,68,0.2)',
  warn:      '#F59E0B',
  gold:      '#C9A84C',
};

const font = { fontFamily: 'var(--font-body)' };

function addr(s: string) { return `${s.slice(0, 8)}…${s.slice(-4)}`; }

export default function FailedRowsAlert({ token }: { token: string }) {
  const [mints, setMints]         = useState<FailedMint[]>([]);
  const [transfers, setTransfers] = useState<FailedTransfer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [resetting, setResetting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await getFailedRows(token);
      setMints(r.data.mints);
      setTransfers(r.data.transfers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar filas fallidas.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleResetMint(id: string) {
    setResetting(id);
    try {
      await resetFailedMint(id, token);
      await load();
    } finally {
      setResetting(null);
    }
  }

  async function handleResetTransfer(id: string) {
    setResetting(id);
    try {
      await resetFailedTransfer(id, token);
      await load();
    } finally {
      setResetting(null);
    }
  }

  const total = mints.length + transfers.length;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ ...font, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: C.slate, textTransform: 'uppercase' }}>
          Alertas de reconciliación
        </p>
        <button onClick={load} style={{ ...font, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: C.slate }}>↻</button>
      </div>

      {loading ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Cargando…</p>
      ) : error ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.error }}>{error}</p>
      ) : total === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1rem' }}>✓</span>
          <p style={{ ...font, fontSize: '0.85rem', color: C.success }}>Sin filas fallidas. Todo en orden.</p>
        </div>
      ) : (
        <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ ...font, fontSize: '0.82rem', fontWeight: 600, color: C.error }}>
            ⚠ {total} fila{total !== 1 ? 's' : ''} fallida{total !== 1 ? 's' : ''} — requiere revisión manual
          </p>

          {mints.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <p style={{ ...font, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: C.error, textTransform: 'uppercase' }}>
                Mints fallidos ({mints.length})
              </p>
              {mints.map((m) => (
                <div key={m.id} style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: '0.6rem', padding: '0.65rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <p style={{ ...font, fontSize: '0.75rem', fontWeight: 600, color: C.white, fontFamily: 'monospace' }}>{m.reference_code}</p>
                    <p style={{ ...font, fontSize: '0.65rem', color: C.slate, marginTop: '0.1rem' }}>
                      {addr(m.client_wallet)} · L. {parseFloat(m.amount_lempiras).toFixed(2)} · {m.source} · {m.attempts} intentos
                    </p>
                    {m.last_attempt_at && (
                      <p style={{ ...font, fontSize: '0.6rem', color: C.slate }}>
                        Último intento: {new Date(m.last_attempt_at).toLocaleString('es-HN')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleResetMint(m.id)}
                    disabled={resetting === m.id}
                    style={{
                      ...font, flexShrink: 0,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: '0.5rem', color: C.warn, fontSize: '0.7rem', fontWeight: 600,
                      padding: '0.3rem 0.75rem', cursor: resetting === m.id ? 'not-allowed' : 'pointer',
                      opacity: resetting === m.id ? 0.5 : 1,
                    }}
                  >
                    {resetting === m.id ? '…' : 'Re-intentar'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {transfers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <p style={{ ...font, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: C.error, textTransform: 'uppercase' }}>
                Transfers fallidas ({transfers.length})
              </p>
              {transfers.map((t) => (
                <div key={t.id} style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: '0.6rem', padding: '0.65rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <p style={{ ...font, fontSize: '0.75rem', fontWeight: 600, color: C.white, fontFamily: 'monospace' }}>
                      {addr(t.from_wallet)} → {addr(t.to_wallet)}
                    </p>
                    <p style={{ ...font, fontSize: '0.65rem', color: C.slate, marginTop: '0.1rem' }}>
                      {parseFloat(t.amount_catr).toFixed(4)} CATR · {t.attempts} intentos
                    </p>
                    {t.last_attempt_at && (
                      <p style={{ ...font, fontSize: '0.6rem', color: C.slate }}>
                        Último intento: {new Date(t.last_attempt_at).toLocaleString('es-HN')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleResetTransfer(t.id)}
                    disabled={resetting === t.id}
                    style={{
                      ...font, flexShrink: 0,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: '0.5rem', color: C.warn, fontSize: '0.7rem', fontWeight: 600,
                      padding: '0.3rem 0.75rem', cursor: resetting === t.id ? 'not-allowed' : 'pointer',
                      opacity: resetting === t.id ? 0.5 : 1,
                    }}
                  >
                    {resetting === t.id ? '…' : 'Re-intentar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
