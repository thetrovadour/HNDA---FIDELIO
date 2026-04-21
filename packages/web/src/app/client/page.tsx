'use client';
import { FidelioIntro } from '@/components/FidelioIntro';
import { useState, useEffect, useRef } from 'react';
import {
  pilotLogin,
  spendCATR,
  getUser,
  getUserTransactions,
} from '@/lib/api';
import type { UserRecord, Transaction, Milestone, Merchant } from '@/lib/api';

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

function StatusMsg({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <p
      className="text-sm text-center rounded-xl py-2.5 px-3 font-medium"
      style={{
        background: type === 'success' ? C.successBg : C.errorBg,
        color: type === 'success' ? C.success : C.error,
        border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}
    >
      {msg}
    </p>
  );
}

// ─── Animated balance counter ─────────────────────────────────────────────────

function AnimatedBalance({ value }: { value: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const start = parseFloat(prev.current);
    const end = parseFloat(value);
    const duration = 600;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay((start + (end - start) * eased).toFixed(2));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = value;
    }

    requestAnimationFrame(tick);
  }, [value]);

  return <>{display}</>;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <line x1="12" y1="7" x2="5" y2="17" strokeLinecap="round" />
      <line x1="12" y1="7" x2="19" y2="17" strokeLinecap="round" />
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

interface LoginProps {
  onLogin: (data: { token: string; user: UserRecord; transactions: Transaction[]; milestones: Milestone[]; merchants: Merchant[] }) => void;
}

function LoginScreen({ onLogin }: LoginProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || pin.length !== 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await pilotLogin({ full_name: name.trim(), pin });
      onLogin(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')
          ? `Error de red: ${msg}`
          : 'No encontramos tu cuenta. Verifica tu nombre y PIN.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative"
      style={{ background: C.bg, fontFamily: 'var(--font-body)' }}
    >
      {/* Brand */}
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
        <div
          className="mx-auto mt-3"
          style={{ width: 32, height: 1, background: `rgba(201,168,76,0.4)` }}
        />
      </div>

      {/* Card */}
      <div className="shimmer-border rounded-2xl p-px w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl px-6 py-7 flex flex-col gap-5"
          style={{ background: C.surface }}
        >
          <Input
            label="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="María García"
            autoComplete="name"
          />
          <Input
            label="PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
          />

          {error && <StatusMsg type="error" msg={error} />}

          <PrimaryBtn type="submit" disabled={loading || pin.length !== 4 || !name.trim()}>
            {loading ? 'Verificando' : 'Acceder'}
          </PrimaryBtn>

          <p
            className="text-center"
            style={{ color: C.slate, fontSize: '0.7rem', fontWeight: 300, letterSpacing: '0.06em' }}
          >
            Comerciante —{' '}
            <a href="/merchant" style={{ color: C.slateHi, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              accede aquí
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ user, onLogout }: { user: UserRecord; onLogout: () => void }) {
  const firstName = user.full_name.split(' ')[0];

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
        {firstName}
      </p>

      <div className="flex items-baseline gap-2">
        <span style={{ fontSize: '3.5rem', lineHeight: 1, color: C.white, fontFamily: 'var(--font-body)', fontWeight: 200 }}>
          <AnimatedBalance value={user.catr_balance} />
        </span>
        <span style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 300, color: C.slateHi }}>pts</span>
      </div>
      <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300, marginTop: '0.4rem', letterSpacing: '0.08em' }}>
        Saldo disponible · 1 pt = 1 HNL
      </p>
    </div>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────────────────────

type Tab = 'cuenta' | 'actividad' | 'red';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'cuenta',    label: 'Mi Cuenta',  icon: <IconUser /> },
    { id: 'actividad', label: 'Actividad',  icon: <IconActivity /> },
    { id: 'red',       label: 'Red',        icon: <IconNetwork /> },
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

// ─── Tab: Mi Cuenta ───────────────────────────────────────────────────────────

function CuentaTab({ user }: { user: UserRecord }) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    if (!user.wallet_address) return;
    navigator.clipboard.writeText(user.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const memberSince = new Date(user.created_at).toLocaleDateString('es-HN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-4">

      {/* Wallet */}
      <Section title="Mi Wallet">
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
                {user.wallet_address
                  ? `${user.wallet_address.slice(0, 8)}…${user.wallet_address.slice(-6)}`
                  : 'Sin wallet asignada'}
              </p>
            </div>
            {user.wallet_address && (
              <button
                onClick={copyAddress}
                className="p-2 rounded-lg transition-all active:scale-95"
                style={{ background: C.surface, color: copied ? C.success : C.slate }}
                title="Copiar dirección"
              >
                <IconCopy />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Red</p>
              <p className="text-sm font-semibold" style={{ color: C.slateHi }}>Base (L2)</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Token</p>
              <p className="text-sm font-semibold" style={{ color: C.gold }}>CATR</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Profile */}
      <Section title="Mi Perfil">
        <div className="flex flex-col gap-2">
          {[
            { label: 'Nombre', value: user.full_name },
            { label: 'Correo', value: user.email },
            { label: 'Miembro desde', value: memberSince },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.slate }}>{label}</p>
              <p className="text-sm font-semibold truncate max-w-[60%] text-right" style={{ color: C.white }}>{value}</p>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}

// ─── Tab: Actividad ───────────────────────────────────────────────────────────

const MILESTONE_LABELS: Record<string, string> = {
  TX_5:          '5 transacciones',
  TX_10:         '10 transacciones',
  TX_25:         '25 transacciones',
  CROSS_MERCHANT: 'Bonus multi-comercio',
  REFERRAL:      'Bono de referido',
};

function ActividadTab({ transactions, milestones }: { transactions: Transaction[]; milestones: Milestone[] }) {
  return (
    <div className="flex flex-col gap-4">

      {/* Milestones */}
      {milestones.length > 0 && (
        <Section title="Recompensas desbloqueadas">
          <div className="flex flex-col gap-2">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: C.gold, display: 'inline-block', flexShrink: 0,
                  }}
                />
                <div>
                  <p className="text-sm font-bold" style={{ color: C.gold, fontFamily: 'var(--font-body)' }}>
                    {MILESTONE_LABELS[m.type] ?? m.type}
                  </p>
                  <p className="text-xs" style={{ color: C.slate }}>
                    {new Date(m.unlocked_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Transactions */}
      <Section title="Historial de transacciones">
        {transactions.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>
            Sin transacciones aún.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => {
              const isMint = tx.type === 'MINT';
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{
                        background: isMint ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                        color: isMint ? C.success : C.slateHi,
                      }}
                    >
                      {isMint ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: C.white }}>
                        {isMint ? 'Puntos acumulados' : 'Puntos enviados'}
                      </p>
                      <p className="text-xs" style={{ color: C.slate }}>
                        {new Date(tx.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: isMint ? C.success : C.slateHi }}>
                    {isMint ? '+' : '-'}{parseFloat(tx.amount_catr).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

    </div>
  );
}

// ─── Tab: Red ─────────────────────────────────────────────────────────────────

function RedTab({ merchants, user, token, onSpend }: { merchants: Merchant[]; user: UserRecord; token: string; onSpend: () => void }) {
  const active = merchants.filter((m) => m.active);
  const [selected, setSelected] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function handleSpend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !amount) return;
    setState('loading');
    setMsg('');
    try {
      await spendCATR({ user_id: user.id, merchant_id: selected.id, amount_catr: amount }, token);
      setState('success');
      setMsg(`${parseFloat(amount).toFixed(2)} pts enviados a ${selected.name}.`);
      setAmount('');
      onSpend();
    } catch (err) {
      setState('error');
      setMsg(err instanceof Error ? err.message : 'Error al procesar la transacción.');
    }
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => { setSelected(null); setState('idle'); setMsg(''); setAmount(''); }}
          style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
        >
          ← Volver a la red
        </button>

        {state === 'success' ? (
          <Section>
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: C.successBg, border: '1px solid rgba(16,185,129,0.3)' }}
              >
                <span style={{ color: C.success, fontSize: '1.25rem', fontWeight: 700 }}>✓</span>
              </div>
              <p style={{ color: C.white, fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '0.9rem' }}>{msg}</p>
              <button
                onClick={() => { setState('idle'); setMsg(''); }}
                style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Nueva transacción
              </button>
            </div>
          </Section>
        ) : (
          <div className="shimmer-border rounded-2xl p-px">
            <form onSubmit={handleSpend} className="rounded-2xl px-5 py-6 flex flex-col gap-5" style={{ background: C.surface }}>
              <div>
                <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Comercio
                </p>
                <p style={{ color: C.white, fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '1rem' }}>
                  {selected.name}
                </p>
                <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300 }}>
                  {selected.category}
                </p>
              </div>

              <Input
                label="Puntos a enviar"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />

              {state === 'error' && <StatusMsg type="error" msg={msg} />}

              <PrimaryBtn type="submit" disabled={state === 'loading' || !amount}>
                {state === 'loading' ? 'Procesando' : 'Enviar puntos'}
              </PrimaryBtn>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title={`${active.length} establecimiento${active.length !== 1 ? 's' : ''} en la red`}>
        {active.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>
            No hay comercios activos aún.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 w-full text-left transition-all active:scale-95"
                style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, cursor: 'pointer' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)', color: C.slateHi }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.white, fontFamily: 'var(--font-body)' }}>{m.name}</p>
                  <p className="text-xs" style={{ color: C.slate, fontFamily: 'var(--font-body)', fontWeight: 300 }}>{m.category}</p>
                </div>
                <span style={{ color: C.slate, fontSize: '0.75rem' }}>→</span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <div
        className="rounded-2xl px-5 py-4 text-center"
        style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
      >
        <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.06em' }}>
          Selecciona un comercio para enviar puntos.
          <br />
          1 punto = 1 Lempira.
        </p>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'fidelio_session';

export default function ClientPage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('cuenta');

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const session = JSON.parse(raw);
      setToken(session.token);
      setUser(session.user);
      setTransactions(session.transactions ?? []);
      setMilestones(session.milestones ?? []);
      setMerchants(session.merchants ?? []);
      setIntroComplete(true);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  function handleLogin(data: { token: string; user: UserRecord; transactions: Transaction[]; milestones: Milestone[]; merchants: Merchant[] }) {
    setToken(data.token);
    setUser(data.user);
    setTransactions(data.transactions);
    setMilestones(data.milestones);
    setMerchants(data.merchants);
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  async function refreshUser() {
    if (!user || !token) return;
    try {
      const [userRes, txRes] = await Promise.all([
        getUser(user.id, token),
        getUserTransactions(user.id, token),
      ]);
      setUser(userRes.data);
      setTransactions(txRes.data);
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user: userRes.data, transactions: txRes.data }));
      }
    } catch { /* silent */ }
  }

  // Live balance polling — every 15 seconds
  useEffect(() => {
    if (!user || !token) return;
    const interval = setInterval(() => { refreshUser(); }, 15_000);
    return () => clearInterval(interval);
  }, [user?.id, token]);

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
    setTransactions([]);
    setMilestones([]);
    setMerchants([]);
    setActiveTab('cuenta');
  }

  if (!introComplete) return <FidelioIntro onComplete={() => setIntroComplete(true)} />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <TopBar user={user} onLogout={handleLogout} />
      <main className="px-4 pt-5 pb-28 flex flex-col gap-4">
        {activeTab === 'cuenta'    && <CuentaTab user={user} />}
        {activeTab === 'actividad' && <ActividadTab transactions={transactions} milestones={milestones} />}
        {activeTab === 'red'       && <RedTab merchants={merchants} user={user} token={token!} onSpend={refreshUser} />}
      </main>
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
