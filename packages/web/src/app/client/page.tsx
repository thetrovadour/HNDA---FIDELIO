'use client';

import { useState, useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  pilotLogin,
  getUser,
  getUserTransactions,
  getMerchants,
  getUserRewards,
  createRedemption,
  getRedemptions,
  approveRedemption,
  rejectRedemption,
  getRewardQueue,
  approveRewardPayout,
  spendCATR,
} from '@/lib/api';
import type { UserRecord, Transaction, Milestone, Merchant, RedemptionRequest, RewardPayout } from '@/lib/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         '#080C14',
  surface:    '#0F1623',
  surfaceHi:  '#162030',
  border:     '#1E2A40',
  borderHi:   '#2A3D5C',
  blue:       '#3B82F6',
  blueDim:    '#1D4ED8',
  gold:       '#C9A84C',
  goldLight:  '#FFE08A',
  white:      '#FFFFFF',
  slate:      '#94A3B8',
  success:    '#10B981',
  successBg:  'rgba(16,185,129,0.1)',
  error:      '#EF4444',
  errorBg:    'rgba(239,68,68,0.1)',
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path d="M3 9l1-4h16l1 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9" />
      <path d="M9 21V9m6 0v12" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path d="M12 3l8 4v5c0 5-3.5 9.7-8 11-4.5-1.3-8-6-8-11V7l8-4z" strokeLinejoin="round" />
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

// ─── Animated counter ─────────────────────────────────────────────────────────

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
      const current = start + (end - start) * eased;
      setDisplay(current.toFixed(2));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = value;
    }

    requestAnimationFrame(tick);
  }, [value]);

  return <>{display}</>;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 animate-fade-up ${className}`}
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {title && (
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: C.slate }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, disabled, type = 'button' }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40 transition-all active:scale-95"
      style={{ background: `linear-gradient(135deg, ${C.blue} 0%, ${C.blueDim} 100%)` }}
    >
      {children}
    </button>
  );
}

// ─── Ghost button ─────────────────────────────────────────────────────────────

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 rounded-xl font-semibold transition-all active:scale-95 text-sm"
      style={{ border: `1px solid ${C.border}`, color: C.slate, background: 'transparent' }}
    >
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-widest" style={{ color: C.slate }}>
        {label}
      </label>
      <input
        {...props}
        className="rounded-xl px-4 py-3 text-base focus:outline-none transition-all"
        style={{
          background: C.surfaceHi,
          border: `1px solid ${C.border}`,
          color: C.white,
        }}
      />
    </div>
  );
}

// ─── Merchant selector ────────────────────────────────────────────────────────

function MerchantSelector({ merchants, value, onChange }: {
  merchants: Merchant[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.slate }}>Establecimiento</p>
      <div className="flex flex-col gap-2">
        {merchants.map((m) => {
          const active = value === m.id;
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => onChange(m.id)}
              className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-95"
              style={{
                background: active ? 'rgba(59,130,246,0.12)' : C.surfaceHi,
                border: `1px solid ${active ? C.blue : C.border}`,
                color: active ? C.white : C.slate,
              }}
            >
              <span>{m.name}</span>
              <span className="text-xs" style={{ color: C.slate }}>{m.category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status message ───────────────────────────────────────────────────────────

function StatusMsg({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <p
      className="text-sm text-center rounded-xl py-2.5 px-3 animate-fade-up font-medium"
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

// ─── Login Screen ─────────────────────────────────────────────────────────────

interface LoginProps {
  onLogin: (res: { user: UserRecord; transactions: Transaction[]; milestones: Milestone[]; merchants: Merchant[] }) => void;
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
      setError(msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')
        ? `Error de red: ${msg}`
        : `No encontramos tu cuenta. (${msg})`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: C.bg }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }}
      />

      {/* Brand */}
      <div className="mb-10 text-center animate-fade-up relative">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 animate-pulse-glow"
          style={{ background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)` }}
        >
          <span className="text-3xl font-black text-black">⬡</span>
        </div>
        <h1 className="text-4xl font-black tracking-widest shimmer-text">FIDELIO</h1>
        <p className="text-sm mt-2 font-medium" style={{ color: C.slate }}>Tu red de lealtad</p>
      </div>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl px-6 py-7 flex flex-col gap-4 animate-fade-up"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        <Input
          label="Tu nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. María García"
          autoComplete="name"
        />
        <Input
          label="PIN (4 dígitos)"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
        />

        {error && <StatusMsg type="error" msg={error} />}

        <div className="mt-1">
          <PrimaryBtn type="submit" disabled={loading || pin.length !== 4 || !name.trim()}>
            {loading ? 'Verificando…' : 'Entrar'}
          </PrimaryBtn>
        </div>
      </form>
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

interface TopBarProps {
  user: UserRecord;
  onLogout: () => void;
}

function TopBar({ user, onLogout }: TopBarProps) {
  const firstName = user.full_name.split(' ')[0];

  return (
    <div
      className="px-5 pt-12 pb-6 relative overflow-hidden"
      style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
    >
      {/* Ambient glow behind balance */}
      <div
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-72 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)' }}
      />

      {/* Top row */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-base font-black tracking-widest shimmer-text">FIDELIO</span>
        <div className="flex items-center gap-2">
          <ConnectButton showBalance={false} chainStatus="none" />
          <button
            onClick={onLogout}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
            style={{ background: C.surfaceHi, color: C.slate, border: `1px solid ${C.border}` }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Greeting */}
      <p className="text-sm font-medium mb-1" style={{ color: C.slate }}>
        Hola, {firstName} 👋
      </p>

      {/* Balance */}
      <div className="flex items-baseline gap-2">
        <span className="font-black text-white animate-counter-up" style={{ fontSize: '3.5rem', lineHeight: 1 }}>
          <AnimatedBalance value={user.catr_balance} />
        </span>
        <span className="text-lg font-bold" style={{ color: C.blue }}>pts</span>
      </div>
      <p className="text-xs mt-1.5 font-medium" style={{ color: C.slate }}>Saldo disponible</p>
    </div>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────

type Tab = 'cuenta' | 'negocio' | 'admin';

interface TabBarProps {
  active: Tab;
  onChange: (t: Tab) => void;
}

function TabBar({ active, onChange }: TabBarProps) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'cuenta',  label: 'Mi Cuenta',  icon: <IconUser /> },
    { id: 'negocio', label: 'Mi Negocio', icon: <IconStore /> },
    { id: 'admin',   label: 'Admin',      icon: <IconShield /> },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex"
      style={{
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all relative"
            style={{ color: isActive ? C.blue : C.slate }}
          >
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: C.blue }}
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

// ─── Tab 1: Mi Cuenta ────────────────────────────────────────────────────────

interface CuentaTabProps {
  user: UserRecord;
  transactions: Transaction[];
  milestones: Milestone[];
  merchants: Merchant[];
}

function CuentaTab({ user, transactions, milestones, merchants }: CuentaTabProps) {
  const [copied, setCopied] = useState(false);
  const visitedMerchantIds = new Set(transactions.filter(tx => tx.merchant_id).map(tx => tx.merchant_id!));
  const visitedMerchants = merchants.filter(m => visitedMerchantIds.has(m.id));

  function copyAddress() {
    if (!user.wallet_address) return;
    navigator.clipboard.writeText(user.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Dirección</p>
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
              >
                <IconCopy />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Red</p>
              <p className="text-sm font-semibold" style={{ color: C.blue }}>Base (L2)</p>
            </div>
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Cuenta</p>
              <p className="text-sm font-semibold truncate" style={{ color: C.white }}>{user.email}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Donde acumulas */}
      <Section title="Dónde acumulas puntos">
        {visitedMerchants.length === 0 ? (
          <p className="text-sm py-2 text-center" style={{ color: C.slate }}>
            Aún no has acumulado puntos en ningún establecimiento.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visitedMerchants.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                    style={{ background: 'rgba(59,130,246,0.15)', color: C.blue }}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: C.white }}>{m.name}</span>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ background: C.surface, color: C.slate }}>
                  {m.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recompensas */}
      {milestones.length > 0 && (
        <Section title="Recompensas desbloqueadas">
          <div className="flex flex-col gap-2">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.2)` }}
              >
                <span className="text-xl">🏆</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: C.gold }}>{m.type.replace('_', ' ')}</p>
                  <p className="text-xs" style={{ color: C.slate }}>
                    {new Date(m.unlocked_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Historial */}
      <Section title="Historial de transacciones">
        {transactions.length === 0 ? (
          <p className="text-sm py-2 text-center" style={{ color: C.slate }}>Sin transacciones aún.</p>
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
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{
                      background: tx.type === 'MINT' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                      color: tx.type === 'MINT' ? C.success : C.blue,
                    }}
                  >
                    {tx.type === 'MINT' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.white }}>
                      {tx.type === 'MINT' ? 'Puntos acumulados' : 'Puntos enviados'}
                    </p>
                    <p className="text-xs" style={{ color: C.slate }}>
                      {new Date(tx.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: tx.type === 'MINT' ? C.success : C.blue }}
                >
                  {tx.type === 'MINT' ? '+' : '-'}{parseFloat(tx.amount_catr).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Tab 2: Mi Negocio ────────────────────────────────────────────────────────

function NegocioTab({ merchants }: { merchants: Merchant[] }) {
  const [selectedSale, setSelectedSale] = useState(merchants[0]?.id ?? '');
  const [saleAmount, setSaleAmount] = useState('');
  const [saleState, setSaleState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [saleMsg, setSaleMsg] = useState('');
  const [earnedPoints, setEarnedPoints] = useState('');

  const [selectedRedeem, setSelectedRedeem] = useState(merchants[0]?.id ?? '');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemState, setRedeemState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [redeemMsg, setRedeemMsg] = useState('');
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);

  async function handleSale(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSale || !saleAmount) return;
    setSaleState('loading');
    try {
      const points = parseFloat(saleAmount).toFixed(2);
      setEarnedPoints(points);
      setSaleState('success');
      setSaleMsg(`¡Venta registrada! El cliente acumuló ${points} puntos.`);
      setSaleAmount('');
    } catch (err) {
      setSaleState('error');
      setSaleMsg(err instanceof Error ? err.message : 'Error al registrar venta.');
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRedeem || !redeemAmount) return;
    setRedeemState('loading');
    try {
      await createRedemption({ merchant_id: selectedRedeem, amount_catr: redeemAmount });
      setRedeemState('success');
      setRedeemMsg('Solicitud de canje enviada correctamente.');
      setRedeemAmount('');
      const res = await getRedemptions('');
      setRedemptions(res.data);
    } catch (err) {
      setRedeemState('error');
      setRedeemMsg(err instanceof Error ? err.message : 'Error al enviar solicitud.');
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Nueva Venta */}
      <Section title="Nueva Venta">
        {saleState === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-4 animate-fade-up">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{ background: C.successBg, color: C.success, border: `1px solid rgba(16,185,129,0.3)` }}
            >
              ✓
            </div>
            <p className="text-base font-bold text-center" style={{ color: C.success }}>{saleMsg}</p>
            <div
              className="w-full rounded-xl px-4 py-3 text-center"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.slate }}>
                Dile al cliente
              </p>
              <p className="text-sm font-semibold" style={{ color: C.white }}>
                Acumulaste <span style={{ color: C.blue }}>{earnedPoints} puntos</span> en este establecimiento.
              </p>
            </div>
            <GhostBtn onClick={() => setSaleState('idle')}>Registrar otra venta</GhostBtn>
          </div>
        ) : (
          <form onSubmit={handleSale} className="flex flex-col gap-4">
            <MerchantSelector merchants={merchants} value={selectedSale} onChange={setSelectedSale} />
            <Input
              label="Puntos a acumular"
              type="number"
              min="0.01"
              step="0.01"
              value={saleAmount}
              onChange={(e) => setSaleAmount(e.target.value)}
              placeholder="Ej. 50"
            />
            {saleState === 'error' && <StatusMsg type="error" msg={saleMsg} />}
            <PrimaryBtn type="submit" disabled={saleState === 'loading' || !saleAmount || !selectedSale}>
              {saleState === 'loading' ? 'Registrando…' : 'Registrar Venta'}
            </PrimaryBtn>
          </form>
        )}
      </Section>

      {/* Canjear */}
      <Section title="Canjear Puntos">
        <form onSubmit={handleRedeem} className="flex flex-col gap-4">
          <MerchantSelector merchants={merchants} value={selectedRedeem} onChange={setSelectedRedeem} />
          <Input
            label="Puntos a canjear"
            type="number"
            min="0.01"
            step="0.01"
            value={redeemAmount}
            onChange={(e) => setRedeemAmount(e.target.value)}
            placeholder="Ej. 100"
          />
          {redeemState === 'success' && <StatusMsg type="success" msg={redeemMsg} />}
          {redeemState === 'error' && <StatusMsg type="error" msg={redeemMsg} />}
          <PrimaryBtn type="submit" disabled={redeemState === 'loading' || !redeemAmount || !selectedRedeem}>
            {redeemState === 'loading' ? 'Enviando…' : 'Solicitar Canje'}
          </PrimaryBtn>
        </form>

        {redemptions.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.slate }}>
              Solicitudes recientes
            </p>
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
              >
                <span className="text-sm font-semibold" style={{ color: C.white }}>
                  {parseFloat(r.amount_catr).toFixed(2)} pts
                </span>
                <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ background: C.surface, color: C.slate }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Tab 3: Admin ─────────────────────────────────────────────────────────────

const ADMIN_PIN   = process.env.NEXT_PUBLIC_ADMIN_PIN   ?? '';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? '';

function AdminTab() {
  const [pin, setPin] = useState('');
  const [token, setToken] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [payouts, setPayouts] = useState<RewardPayout[]>([]);

  const [mintUserId, setMintUserId] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [mintState, setMintState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mintMsg, setMintMsg] = useState('');

  async function loadAdmin() {
    if (pin !== ADMIN_PIN) { setError('PIN incorrecto.'); return; }
    const jwt = ADMIN_TOKEN;
    setLoading(true);
    setError('');
    try {
      const [rRes, pRes] = await Promise.all([
        getRedemptions(jwt, { status: 'PENDING_BURN' }),
        getRewardQueue(jwt),
      ]);
      setToken(jwt);
      setRedemptions(rRes.data);
      setPayouts(pRes.data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos de admin.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveRedemption(id: string) {
    await approveRedemption(id, token);
    const res = await getRedemptions(token, { status: 'PENDING_BURN' });
    setRedemptions(res.data);
  }

  async function handleRejectRedemption(id: string) {
    await rejectRedemption(id, token);
    const res = await getRedemptions(token, { status: 'PENDING_BURN' });
    setRedemptions(res.data);
  }

  async function handleApprovePayout(id: string) {
    await approveRewardPayout(id, token);
    const res = await getRewardQueue(token);
    setPayouts(res.data);
  }

  async function handleManualMint(e: React.FormEvent) {
    e.preventDefault();
    if (!mintUserId || !mintAmount) return;
    setMintState('loading');
    try {
      await spendCATR({ user_id: mintUserId, merchant_id: '', amount_catr: mintAmount });
      setMintState('success');
      setMintMsg(`${mintAmount} puntos acreditados correctamente.`);
      setMintUserId('');
      setMintAmount('');
    } catch (err) {
      setMintState('error');
      setMintMsg(err instanceof Error ? err.message : 'Error al ejecutar mint.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!loaded ? (
        <Section title="Acceso Admin">
          <div className="flex flex-col gap-4">
            <Input
              label="PIN de administrador"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
            />
            {error && <StatusMsg type="error" msg={error} />}
            <PrimaryBtn onClick={loadAdmin} disabled={loading}>
              {loading ? 'Verificando…' : 'Entrar como Admin'}
            </PrimaryBtn>
          </div>
        </Section>
      ) : (
        <>
          {/* Manual Mint */}
          <Section title="Acreditar Puntos (Piloto)">
            <form onSubmit={handleManualMint} className="flex flex-col gap-4">
              <Input
                label="User ID del cliente"
                value={mintUserId}
                onChange={(e) => setMintUserId(e.target.value)}
                placeholder="UUID del usuario"
              />
              <Input
                label="Puntos a acreditar"
                type="number"
                min="0.01"
                step="0.01"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="Ej. 100"
              />
              {mintState === 'success' && <StatusMsg type="success" msg={mintMsg} />}
              {mintState === 'error' && <StatusMsg type="error" msg={mintMsg} />}
              <PrimaryBtn type="submit" disabled={mintState === 'loading' || !mintUserId || !mintAmount}>
                {mintState === 'loading' ? 'Procesando…' : 'Acreditar Puntos'}
              </PrimaryBtn>
            </form>
          </Section>

          {/* Canjes */}
          <Section title="Canjes pendientes">
            {redemptions.length === 0 ? (
              <p className="text-sm text-center py-2" style={{ color: C.slate }}>Sin canjes pendientes.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {redemptions.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl px-4 py-3 flex flex-col gap-3"
                    style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: C.white }}>
                        {parseFloat(r.amount_catr).toFixed(2)} pts
                      </span>
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: C.surface, color: C.slate }}>
                        {r.tier}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveRedemption(r.id)}
                        className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                        style={{ background: 'rgba(16,185,129,0.2)', color: C.success, border: `1px solid rgba(16,185,129,0.3)` }}
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRejectRedemption(r.id)}
                        className="flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                        style={{ background: 'rgba(239,68,68,0.12)', color: C.error, border: `1px solid rgba(239,68,68,0.3)` }}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Recompensas */}
          <Section title="Cola de recompensas">
            {payouts.length === 0 ? (
              <p className="text-sm text-center py-2" style={{ color: C.slate }}>Sin pagos pendientes.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {payouts.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl px-4 py-3 flex flex-col gap-3"
                    style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: C.white }}>
                        {parseFloat(p.amount_catr).toFixed(2)} pts
                      </span>
                      <span className="text-xs" style={{ color: C.slate }}>{p.status}</span>
                    </div>
                    <PrimaryBtn onClick={() => handleApprovePayout(p.id)}>
                      Autorizar pago
                    </PrimaryBtn>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function PilotPage() {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('cuenta');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  async function handleLogin(res: { user: UserRecord; transactions: Transaction[]; milestones: Milestone[]; merchants: Merchant[] }) {
    setTransactions(res.transactions);
    setMilestones(res.milestones);
    setMerchants(res.merchants);
    setUser(res.user);
  }

  async function refreshUser() {
    if (!user) return;
    const [userRes, txRes] = await Promise.all([
      getUser(user.id),
      getUserTransactions(user.id),
    ]);
    setUser(userRes.data);
    setTransactions(txRes.data);
  }

  function handleLogout() {
    setUser(null);
    setTransactions([]);
    setMilestones([]);
    setMerchants([]);
    setActiveTab('cuenta');
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <TopBar user={user} onLogout={handleLogout} />
      <main className="px-4 pt-5 pb-28 flex flex-col gap-4">
        {activeTab === 'cuenta'  && <CuentaTab user={user} transactions={transactions} milestones={milestones} merchants={merchants} />}
        {activeTab === 'negocio' && <NegocioTab merchants={merchants} />}
        {activeTab === 'admin'   && <AdminTab />}
      </main>
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
