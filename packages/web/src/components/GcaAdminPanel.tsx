'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getGcaRedemptions,
  approveGcaRedemption,
  rejectGcaRedemption,
  getAdminGcaMerchants,
  adminVestMerchant,
  adminGiftMerchant,
  getGcaHistory,
  getGcaApplicationsAdmin,
  approveGcaApplication,
  rejectGcaApplication,
  type GcaRedemptionRequest,
  type GcaMerchantAllocation,
  type GcaHistoryEntry,
  type GcaApplicationAdmin,
} from '@/lib/api';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:        '#06080D',
  surface:   '#0C1018',
  surfaceHi: '#111820',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.13)',
  gold:      '#C9A84C',
  goldDim:   'rgba(201,168,76,0.12)',
  white:     '#F1F5F9',
  slate:     '#64748B',
  slateHi:   '#94A3B8',
  success:   '#10B981',
  successBg: 'rgba(16,185,129,0.08)',
  error:     '#EF4444',
  errorBg:   'rgba(239,68,68,0.08)',
  warn:      '#F59E0B',
  warnBg:    'rgba(245,158,11,0.08)',
};

const font = { fontFamily: 'var(--font-body)' };

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '1rem', padding: '1.25rem' }}>
      <p style={{ ...font, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: C.slate, textTransform: 'uppercase', marginBottom: '1rem' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Btn({
  children, onClick, disabled, variant = 'default',
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'default' | 'gold' | 'danger' | 'ghost' }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderHi}`, color: C.white },
    gold:    { background: C.goldDim, border: '1px solid rgba(201,168,76,0.35)', color: C.gold },
    danger:  { background: C.errorBg, border: '1px solid rgba(239,68,68,0.3)', color: C.error },
    ghost:   { background: 'transparent', border: 'none', color: C.slate },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...font, ...styles[variant],
        padding: '0.4rem 0.85rem',
        borderRadius: '0.6rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  );
}



function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      ...font,
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
      padding: '0.2rem 0.55rem', borderRadius: '999px',
      background: `${color}18`, color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

const TX_TYPE_COLORS: Record<string, string> = {
  GIFT:      C.gold,
  VEST:      C.success,
  TRADE_OUT: C.warn,
  TRADE_IN:  C.slateHi,
  REDEEM:    C.error,
};

// ─── Section: GCA Applications ───────────────────────────────────────────────

function GcaApplicationsSection({ token, onApproved }: { token: string; onApproved: () => void }) {
  const [apps, setApps] = useState<GcaApplicationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await getGcaApplicationsAdmin(token);
      setApps(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar aplicaciones.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handle(id: string, action: 'approve' | 'reject') {
    setActioning(id);
    try {
      if (action === 'approve') await approveGcaApplication(id, token);
      else await rejectGcaApplication(id, token);
      await load();
      if (action === 'approve') onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error.');
    } finally {
      setActioning(null);
    }
  }

  return (
    <Card title={`Aplicaciones GCA — ${apps.length} pendientes`}>
      {loading ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Cargando…</p>
      ) : error ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.error }}>{error}</p>
      ) : apps.length === 0 ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Sin aplicaciones pendientes.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {apps.map((app) => (
            <div
              key={app.id}
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
            >
              <div style={{ flex: '1 1 140px' }}>
                <p style={{ ...font, fontSize: '0.88rem', fontWeight: 600, color: C.white }}>{app.merchant.name}</p>
                <p style={{ ...font, fontSize: '0.68rem', color: C.slate, marginTop: '0.1rem' }}>
                  {app.merchant.category} · {new Date(app.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <Btn variant="gold" onClick={() => handle(app.id, 'approve')} disabled={actioning === app.id}>
                  Aprobar
                </Btn>
                <Btn variant="danger" onClick={() => handle(app.id, 'reject')} disabled={actioning === app.id}>
                  Rechazar
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section: Merchant GCA Status ─────────────────────────────────────────────

function MerchantRow({ alloc, token, onVested }: {
  alloc: GcaMerchantAllocation; token: string; onVested: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<GcaHistoryEntry[] | null>(null);
  const [vestState, setVestState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [vestMsg, setVestMsg] = useState('');
  const [giftState, setGiftState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [giftMsg, setGiftMsg] = useState('');
  const [giftAmount, setGiftAmount] = useState('1200');

  async function loadHistory() {
    if (history) { setExpanded((v) => !v); return; }
    const r = await getGcaHistory(alloc.merchant_id);
    setHistory(r.data);
    setExpanded(true);
  }

  async function handleGift() {
    const amount = parseFloat(giftAmount);
    if (isNaN(amount) || amount <= 0) { setGiftMsg('Cantidad inválida.'); return; }
    setGiftState('loading');
    setGiftMsg('');
    try {
      const r = await adminGiftMerchant(alloc.merchant_id, token, amount);
      setGiftMsg(`✓ ${amount.toFixed(0)} GCA regalados · tx: ${r.data.tx_hash?.slice(0, 10) ?? '—'}…`);
      setGiftState('done');
      setHistory(null);
      onVested();
    } catch (err) {
      setGiftState('error');
      setGiftMsg(err instanceof Error ? err.message : 'Error al entregar regalo.');
    }
  }

  async function handleVest() {
    setVestState('loading');
    setVestMsg('');
    try {
      const r = await adminVestMerchant(alloc.merchant_id, token);
      setVestMsg(`+${parseFloat(String(r.data.new_balance ?? 0)).toFixed(2)} GCA · ${r.data.milestones_claimed} hitos`);
      setVestState('done');
      setHistory(null);
      onVested();
    } catch (err) {
      setVestState('error');
      setVestMsg(err instanceof Error ? err.message : 'Error al ejecutar vesting.');
    }
  }

  const progress = Math.min((alloc.milestones_claimed / 10) * 100, 100);

  return (
    <div style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: '0.75rem', overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Name */}
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <p style={{ ...font, fontSize: '0.9rem', fontWeight: 600, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alloc.merchant_name}</p>
          <p style={{ ...font, fontSize: '0.65rem', color: C.slate, marginTop: '0.1rem' }}>
            {alloc.milestones_claimed}/10 hitos
          </p>
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ ...font, fontSize: '1.1rem', fontWeight: 300, color: C.gold }}>
            {parseFloat(alloc.gca_balance).toFixed(2)} GCA
          </p>
          <p style={{ ...font, fontSize: '0.7rem', color: C.slate }}>
            ≈ L. {parseFloat(alloc.estimated_hnl_value).toFixed(2)}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <Btn variant="default" onClick={handleVest} disabled={vestState === 'loading'}>
            {vestState === 'loading' ? 'Evaluando…' : 'Vest'}
          </Btn>
          <Btn variant="ghost" onClick={loadHistory}>
            {expanded ? '▲' : '▼'}
          </Btn>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 1rem 0.75rem' }}>
        <div style={{ height: 3, borderRadius: 9999, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: 3, borderRadius: 9999, width: `${progress}%`, background: C.gold, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <p style={{ ...font, fontSize: '0.62rem', color: C.slate }}>
            CATR efectivo: {parseFloat(alloc.lifetime_effective_catr).toLocaleString('es-HN', { maximumFractionDigits: 0 })}
          </p>
          <p style={{ ...font, fontSize: '0.62rem', color: C.slate }}>
            Próx. hito: {parseFloat(alloc.next_milestone_at).toLocaleString('es-HN')} CATR
          </p>
        </div>
      </div>

      {/* Gift row */}
      {!alloc.gift_claimed && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ ...font, fontSize: '0.68rem', color: C.slate }}>Regalo bienvenida:</span>
          <input
            type="number"
            value={giftAmount}
            onChange={(e) => setGiftAmount(e.target.value)}
            style={{ ...font, width: 80, background: C.surface, border: `1px solid ${C.border}`, borderRadius: '0.4rem', padding: '0.25rem 0.5rem', color: C.white, fontSize: '0.8rem' }}
          />
          <span style={{ ...font, fontSize: '0.68rem', color: C.slate }}>GCA</span>
          <Btn variant="gold" onClick={handleGift} disabled={giftState === 'loading'}>
            {giftState === 'loading' ? 'Enviando…' : 'Gift'}
          </Btn>
          {giftMsg && <span style={{ ...font, fontSize: '0.72rem', color: giftState === 'done' ? C.success : C.error }}>{giftMsg}</span>}
        </div>
      )}

      {/* Vest feedback */}
      {vestMsg && (
        <div style={{ padding: '0 1rem 0.75rem' }}>
          <p style={{ ...font, fontSize: '0.78rem', color: vestState === 'done' ? C.success : C.error }}>{vestMsg}</p>
        </div>
      )}

      {/* History */}
      {expanded && history && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {history.length === 0 ? (
            <p style={{ ...font, fontSize: '0.8rem', color: C.slate }}>Sin movimientos GCA aún.</p>
          ) : (
            history.map((tx) => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Pill label={tx.type} color={TX_TYPE_COLORS[tx.type] ?? C.slateHi} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...font, fontSize: '0.78rem', color: C.white, fontWeight: 600 }}>
                    {parseFloat(tx.amount_gca).toFixed(2)} GCA
                  </p>
                  {tx.notes && <p style={{ ...font, fontSize: '0.68rem', color: C.slate, marginTop: '0.1rem' }}>{tx.notes}</p>}
                </div>
                <p style={{ ...font, fontSize: '0.65rem', color: C.slate, flexShrink: 0 }}>
                  {new Date(tx.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MerchantsSection({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [merchants, setMerchants] = useState<GcaMerchantAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAdminGcaMerchants(token);
      setMerchants(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar comercios.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <Card title={`Estado GCA — ${merchants.length} comercios`}>
      {loading ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Cargando…</p>
      ) : error ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.error }}>{error}</p>
      ) : merchants.length === 0 ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Sin comercios con asignación GCA.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {merchants.map((m) => (
            <MerchantRow key={m.merchant_id} alloc={m} token={token} onVested={load} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section: Redemption Queue ────────────────────────────────────────────────

function RedemptionsSection({ token }: { token: string }) {
  const [redemptions, setRedemptions] = useState<GcaRedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await getGcaRedemptions(token);
      setRedemptions(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar canjes.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handle(id: string, action: 'approve' | 'reject') {
    setActioning(id);
    try {
      if (action === 'approve') await approveGcaRedemption(id, token);
      else await rejectGcaRedemption(id, token);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error.');
    } finally {
      setActioning(null);
    }
  }

  return (
    <Card title="Cola de canjes GCA pendientes">
      {loading ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Cargando…</p>
      ) : error ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.error }}>{error}</p>
      ) : redemptions.length === 0 ? (
        <p style={{ ...font, fontSize: '0.85rem', color: C.slate }}>Sin solicitudes pendientes.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {redemptions.map((r) => (
            <div
              key={r.id}
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
            >
              <div style={{ flex: '1 1 140px' }}>
                <p style={{ ...font, fontSize: '0.88rem', fontWeight: 600, color: C.white }}>
                  {r.merchant?.name ?? r.merchant_id}
                </p>
                <p style={{ ...font, fontSize: '0.68rem', color: C.slate, marginTop: '0.1rem' }}>
                  {new Date(r.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ ...font, fontSize: '0.88rem', fontWeight: 600, color: C.gold }}>
                  {parseFloat(r.amount_gca).toFixed(2)} GCA
                </p>
                <p style={{ ...font, fontSize: '0.7rem', color: C.slate }}>
                  @ L. {parseFloat(r.price_floor_hnl).toFixed(4)} · ≈ L. {parseFloat(r.amount_hnl_estimated).toFixed(2)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <Btn
                  variant="gold"
                  onClick={() => handle(r.id, 'approve')}
                  disabled={actioning === r.id}
                >
                  Aprobar
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => handle(r.id, 'reject')}
                  disabled={actioning === r.id}
                >
                  Rechazar
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function GcaAdminPanel({ token }: { token: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <GcaApplicationsSection token={token} onApproved={() => setRefreshKey((k) => k + 1)} />
      <MerchantsSection  token={token} refreshKey={refreshKey} />
      <RedemptionsSection token={token} />
    </div>
  );
}
