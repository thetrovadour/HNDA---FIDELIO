'use client';

import { FidelioIntro } from '@/components/FidelioIntro';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import {
  merchantLogin,
  getMerchantPublic,
  getMerchantBalance,
  getMerchantTransactions,
  getMerchantRedemptions,
  createMerchantRedemption,
  getGcaBalance,
  redeemGca,
  updateMerchantProfile,
  updateMerchantNotifications,
  updateMerchantPayout,
  changeMerchantPassword,
  logout,
  forgotPassword,
  resetPassword,
  AuthError,
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

import { IconStore, IconSwap, IconGem, IconList, IconCopy, IconSettings } from '../../components/icons';

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, inactivity }: { onLogin: (merchant: Merchant) => void; inactivity?: boolean }) {
  const [username, setUsername] = useState('');
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // forgot-password state
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [fpEmail, setFpEmail] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpMsg, setFpMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !credential.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await merchantLogin({ username: username.trim(), credential: credential.trim() });
      onLogin(res.data.merchant);
    } catch {
      setError(t('merchant.error_not_found'));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFpMsg('');
    try {
      await forgotPassword(fpEmail.trim());
      setFpMsg('Si ese correo existe, recibirás un código. Revisa tu bandeja.');
      setMode('reset');
    } catch {
      setFpMsg('Error al enviar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (fpNewPass.length < 6) { setFpMsg('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    setFpMsg('');
    try {
      await resetPassword({ email: fpEmail.trim(), code: fpCode.trim(), new_password: fpNewPass });
      setFpMsg('');
      setMode('login');
      setError('Contraseña actualizada. Inicia sesión.');
    } catch {
      setFpMsg('Código inválido o expirado. Verifica e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const header = (
    <div className="mb-12 text-center">
      <p className="uppercase tracking-widest mb-1" style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.22em' }}>
        Honduras Nativa Digital Answers
      </p>
      <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', fontWeight: 200, letterSpacing: '0.18em', color: C.white, lineHeight: 1 }}>
        FIDELIO
      </h1>
      <div className="mx-auto mt-3" style={{ width: 32, height: 1, background: 'rgba(201,168,76,0.4)' }} />
      <p className="mt-3 uppercase tracking-widest" style={{ color: C.slate, fontSize: '0.6rem', fontWeight: 300, letterSpacing: '0.18em' }}>
        {t('merchant.portal_label')}
      </p>
    </div>
  );

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: C.bg, fontFamily: 'var(--font-body)' }}>
        {header}
        <div className="shimmer-border rounded-2xl p-px w-full max-w-sm">
          <form onSubmit={handleForgot} className="rounded-2xl px-6 py-7 flex flex-col gap-5" style={{ background: C.surface }}>
            <p style={{ color: C.white, fontSize: '0.85rem', fontWeight: 400, textAlign: 'center' }}>Recuperar contraseña</p>
            <p style={{ color: C.slate, fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.5 }}>
              Ingresa el correo con el que te registraste. Te enviaremos un código de recuperación.
            </p>
            <Input label="Correo electrónico" type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" />
            {fpMsg && <StatusMsg type="error" msg={fpMsg} />}
            <PrimaryBtn type="submit" disabled={loading || !fpEmail.trim()}>{loading ? 'Enviando...' : 'Enviar código'}</PrimaryBtn>
            <button type="button" onClick={() => { setMode('login'); setFpMsg(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate, fontSize: '0.7rem', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Volver al inicio de sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: C.bg, fontFamily: 'var(--font-body)' }}>
        {header}
        <div className="shimmer-border rounded-2xl p-px w-full max-w-sm">
          <form onSubmit={handleReset} className="rounded-2xl px-6 py-7 flex flex-col gap-5" style={{ background: C.surface }}>
            <p style={{ color: C.white, fontSize: '0.85rem', fontWeight: 400, textAlign: 'center' }}>Nueva contraseña</p>
            {fpMsg && <StatusMsg type={fpMsg.includes('inválido') ? 'error' : 'success'} msg={fpMsg} />}
            <Input label="Código de recuperación" value={fpCode} onChange={(e) => setFpCode(e.target.value)} placeholder="6 dígitos" autoComplete="one-time-code" />
            <Input label="Nueva contraseña" type="password" value={fpNewPass} onChange={(e) => setFpNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
            <PrimaryBtn type="submit" disabled={loading || !fpCode.trim() || !fpNewPass}>{loading ? 'Guardando...' : 'Cambiar contraseña'}</PrimaryBtn>
            <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate, fontSize: '0.7rem', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Reenviar código
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: C.bg, fontFamily: 'var(--font-body)' }}>
      {header}
      <div className="shimmer-border rounded-2xl p-px w-full max-w-sm">
        <form onSubmit={handleSubmit} className="rounded-2xl px-6 py-7 flex flex-col gap-5" style={{ background: C.surface }}>
          <Input label="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu_usuario" autoComplete="username" />
          <Input label="PIN o contraseña" type="password" value={credential} onChange={(e) => setCredential(e.target.value)} placeholder="PIN o contraseña" autoComplete="current-password" />

          {inactivity && <StatusMsg type="error" msg="Sesión cerrada por inactividad." />}
          {error && <StatusMsg type={error.includes('actualizada') ? 'success' : 'error'} msg={error} />}

          <PrimaryBtn type="submit" disabled={loading || !username.trim() || !credential.trim()}>
            {loading ? t('common.verifying') : t('common.access')}
          </PrimaryBtn>

          <button type="button" onClick={() => { setMode('forgot'); setError(''); setFpMsg(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate, fontSize: '0.7rem', textDecoration: 'underline', textUnderlineOffset: '3px', textAlign: 'center' }}>
            ¿Olvidaste tu contraseña?
          </button>

          <p className="text-center" style={{ color: C.slate, fontSize: '0.7rem', fontWeight: 300, letterSpacing: '0.06em' }}>
            {t('merchant.client_link')}{' '}
            <a href="/client" style={{ color: C.slateHi, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('common.access_here')}</a>
          </p>
          <p className="text-center" style={{ color: C.slate, fontSize: '0.7rem', fontWeight: 300, letterSpacing: '0.06em' }}>
            {t('client.no_account')}{' '}
            <a href="/register" style={{ color: C.slateHi, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('common.register')}</a>
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
        <Link href="/" className="text-base font-black tracking-widest" style={{ color: C.gold, textDecoration: 'none' }}>FIDELIO</Link>
        <button
          onClick={onLogout}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
          style={{ background: C.surfaceHi, color: C.slate, border: `1px solid ${C.border}` }}
        >
          {t('common.logout')}
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
            background: merchant.merchant_status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : merchant.merchant_status === 'DEACTIVATED' ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)',
            color: merchantStatusColor(merchant),
            border: `1px solid ${merchant.merchant_status === 'ACTIVE' ? 'rgba(16,185,129,0.3)' : merchant.merchant_status === 'DEACTIVATED' ? 'rgba(239,68,68,0.3)' : 'rgba(100,116,139,0.3)'}`,
          }}
        >
          {merchantStatusLabel(merchant)}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span style={{ fontSize: '3.5rem', lineHeight: 1, color: C.white, fontFamily: 'var(--font-body)', fontWeight: 200 }}>
          {balance ? parseFloat(balance.catr_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
        </span>
        <span style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 300, color: C.slateHi }}>pts</span>
      </div>
      <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300, marginTop: '0.4rem', letterSpacing: '0.08em' }}>
        {t('merchant.balance_label')}
      </p>
    </div>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────────────────────

type Tab = 'negocio' | 'canjear' | 'gca' | 'movimientos' | 'ajustes';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'negocio',     label: t('tab.negocio'),     icon: <IconStore /> },
    { id: 'canjear',     label: t('tab.canjear'),     icon: <IconSwap /> },
    { id: 'gca',         label: t('tab.gca'),         icon: <IconGem /> },
    { id: 'movimientos', label: t('tab.movimientos'), icon: <IconList /> },
    { id: 'ajustes',     label: t('tab.ajustes'),     icon: <IconSettings /> },
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

// ─── Merchant status helpers ──────────────────────────────────────────────────

function merchantStatusLabel(merchant: Merchant): string {
  if (merchant.merchant_status === 'DEACTIVATED') return 'Desactivado';
  if (merchant.merchant_status === 'ACTIVE' && merchant.reactivated_at) return 'Reactivado';
  if (merchant.merchant_status === 'ACTIVE') return 'Activado';
  return 'No activado';
}

function merchantStatusColor(merchant: Merchant): string {
  if (merchant.merchant_status === 'DEACTIVATED') return C.error;
  if (merchant.merchant_status === 'ACTIVE') return C.success;
  return C.slate;
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
      <Section title={t('merchant.section_wallet')}>
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>
                {t('merchant.label_address')}
              </p>
              <p className="text-sm font-mono font-semibold" style={{ color: C.white }}>
                {`${merchant.wallet_address.slice(0, 8)}…${merchant.wallet_address.slice(-6)}`}
              </p>
            </div>
            <button
              onClick={copyAddress}
              className="p-2 rounded-lg transition-all active:scale-95"
              style={{ background: C.surface, color: copied ? C.success : C.slate }}
              title={t('client.copy_address')}
            >
              <IconCopy />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>{t('merchant.label_network')}</p>
              <p className="text-sm font-semibold" style={{ color: C.slateHi }}>Base (L2)</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>{t('merchant.label_token')}</p>
              <p className="text-sm font-semibold" style={{ color: C.gold }}>CATR + GCA</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title={t('merchant.section_info')}>
        <div className="flex flex-col gap-2">
          <InfoRow label={t('merchant.label_name')}    value={merchant.name} />
          <InfoRow label={t('merchant.label_category')} value={merchant.category} />
          <InfoRow label={t('merchant.label_contact')} value={merchant.contact_email} />
          <InfoRow label={t('merchant.label_status')}  value={
            <span style={{ color: merchantStatusColor(merchant) }}>
              {merchantStatusLabel(merchant)}
            </span>
          } />
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Canjear ─────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  AUTO:           t('merchant.tier_auto'),
  ADMIN_APPROVAL: t('merchant.tier_admin'),
  VAULT_OP:       t('merchant.tier_vault'),
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_BURN:   t('merchant.status_pending'),
  BURN_SUBMITTED: t('merchant.status_processing'),
  BURNED:         t('merchant.status_burned'),
  LEMPIRAS_SENT:  t('merchant.status_completed'),
  FAILED:         t('merchant.status_failed'),
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
      setMsg(err instanceof Error ? err.message : t('common.error_request'));
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
            label={t('merchant.label_amount_catr')}
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
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.slate }}>{t('merchant.label_type')}</span>
              <span className="text-xs font-semibold ml-auto" style={{ color: C.slateHi }}>
                {TIER_LABELS[tier]}
              </span>
            </div>
          )}

          {state === 'success' && <StatusMsg type="success" msg={msg} />}
          {state === 'error'   && <StatusMsg type="error"   msg={msg} />}

          <PrimaryBtn type="submit" disabled={state === 'loading' || !amount}>
            {state === 'loading' ? t('common.sending') : t('merchant.btn_request')}
          </PrimaryBtn>
        </form>
      </div>

      <Section title={t('merchant.section_history')}>
        {loadingHistory ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>{t('common.loading_short')}</p>
        ) : redemptions.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>{t('merchant.no_redemptions')}</p>
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
                    {parseFloat(r.amount_catr).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CATR
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
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.slate }}>{t('merchant.section_tiers')}</p>
        <div className="flex flex-col gap-1.5">
          {[
            { range: '< 50 CATR',      tier: t('merchant.tier_auto') },
            { range: '50 – 500 CATR',  tier: t('merchant.tier_admin') },
            { range: '> 500 CATR',     tier: t('merchant.tier_vault') },
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
                <p className="text-lg font-semibold" style={{ color: C.gold }}>{parseFloat(gca.gca_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Valor est. HNL</p>
                <p className="text-lg font-semibold" style={{ color: C.white }}>L. {parseFloat(gca.estimated_hnl_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Hitos</p>
                <p className="text-lg font-semibold" style={{ color: C.white }}>{gca.milestones_claimed} / 10</p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>Precio piso</p>
                <p className="text-lg font-semibold" style={{ color: C.white }}>L. {parseFloat(gca.price_floor_hnl).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
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
      <Section title={t('merchant.section_movements')}>
        {loading ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>{t('common.loading_short')}</p>
        ) : error ? (
          <StatusMsg type="error" msg={error} />
        ) : transactions.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>{t('merchant.no_movements')}</p>
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
                        ? tx.source === 'ADMIN' ? t('merchant.tx_admin') : `Acreditación (${tx.source ?? 'sistema'})`
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

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      className="relative rounded-full flex-shrink-0 transition-all"
      style={{
        width: 44, height: 24,
        background: value ? C.gold : 'rgba(255,255,255,0.1)',
        border: `1px solid ${value ? 'rgba(201,168,76,0.5)' : C.border}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="absolute top-0.5 rounded-full transition-all"
        style={{ width: 18, height: 18, background: C.white, left: value ? 22 : 3 }}
      />
    </button>
  );
}

function NotifRow({ label, desc, value, onChange, disabled }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: C.white }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: C.slate }}>{desc}</p>
      </div>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── Tab: Ajustes ─────────────────────────────────────────────────────────────

function AjustesTab({ merchant, onUpdate }: { merchant: Merchant; onUpdate: (m: Merchant) => void }) {
  const [name, setName] = useState(merchant.name);
  const [category, setCategory] = useState(merchant.category);
  const [contactEmail, setContactEmail] = useState(merchant.contact_email);
  const [profileState, setProfileState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [profileMsg, setProfileMsg] = useState('');

  const [notifRedemption, setNotifRedemption] = useState(merchant.notify_redemption_update ?? true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [payoutBank, setPayoutBank] = useState(merchant.payout_bank ?? '');
  const [payoutAccount, setPayoutAccount] = useState(merchant.payout_account_number ?? '');
  const [payoutType, setPayoutType] = useState<'SAVINGS' | 'CHECKING'>(merchant.payout_account_type ?? 'SAVINGS');
  const [payoutCrypto, setPayoutCrypto] = useState(merchant.payout_crypto_address ?? '');
  const [payoutState, setPayoutState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [payoutMsg, setPayoutMsg] = useState('');

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdState, setPwdState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pwdMsg, setPwdMsg] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileState('loading');
    setProfileMsg('');
    try {
      const res = await updateMerchantProfile(merchant.id, { name, category, contact_email: contactEmail });
      onUpdate(res.data);
      setProfileState('success');
      setProfileMsg(t('merchant.profile_updated'));
    } catch (err) {
      setProfileState('error');
      setProfileMsg(err instanceof Error ? err.message : t('common.error_save'));
    }
  }

  async function handleNotifToggle(value: boolean) {
    setNotifRedemption(value);
    setNotifSaving(true);
    setNotifMsg(null);
    try {
      await updateMerchantNotifications(merchant.id, { notify_redemption_update: value });
      onUpdate({ ...merchant, notify_redemption_update: value });
      setNotifMsg({ type: 'success', text: t('merchant.notifications_updated') });
    } catch {
      setNotifRedemption(!value);
      setNotifMsg({ type: 'error', text: t('common.error_save') });
    } finally {
      setNotifSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdState('error');
      setPwdMsg('Las contraseñas nuevas no coinciden.');
      return;
    }
    setPwdState('loading');
    setPwdMsg('');
    try {
      await changeMerchantPassword(merchant.id, { current_password: currentPwd, new_password: newPwd });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdState('success');
      setPwdMsg('Contraseña actualizada correctamente.');
    } catch (err) {
      setPwdState('error');
      setPwdMsg(err instanceof Error ? err.message : 'Error al cambiar la contraseña.');
    }
  }

  async function handlePayoutSave(e: React.FormEvent) {
    e.preventDefault();
    setPayoutState('loading');
    setPayoutMsg('');
    try {
      const res = await updateMerchantPayout(merchant.id, {
        payout_bank: payoutBank || undefined,
        payout_account_number: payoutAccount || undefined,
        payout_account_type: payoutType,
        payout_crypto_address: payoutCrypto || undefined,
      });
      onUpdate(res.data);
      setPayoutState('success');
      setPayoutMsg(t('merchant.payout_updated'));
    } catch (err) {
      setPayoutState('error');
      setPayoutMsg(err instanceof Error ? err.message : t('common.error_save'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title={t('merchant.section_business')}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input label={t('merchant.label_business_name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label={t('merchant.label_category')} value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input label={t('merchant.label_contact_email')} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          {profileState === 'success' && <StatusMsg type="success" msg={profileMsg} />}
          {profileState === 'error'   && <StatusMsg type="error"   msg={profileMsg} />}
          <PrimaryBtn type="submit" disabled={profileState === 'loading'}>
            {profileState === 'loading' ? t('common.saving') : t('common.save')}
          </PrimaryBtn>
        </form>
      </Section>

      <Section title={t('merchant.section_biometric')}>
        <div
          className="flex items-center gap-4 rounded-xl px-4 py-4"
          style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, opacity: 0.6 }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: C.white }}>
              Activa tu huella o reconocimiento facial para acceder sin contraseña.
            </p>
          </div>
          <span
            className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', color: C.slate, border: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}
          >
            Próximamente
          </span>
        </div>
      </Section>

      <Section title={t('merchant.section_notifications')}>
        <div className="flex flex-col gap-2">
          <NotifRow
            label={t('merchant.notif_redemption_label')}
            desc={t('merchant.notif_redemption_desc')}
            value={notifRedemption}
            onChange={handleNotifToggle}
            disabled={notifSaving}
          />
          {notifMsg && <StatusMsg type={notifMsg.type} msg={notifMsg.text} />}
        </div>
      </Section>

      <Section title={t('merchant.section_payout')}>
        <form onSubmit={handlePayoutSave} className="flex flex-col gap-3">
          <p className="text-xs mb-1" style={{ color: C.slate }}>{t('merchant.payout_desc')}</p>
          <Input label={t('merchant.label_payout_bank')} value={payoutBank} onChange={(e) => setPayoutBank(e.target.value)} placeholder="Banco Atlántida" />
          <Input label={t('merchant.label_payout_account')} value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)} placeholder="0000000000" />

          <div className="flex flex-col gap-1.5">
            <label className="uppercase tracking-widest" style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300 }}>
              {t('merchant.label_payout_type')}
            </label>
            <div className="flex gap-3">
              {(['SAVINGS', 'CHECKING'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPayoutType(type)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: payoutType === type ? C.goldDim : C.surfaceHi,
                    border: `1px solid ${payoutType === type ? 'rgba(201,168,76,0.35)' : C.border}`,
                    color: payoutType === type ? C.gold : C.slateHi,
                  }}
                >
                  {type === 'SAVINGS' ? t('merchant.payout_savings') : t('merchant.payout_checking')}
                </button>
              ))}
            </div>
          </div>

          <Input label={t('merchant.label_crypto_address')} value={payoutCrypto} onChange={(e) => setPayoutCrypto(e.target.value)} placeholder="0x..." />

          {payoutState === 'success' && <StatusMsg type="success" msg={payoutMsg} />}
          {payoutState === 'error'   && <StatusMsg type="error"   msg={payoutMsg} />}
          <PrimaryBtn type="submit" disabled={payoutState === 'loading'}>
            {payoutState === 'loading' ? t('common.saving') : t('common.save')}
          </PrimaryBtn>
        </form>
      </Section>

      <Section title="Cambiar Contraseña">
        <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
          <Input label="Contraseña actual" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required />
          <Input label="Nueva contraseña" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
          <Input label="Confirmar nueva contraseña" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
          {pwdState === 'success' && <StatusMsg type="success" msg={pwdMsg} />}
          {pwdState === 'error'   && <StatusMsg type="error"   msg={pwdMsg} />}
          <PrimaryBtn type="submit" disabled={pwdState === 'loading'}>
            {pwdState === 'loading' ? 'Cambiando...' : 'Cambiar contraseña'}
          </PrimaryBtn>
        </form>
      </Section>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'fidelio_merchant_session';

export default function MerchantPage() {
  const router = useRouter();
  const [introComplete, setIntroComplete] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [balance, setBalance] = useState<MerchantBalance | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('negocio');
  const [inactivity, setInactivity] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const session = JSON.parse(raw);
      if (!session.merchant) { localStorage.removeItem(SESSION_KEY); return; }
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
      .catch((err) => { if (err instanceof AuthError) handleLogout(); });

    const interval = setInterval(() => {
      getMerchantBalance(merchant.id)
        .then((r) => setBalance(r.data))
        .catch((err) => { if (err instanceof AuthError) handleLogout(); });
      getMerchantPublic(merchant.id)
        .then((r) => {
          if (r.data.merchant_status !== merchant.merchant_status) {
            const updated = { ...merchant, merchant_status: r.data.merchant_status };
            setMerchant(updated);
            const raw = localStorage.getItem(SESSION_KEY);
            if (raw) {
              const s = JSON.parse(raw);
              localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, merchant: updated }));
            }
          }
        })
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(interval);
  }, [merchant?.id]);

  function handleLogin(m: Merchant) {
    setMerchant(m);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ merchant: m }));
  }

  function handleLogout(reason?: 'inactivity') {
    logout().catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    router.push('/fidelio');
    setMerchant(null);
    setBalance(null);
    setActiveTab('negocio');
    setInactivity(reason === 'inactivity');
  }

  useInactivityLogout(15 * 60 * 1000, () => handleLogout('inactivity'), !!merchant);

  if (!introComplete) return <FidelioIntro onComplete={() => setIntroComplete(true)} />;
  if (!merchant)      return <LoginScreen onLogin={(m) => { setInactivity(false); handleLogin(m); }} inactivity={inactivity} />;

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <TopBar merchant={merchant} balance={balance} onLogout={handleLogout} />
      <main className="px-4 pt-5 pb-28 flex flex-col gap-4">
        {activeTab === 'negocio'     && <NegocioTab     merchant={merchant} />}
        {activeTab === 'canjear'     && <CanjearTab     merchant={merchant} />}
        {activeTab === 'gca'         && <GcaTab         merchant={merchant} />}
        {activeTab === 'movimientos' && <MovimientosTab merchant={merchant} />}
        {activeTab === 'ajustes'     && <AjustesTab     merchant={merchant} onUpdate={(m) => {
          setMerchant(m);
          const raw = localStorage.getItem(SESSION_KEY);
          if (raw) {
            const s = JSON.parse(raw);
            localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, merchant: m }));
          }
        }} />}
      </main>
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
