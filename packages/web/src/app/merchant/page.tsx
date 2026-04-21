'use client';

import { FidelioIntro } from '@/components/FidelioIntro';
import { useState, useEffect } from 'react';
import {
  getMerchantPublic,
  getMerchantBalance,
  getMerchantTransactions,
  getMerchantRedemptions,
  createMerchantRedemption,
  getGcaBalance,
  redeemGca,
  type Merchant,
  type MerchantBalance,
  type MerchantTransaction,
  type RedemptionRequest,
  type GcaBalance,
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

// ─── Primitive UI ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {title && (
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: C.slate }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function PrimaryBtn({
  children, onClick, disabled, type = 'button',
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-semibold disabled:opacity-30 transition-all active:scale-95"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${C.borderHi}`,
        color: C.white,
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.08em',
        fontSize: '0.85rem',
      }}
    >
      {children}
    </button>
  );
}

function GoldBtn({
  children, onClick, disabled, type = 'button',
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-semibold disabled:opacity-30 transition-all active:scale-95"
      style={{
        background: C.goldDim,
        border: `1px solid rgba(201,168,76,0.35)`,
        color: C.gold,
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.1em',
        fontSize: '0.85rem',
      }}
    >
      {children}
    </button>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="uppercase tracking-widest"
        style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300 }}
      >
        {label}
      </label>
      <div className="shimmer-border rounded-xl p-px">
        <input
          {...props}
          className="w-full rounded-xl px-4 py-3 focus:outline-none transition-all"
          style={{
            background: C.surfaceHi,
            color: C.white,
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem',
            fontWeight: 300,
          }}
        />
      </div>
    </div>
  );
}

function StatusMsg({ type, msg }: { type: 'success' | 'error' | 'warn'; msg: string }) {
  const colors = {
    success: { bg: C.successBg, color: C.success, border: 'rgba(16,185,129,0.3)' },
    error:   { bg: C.errorBg,   color: C.error,   border: 'rgba(239,68,68,0.3)' },
    warn:    { bg: C.warnBg,    color: C.warn,     border: 'rgba(245,158,11,0.3)' },
  }[type];
  return (
    <p
      className="text-sm text-center rounded-xl py-2.5 px-3 font-medium"
      style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
    >
      {msg}
    </p>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
    >
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.slate }}>{label}</p>
      <p
        className={`text-sm font-semibold truncate max-w-[60%] text-right ${mono ? 'font-mono' : ''}`}
        style={{ color: C.white }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconStore() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path d="M3 9l1-5h16l1 5" strokeLinecap="round" />
      <path d="M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
      <path d="M9 21V12h6v9" strokeLinecap="round" />
    </svg>
  );
}

function IconSwap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGem() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <polygon points="12 2 22 9 18 20 6 20 2 9" strokeLinejoin="round" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="12" y1="2" x2="6" y2="20" />
      <line x1="12" y1="2" x2="18" y2="20" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" />
      <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" />
      <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" />
      <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (merchant: Merchant) => void }) {
  const [merchantId, setMerchantId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!merchantId.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await getMerchantPublic(merchantId.trim());
      onLogin(res.data);
    } catch {
      setError('Comercio no encontrado. Verifica tu ID.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative"
      style={{ background: C.bg, fontFamily: 'var(--font-body)' }}
    >
      <div className="mb-12 text-center">
        <p
          className="uppercase tracking-widest mb-1"
          style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.22em' }}
        >
          Honduras Nativa Digital Answers
        </p>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
            fontWeight: 200,
            letterSpacing: '0.18em',
            color: C.white,
            lineHeight: 1,
          }}
        >
          FIDELIO
        </h1>
        <div className="mx-auto mt-3" style={{ width: 32, height: 1, background: 'rgba(201,168,76,0.4)' }} />
        <p
          className="mt-3 uppercase tracking-widest"
          style={{ color: C.slate, fontSize: '0.6rem', fontWeight: 300, letterSpacing: '0.18em' }}
        >
          Portal de Comercios
        </p>
      </div>

      <div className="shimmer-border rounded-2xl p-px w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl px-6 py-7 flex flex-col gap-5"
          style={{ background: C.surface }}
        >
          <Input
            label="ID de comercio"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
          />

          {error && <StatusMsg type="error" msg={error} />}

          <PrimaryBtn type="submit" disabled={loading || !merchantId.trim()}>
            {loading ? 'Verificando' : 'Acceder'}
          </PrimaryBtn>

          <p
            className="text-center"
            style={{ color: C.slate, fontSize: '0.7rem', fontWeight: 300, letterSpacing: '0.06em' }}
          >
            Cliente —{' '}
            <a href="/client" style={{ color: C.slateHi, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              accede aquí
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ merchant, balance, onLogout }: { merchant: Merchant; balance: MerchantBalance | null; onLogout: () => void }) {
  return (
    <div
      className="px-5 pt-12 pb-6 relative overflow-hidden"
      style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
    >
      <div
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-72 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)' }}
      />

      <div className="flex items-center justify-between mb-5">
        <span className="text-base font-black tracking-widest" style={{ color: C.gold }}>FIDELIO</span>
        <button
          onClick={onLogout}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
          style={{ background: C.surfaceHi, color: C.slate, border: `1px solid ${C.border}` }}
        >
          Salir
        </button>
      </div>

      <p
        className="mb-1"
        style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.06em' }}
      >
        {merchant.category}
      </p>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 style={{ fontSize: '1.6rem', lineHeight: 1, color: C.white, fontFamily: 'var(--font-body)', fontWeight: 300 }}>
          {merchant.name}
        </h2>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: merchant.active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: merchant.active ? C.success : C.error,
            border: `1px solid ${merchant.active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {merchant.active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span style={{ fontSize: '3.5rem', lineHeight: 1, color: C.white, fontFamily: 'var(--font-body)', fontWeight: 200 }}>
          {balance ? parseFloat(balance.catr_balance).toFixed(2) : '—'}
        </span>
        <span style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 300, color: C.slateHi }}>pts</span>
      </div>
      <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300, marginTop: '0.4rem', letterSpacing: '0.08em' }}>
        Balance disponible · 1 pt = 1 HNL
      </p>
    </div>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────────────────────

type Tab = 'negocio' | 'canjear' | 'gca' | 'movimientos';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'negocio',     label: 'Mi Negocio',  icon: <IconStore /> },
    { id: 'canjear',     label: 'Canjear',     icon: <IconSwap /> },
    { id: 'gca',         label: 'GCA',         icon: <IconGem /> },
    { id: 'movimientos', label: 'Movimientos', icon: <IconList /> },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex"
      style={{ background: C.surface, borderTop: `1px solid ${C.border}`, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all relative"
            style={{ color: isActive ? C.gold : C.slate }}
          >
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: C.gold }}
              />
            )}
            {t.icon}
            <span className="text-xs font-semibold">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Tab: Mi Negocio ──────────────────────────────────────────────────────────

function NegocioTab({ merchant }: { merchant: Merchant }) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(merchant.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Wallet">
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>
                Dirección
              </p>
              <p className="text-sm font-mono font-semibold" style={{ color: C.white }}>
                {`${merchant.wallet_address.slice(0, 8)}…${merchant.wallet_address.slice(-6)}`}
              </p>
            </div>
            <button
              onClick={copyAddress}
              className="p-2 rounded-lg transition-all active:scale-95"
              style={{ background: C.surface, color: copied ? C.success : C.slate }}
              title="Copiar dirección"
            >
              <IconCopy />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Red</p>
              <p className="text-sm font-semibold" style={{ color: C.slateHi }}>Base (L2)</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Token</p>
              <p className="text-sm font-semibold" style={{ color: C.gold }}>CATR + GCA</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Información">
        <div className="flex flex-col gap-2">
          <InfoRow label="Nombre"   value={merchant.name} />
          <InfoRow label="Categoría" value={merchant.category} />
          <InfoRow label="Contacto" value={merchant.contact_email} />
          <InfoRow label="Estado"   value={
            <span style={{ color: merchant.active ? C.success : C.error }}>
              {merchant.active ? 'Activo' : 'Inactivo'}
            </span>
          } />
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Canjear ─────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  AUTO:             'Automático',
  ADMIN_APPROVAL:   'Aprobación admin',
  VAULT_OP:         'VaultOp (2-de-2)',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_BURN:  'Pendiente',
  BURN_SUBMITTED: 'En proceso',
  BURNED:         'Quemado',
  LEMPIRAS_SENT:  'Completado',
  FAILED:         'Fallido',
};

function statusColor(status: string): string {
  if (status === 'LEMPIRAS_SENT') return C.success;
  if (status === 'FAILED')        return C.error;
  if (status === 'BURNED' || status === 'BURN_SUBMITTED') return C.warn;
  return C.slateHi;
}

function CanjearTab({ merchant }: { merchant: Merchant }) {
  const [amount, setAmount] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    getMerchantRedemptions(merchant.id)
      .then((r) => setRedemptions(r.data))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));

    const interval = setInterval(() => {
      getMerchantRedemptions(merchant.id).then((r) => setRedemptions(r.data)).catch(() => {});
    }, 15_000);
    return () => clearInterval(interval);
  }, [merchant.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setState('loading');
    setMsg('');
    try {
      const res = await createMerchantRedemption(merchant.id, amount);
      setRedemptions((prev) => [res.data, ...prev]);
      setState('success');
      setMsg(`Solicitud enviada: ${parseFloat(amount).toFixed(2)} CATR → HNL`);
      setAmount('');
    } catch (err) {
      setState('error');
      setMsg(err instanceof Error ? err.message : 'Error al procesar la solicitud.');
    }
  }

  const amountNum = parseFloat(amount) || 0;
  const tier =
    amountNum > 0 && amountNum < 50   ? 'AUTO' :
    amountNum >= 50 && amountNum <= 500 ? 'ADMIN_APPROVAL' :
    amountNum > 500                    ? 'VAULT_OP' : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="shimmer-border rounded-2xl p-px">
        <form onSubmit={handleSubmit} className="rounded-2xl px-5 py-6 flex flex-col gap-5" style={{ background: C.surface }}>
          <Input
            label="Monto a canjear (CATR)"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />

          {tier && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2.5"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
            >
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.slate }}>Tipo</span>
              <span className="text-xs font-semibold ml-auto" style={{ color: C.slateHi }}>
                {TIER_LABELS[tier]}
              </span>
            </div>
          )}

          {state === 'success' && <StatusMsg type="success" msg={msg} />}
          {state === 'error'   && <StatusMsg type="error"   msg={msg} />}

          <PrimaryBtn type="submit" disabled={state === 'loading' || !amount}>
            {state === 'loading' ? 'Enviando' : 'Solicitar canje'}
          </PrimaryBtn>
        </form>
      </div>

      <Section title="Historial de canjes">
        {loadingHistory ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>Cargando…</p>
        ) : redemptions.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>Sin solicitudes aún.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.white }}>
                    {parseFloat(r.amount_catr).toFixed(2)} CATR
                  </p>
                  <p className="text-xs" style={{ color: C.slate }}>
                    {TIER_LABELS[r.tier] ?? r.tier} ·{' '}
                    {new Date(r.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs font-bold" style={{ color: statusColor(r.status) }}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.slate }}>Niveles de aprobación</p>
        <div className="flex flex-col gap-1.5">
          {[
            { range: '< 50 CATR',      tier: 'Automático' },
            { range: '50 – 500 CATR',  tier: 'Aprobación admin' },
            { range: '> 500 CATR',     tier: 'VaultOp (Gnosis Safe 2-de-2)' },
          ].map(({ range, tier: t }) => (
            <div key={range} className="flex justify-between">
              <span style={{ color: C.slate, fontSize: '0.75rem' }}>{range}</span>
              <span style={{ color: C.slateHi, fontSize: '0.75rem', fontWeight: 600 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: GCA ─────────────────────────────────────────────────────────────────

function GcaTab({ merchant }: { merchant: Merchant }) {
  const [gca, setGca] = useState<GcaBalance | null>(null);
  const [gcaError, setGcaError] = useState('');
  const [applying, setApplying] = useState(false);
  const [amount, setAmount] = useState('');
  const [applyState, setApplyState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [applyMsg, setApplyMsg] = useState('');

  useEffect(() => {
    getGcaBalance(merchant.id)
      .then((r) => setGca(r.data))
      .catch((err) => setGcaError(err instanceof Error ? err.message : 'Error al cargar GCA.'));
  }, [merchant.id]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !gca) return;
    setApplyState('loading');
    setApplyMsg('');
    try {
      await redeemGca({ merchant_id: merchant.id, amount_gca: parseFloat(amount) });
      setApplyState('success');
      setApplyMsg('Solicitud enviada. HNDA revisará tu aplicación.');
      setAmount('');
      setApplying(false);
      const r = await getGcaBalance(merchant.id);
      setGca(r.data);
    } catch (err) {
      setApplyState('error');
      setApplyMsg(err instanceof Error ? err.message : 'Error al enviar solicitud.');
    }
  }

  const progress = gca ? (gca.milestones_claimed / 10) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Program description */}
      <Section title="¿Qué es GCA?">
        <p style={{ color: C.slateHi, fontSize: '0.85rem', fontWeight: 300, lineHeight: 1.6 }}>
          Guacacoin (GCA) es el token de participación de la red FIDELIO.
          Los comercios lo reciben como reconocimiento por el volumen de transacciones
          que procesan dentro de la red y pueden canjearlo por Lempiras.
        </p>
      </Section>

      {/* Earning rules */}
      <Section title="Cómo se gana GCA">
        <div className="flex flex-col gap-2">
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, display: 'inline-block', flexShrink: 0, marginTop: 6 }} />
            <div>
              <p className="text-sm font-bold" style={{ color: C.gold }}>Regalo de bienvenida</p>
              <p className="text-xs" style={{ color: C.slate }}>200 GCA al unirte a la red FIDELIO</p>
            </div>
          </div>
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, display: 'inline-block', flexShrink: 0, marginTop: 6 }} />
            <div>
              <p className="text-sm font-bold" style={{ color: C.gold }}>Hitos de volumen</p>
              <p className="text-xs" style={{ color: C.slate }}>
                +100 GCA por cada 25,000 CATR efectivos procesados · máximo 10 hitos
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Multiplier table */}
      <Section title="Multiplicador por clientes únicos">
        <p className="text-xs mb-3" style={{ color: C.slate, fontWeight: 300 }}>
          El CATR efectivo se multiplica según la diversidad de clientes que te visitan.
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            { range: '≥ 60% clientes únicos', mult: '×2.0' },
            { range: '≥ 40% clientes únicos', mult: '×1.5' },
            { range: '≥ 20% clientes únicos', mult: '×1.25' },
            { range: '< 20% clientes únicos',  mult: '×1.0' },
          ].map(({ range, mult }) => (
            <div
              key={range}
              className="flex justify-between items-center rounded-xl px-4 py-2.5"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
            >
              <span style={{ color: C.slate, fontSize: '0.75rem' }}>{range}</span>
              <span style={{ color: C.gold, fontSize: '0.85rem', fontWeight: 700 }}>{mult}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Current status */}
      {gcaError ? (
        <StatusMsg type="error" msg={gcaError} />
      ) : !gca ? (
        <p className="text-sm text-center py-4" style={{ color: C.slate }}>Cargando balance GCA…</p>
      ) : (
        <Section title="Tu estado actual">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Balance GCA</p>
                <p className="text-lg font-semibold" style={{ color: C.gold }}>{parseFloat(gca.gca_balance).toFixed(2)}</p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Valor est. HNL</p>
                <p className="text-lg font-semibold" style={{ color: C.white }}>L. {parseFloat(gca.estimated_hnl_value).toFixed(2)}</p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Hitos</p>
                <p className="text-lg font-semibold" style={{ color: C.white }}>{gca.milestones_claimed} / 10</p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Precio piso</p>
                <p className="text-lg font-semibold" style={{ color: C.white }}>L. {parseFloat(gca.price_floor_hnl).toFixed(4)}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: C.slate }}>
                <span>Progreso de vesting</span>
                <span>{gca.milestones_claimed * 100 + 200} / 1,200 GCA ganados</span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%`, background: C.gold }}
                />
              </div>
            </div>

            <div
              className="rounded-xl px-4 py-2.5"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
            >
              <p className="text-xs" style={{ color: C.slate }}>
                Próximo hito en{' '}
                <span style={{ color: C.slateHi, fontWeight: 600 }}>
                  {parseFloat(gca.next_milestone_at).toLocaleString()} CATR efectivos
                </span>
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Apply section */}
      {gca && (
        <>
          {applyState === 'success' && <StatusMsg type="success" msg={applyMsg} />}

          {applying ? (
            <div className="shimmer-border rounded-2xl p-px">
              <form onSubmit={handleApply} className="rounded-2xl px-5 py-6 flex flex-col gap-5" style={{ background: C.surface }}>
                <Input
                  label="GCA a canjear"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={parseFloat(gca.gca_balance)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                {amount && (
                  <p className="text-xs text-center" style={{ color: C.slate }}>
                    Valor estimado:{' '}
                    <span style={{ color: C.slateHi, fontWeight: 600 }}>
                      L. {(parseFloat(amount) * parseFloat(gca.price_floor_hnl)).toFixed(2)}
                    </span>
                  </p>
                )}
                {applyState === 'error' && <StatusMsg type="error" msg={applyMsg} />}
                <PrimaryBtn type="submit" disabled={applyState === 'loading' || !amount}>
                  {applyState === 'loading' ? 'Enviando' : 'Confirmar solicitud'}
                </PrimaryBtn>
                <button
                  type="button"
                  onClick={() => { setApplying(false); setApplyState('idle'); setApplyMsg(''); }}
                  style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </form>
            </div>
          ) : (
            <GoldBtn onClick={() => setApplying(true)}>
              Aplicar para canje de GCA
            </GoldBtn>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Movimientos ─────────────────────────────────────────────────────────

function MovimientosTab({ merchant }: { merchant: Merchant }) {
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMerchantTransactions(merchant.id)
      .then((r) => setTransactions(r.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar movimientos.'))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      getMerchantTransactions(merchant.id).then((r) => setTransactions(r.data)).catch(() => {});
    }, 15_000);
    return () => clearInterval(interval);
  }, [merchant.id]);

  return (
    <div className="flex flex-col gap-4">
      <Section title="Historial de movimientos">
        {loading ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>Cargando…</p>
        ) : error ? (
          <StatusMsg type="error" msg={error} />
        ) : transactions.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>Sin movimientos aún.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(16,185,129,0.12)', color: C.success }}
                  >
                    ↓
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.white }}>
                      {tx.type === 'MINT'
                        ? tx.source === 'ADMIN' ? 'Acreditación admin' : `Acreditación (${tx.source ?? 'sistema'})`
                        : 'Puntos recibidos'}
                    </p>
                    <p className="text-xs" style={{ color: C.slate }}>
                      {new Date(tx.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: C.success }}>
                  +{parseFloat(tx.amount_catr).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'fidelio_merchant_session';

export default function MerchantPage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [balance, setBalance] = useState<MerchantBalance | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('negocio');

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const session = JSON.parse(raw);
      setMerchant(session.merchant);
      setIntroComplete(true);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (!merchant) return;
    getMerchantBalance(merchant.id)
      .then((r) => setBalance(r.data))
      .catch(() => {});

    const interval = setInterval(() => {
      getMerchantBalance(merchant.id)
        .then((r) => setBalance(r.data))
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(interval);
  }, [merchant?.id]);

  function handleLogin(m: Merchant) {
    setMerchant(m);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ merchant: m }));
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setMerchant(null);
    setBalance(null);
    setActiveTab('negocio');
  }

  if (!introComplete) return <FidelioIntro onComplete={() => setIntroComplete(true)} />;
  if (!merchant)      return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <TopBar merchant={merchant} balance={balance} onLogout={handleLogout} />
      <main className="px-4 pt-5 pb-28 flex flex-col gap-4">
        {activeTab === 'negocio'     && <NegocioTab     merchant={merchant} />}
        {activeTab === 'canjear'     && <CanjearTab     merchant={merchant} />}
        {activeTab === 'gca'         && <GcaTab         merchant={merchant} />}
        {activeTab === 'movimientos' && <MovimientosTab merchant={merchant} />}
      </main>
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
