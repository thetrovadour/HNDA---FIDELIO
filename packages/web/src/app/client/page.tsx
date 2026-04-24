'use client';
import { FidelioIntro } from '@/components/FidelioIntro';
import { useState, useEffect, useRef } from 'react';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import {
  pilotLogin,
  spendCATR,
  getUser,
  getUserTransactions,
  updateUser,
  updateUserNotifications,
  setPassword,
  forgotPassword,
  resetPassword,
} from '@/lib/api';
import type { UserRecord, Transaction, Milestone, Merchant } from '@/lib/api';
import { t } from '@/lib/i18n';

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

import { IconUser, IconActivity, IconNetwork, IconCopy, IconSettings } from '../../components/icons';

// ─── Login screen ─────────────────────────────────────────────────────────────

interface LoginProps {
  onLogin: (data: { token: string; user: UserRecord; transactions: Transaction[]; milestones: Milestone[]; merchants: Merchant[] }) => void;
  inactivity?: boolean;
}

function LoginScreen({ onLogin, inactivity }: LoginProps) {
  const [screen, setScreen] = useState<'login' | 'forgot1' | 'forgot2' | 'done'>('login');
  const [name, setName] = useState('');
  const [credential, setCredential] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !credential) return;
    setLoading(true);
    setError('');
    try {
      const res = await pilotLogin({ full_name: name.trim(), credential });
      onLogin(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')
          ? `Error de red: ${msg}`
          : t('client.error_login')
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(resetEmail.trim());
      setScreen('forgot2');
    } catch {
      setError(t('common.error_request'));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot2(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError(t('client.error_passwords_mismatch')); return; }
    if (newPassword.length < 6) { setError(t('client.error_password_length')); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ email: resetEmail.trim(), code: resetCode.trim(), new_password: newPassword });
      setScreen('done');
    } catch {
      setError(t('client.error_invalid_code'));
    } finally {
      setLoading(false);
    }
  }

  const Brand = () => (
    <div className="mb-12 text-center">
      <p className="uppercase tracking-widest mb-1" style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.22em' }}>
        {t('client.brand_subtitle')}
      </p>
      <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', fontWeight: 200, letterSpacing: '0.18em', color: C.white, lineHeight: 1 }}>
        FIDELIO
      </h1>
      <div className="mx-auto mt-3" style={{ width: 32, height: 1, background: `rgba(201,168,76,0.4)` }} />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: C.bg, fontFamily: 'var(--font-body)' }}>
      <Brand />
      <div className="shimmer-border rounded-2xl p-px w-full max-w-sm">

        {/* ── Login ── */}
        {screen === 'login' && (
          <form onSubmit={handleLogin} className="rounded-2xl px-6 py-7 flex flex-col gap-5" style={{ background: C.surface }}>
            <Input label={t('client.label_full_name')} value={name} onChange={(e) => setName(e.target.value)} placeholder="María García" autoComplete="name" />
            <Input label={t('client.label_credential')} type="password" value={credential} onChange={(e) => setCredential(e.target.value)} placeholder="••••" autoComplete="current-password" />
            {inactivity && <StatusMsg type="error" msg={t('common.inactivity')} />}
            {error && <StatusMsg type="error" msg={error} />}
            <PrimaryBtn type="submit" disabled={loading || !credential || !name.trim()}>{loading ? t('common.verifying') : t('common.access')}</PrimaryBtn>
            <div className="flex justify-between items-center">
              <p style={{ color: C.slate, fontSize: '0.7rem', fontWeight: 300 }}>
                {t('client.merchant_link')}{' '}
                <a href="/merchant" style={{ color: C.slateHi, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('common.access_here')}</a>
              </p>
              <button type="button" onClick={() => { setScreen('forgot1'); setError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate, fontSize: '0.7rem', fontWeight: 300, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                {t('client.forgot_password')}
              </button>
            </div>
            <p className="text-center" style={{ color: C.slate, fontSize: '0.7rem', fontWeight: 300 }}>
              {t('client.no_account')}{' '}
              <a href="/register" style={{ color: C.slateHi, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('common.register')}</a>
            </p>
          </form>
        )}

        {/* ── Forgot step 1: enter email ── */}
        {screen === 'forgot1' && (
          <form onSubmit={handleForgot1} className="rounded-2xl px-6 py-7 flex flex-col gap-5" style={{ background: C.surface }}>
            <div>
              <p style={{ color: C.white, fontSize: '0.9rem', fontWeight: 300, marginBottom: '0.25rem' }}>{t('client.reset_title')}</p>
              <p style={{ color: C.slate, fontSize: '0.75rem' }}>{t('client.reset_desc')}</p>
            </div>
            <Input label={t('client.label_email')} type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="juan@email.com" autoComplete="email" />
            {error && <StatusMsg type="error" msg={error} />}
            <PrimaryBtn type="submit" disabled={loading || !resetEmail.trim()}>{loading ? t('common.sending') : t('common.continue')}</PrimaryBtn>
            <button type="button" onClick={() => { setScreen('login'); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate, fontSize: '0.7rem', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {t('client.back_to_login')}
            </button>
          </form>
        )}

        {/* ── Forgot step 2: enter code + new password ── */}
        {screen === 'forgot2' && (
          <form onSubmit={handleForgot2} className="rounded-2xl px-6 py-7 flex flex-col gap-5" style={{ background: C.surface }}>
            <div>
              <p style={{ color: C.white, fontSize: '0.9rem', fontWeight: 300, marginBottom: '0.25rem' }}>{t('client.enter_code_title')}</p>
              <p style={{ color: C.slate, fontSize: '0.75rem' }}>{t('client.enter_code_desc')}</p>
            </div>
            <Input label={t('client.label_code')} value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="123456" autoComplete="one-time-code" />
            <Input label={t('client.label_new_password')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            <Input label={t('client.label_confirm_password')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" />
            {error && <StatusMsg type="error" msg={error} />}
            <PrimaryBtn type="submit" disabled={loading || !resetCode || !newPassword}>{loading ? t('common.saving') : t('client.btn_reset_password')}</PrimaryBtn>
            <button type="button" onClick={() => { setScreen('login'); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate, fontSize: '0.7rem', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {t('client.back_to_login')}
            </button>
          </form>
        )}

        {/* ── Done ── */}
        {screen === 'done' && (
          <div className="rounded-2xl px-6 py-7 flex flex-col gap-5 text-center" style={{ background: C.surface }}>
            <p style={{ color: C.white, fontSize: '0.9rem', fontWeight: 300 }}>{t('client.password_reset_done')}</p>
            <p style={{ color: C.slate, fontSize: '0.75rem' }}>{t('client.password_reset_done_desc')}</p>
            <PrimaryBtn type="button" onClick={() => { setScreen('login'); setError(''); setResetCode(''); setNewPassword(''); setConfirmPassword(''); }}>
              {t('client.btn_login')}
            </PrimaryBtn>
          </div>
        )}

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
          {t('common.logout')}
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
        <span style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 300, color: C.slateHi }}>{t('client.pts')}</span>
      </div>
      <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300, marginTop: '0.4rem', letterSpacing: '0.08em' }}>
        {t('client.balance_label')}
      </p>
    </div>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────────────────────

type Tab = 'cuenta' | 'actividad' | 'red' | 'ajustes';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'cuenta',    label: t('tab.cuenta'),    icon: <IconUser /> },
    { id: 'actividad', label: t('tab.actividad'), icon: <IconActivity /> },
    { id: 'red',       label: t('tab.red'),       icon: <IconNetwork /> },
    { id: 'ajustes',   label: t('tab.ajustes'),   icon: <IconSettings /> },
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
      <Section title={t('client.section_wallet')}>
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>
                {t('client.label_address')}
              </p>
              <p className="text-sm font-mono font-semibold" style={{ color: C.white }}>
                {user.wallet_address
                  ? `${user.wallet_address.slice(0, 8)}…${user.wallet_address.slice(-6)}`
                  : t('client.no_wallet')}
              </p>
            </div>
            {user.wallet_address && (
              <button
                onClick={copyAddress}
                className="p-2 rounded-lg transition-all active:scale-95"
                style={{ background: C.surface, color: copied ? C.success : C.slate }}
                title={t('client.copy_address')}
              >
                <IconCopy />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>{t('common.network_label')}</p>
              <p className="text-sm font-semibold" style={{ color: C.slateHi }}>Base (L2)</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: C.slate }}>{t('common.token_label')}</p>
              <p className="text-sm font-semibold" style={{ color: C.gold }}>CATR</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Profile */}
      <Section title={t('client.section_profile')}>
        <div className="flex flex-col gap-2">
          {[
            { label: t('client.label_name'), value: user.full_name },
            { label: t('client.label_email_short'), value: user.email },
            { label: t('client.label_member_since'), value: memberSince },
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
  TX_5:           t('client.milestone_tx5'),
  TX_10:          t('client.milestone_tx10'),
  TX_25:          t('client.milestone_tx25'),
  CROSS_MERCHANT: t('client.milestone_cross'),
  REFERRAL:       t('client.milestone_referral'),
};

function ActividadTab({ transactions, milestones }: { transactions: Transaction[]; milestones: Milestone[] }) {
  return (
    <div className="flex flex-col gap-4">

      {/* Milestones */}
      {milestones.length > 0 && (
        <Section title={t('client.section_rewards')}>
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
      <Section title={t('client.section_tx_history')}>
        {transactions.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: C.slate }}>
            {t('client.no_transactions')}
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
                        {isMint ? t('client.tx_earned') : t('client.tx_sent')}
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

function AjustesTab({ user, token, onUpdate }: { user: UserRecord; token: string; onUpdate: (u: UserRecord) => void }) {
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [profileState, setProfileState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [profileMsg, setProfileMsg] = useState('');

  const [currentCred, setCurrentCred] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passState, setPassState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [passMsg, setPassMsg] = useState('');

  const [notifPoints, setNotifPoints] = useState(user.notify_points_received ?? true);
  const [notifMilestone, setNotifMilestone] = useState(user.notify_milestone_near ?? true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileState('loading');
    setProfileMsg('');
    try {
      const res = await updateUser(user.id, { full_name: fullName, email, phone: phone || undefined }, token);
      onUpdate({ ...user, ...res.data });
      setProfileState('success');
      setProfileMsg(t('client.profile_updated'));
    } catch (err) {
      setProfileState('error');
      setProfileMsg(err instanceof Error ? err.message : t('common.error_save'));
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassState('error');
      setPassMsg(t('client.error_passwords_mismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setPassState('error');
      setPassMsg(t('client.error_password_min'));
      return;
    }
    setPassState('loading');
    setPassMsg('');
    try {
      await setPassword({ user_id: user.id, current_credential: currentCred, new_password: newPassword });
      setPassState('success');
      setPassMsg(t('client.password_updated'));
      setCurrentCred(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPassState('error');
      setPassMsg(err instanceof Error ? err.message : t('client.error_change_password'));
    }
  }

  async function handleNotifToggle(field: 'points' | 'milestone', value: boolean) {
    const update = field === 'points'
      ? { notify_points_received: value }
      : { notify_milestone_near: value };

    if (field === 'points') setNotifPoints(value);
    else setNotifMilestone(value);

    setNotifSaving(true);
    setNotifMsg(null);
    try {
      await updateUserNotifications(user.id, update, token);
      onUpdate({ ...user, notify_points_received: field === 'points' ? value : notifPoints, notify_milestone_near: field === 'milestone' ? value : notifMilestone });
      setNotifMsg({ type: 'success', text: t('client.notifications_updated') });
    } catch {
      if (field === 'points') setNotifPoints(!value);
      else setNotifMilestone(!value);
      setNotifMsg({ type: 'error', text: t('common.error_save') });
    } finally {
      setNotifSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title={t('client.section_personal')}>
        <form onSubmit={handleProfileSave} className="flex flex-col gap-3">
          <Input label={t('client.label_full_name')} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label={t('client.label_email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label={t('client.label_phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+504 0000-0000" />
          {profileState === 'success' && <StatusMsg type="success" msg={profileMsg} />}
          {profileState === 'error'   && <StatusMsg type="error"   msg={profileMsg} />}
          <PrimaryBtn type="submit" disabled={profileState === 'loading'}>
            {profileState === 'loading' ? t('common.saving') : t('common.save')}
          </PrimaryBtn>
        </form>
      </Section>

      <Section>
        <a
          href="/apply"
          className="flex items-center justify-between w-full rounded-xl px-4 py-3 transition-all active:scale-95"
          style={{ background: C.goldDim, border: `1px solid rgba(201,168,76,0.35)`, textDecoration: 'none' }}
        >
          <span style={{ color: C.gold, fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.06em' }}>
            {t('client.apply_merchant')}
          </span>
          <span style={{ color: C.gold, fontSize: '0.85rem' }}>→</span>
        </a>
      </Section>

      <Section title={t('client.section_password')}>
        <form onSubmit={handlePasswordSave} className="flex flex-col gap-3">
          <Input label={t('client.label_current_credential')} type="password" value={currentCred} onChange={(e) => setCurrentCred(e.target.value)} placeholder="••••" autoComplete="current-password" />
          <Input label={t('client.label_new_password')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
          <Input label={t('client.label_confirm_password')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••" autoComplete="new-password" />
          {passState === 'success' && <StatusMsg type="success" msg={passMsg} />}
          {passState === 'error'   && <StatusMsg type="error"   msg={passMsg} />}
          <PrimaryBtn type="submit" disabled={passState === 'loading' || !currentCred || !newPassword || !confirmPassword}>
            {passState === 'loading' ? t('common.saving') : t('client.btn_change_password')}
          </PrimaryBtn>
        </form>
      </Section>

      <Section title={t('client.section_biometric')}>
        <div
          className="flex items-center gap-4 rounded-xl px-4 py-4"
          style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, opacity: 0.6 }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: C.white }}>{t('client.biometric_desc')}</p>
          </div>
          <span
            className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', color: C.slate, border: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}
          >
            {t('client.biometric_soon')}
          </span>
        </div>
      </Section>

      <Section title={t('client.section_notifications')}>
        <div className="flex flex-col gap-2">
          <NotifRow
            label={t('client.notif_points_received_label')}
            desc={t('client.notif_points_received_desc')}
            value={notifPoints}
            onChange={(v) => handleNotifToggle('points', v)}
            disabled={notifSaving}
          />
          <NotifRow
            label={t('client.notif_milestone_label')}
            desc={t('client.notif_milestone_desc')}
            value={notifMilestone}
            onChange={(v) => handleNotifToggle('milestone', v)}
            disabled={notifSaving}
          />
          {notifMsg && <StatusMsg type={notifMsg.type} msg={notifMsg.text} />}
        </div>
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
      setMsg(err instanceof Error ? err.message : t('client.error_transaction'));
    }
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => { setSelected(null); setState('idle'); setMsg(''); setAmount(''); }}
          style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
        >
          {t('client.back_to_network')}
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
                {t('client.new_transaction')}
              </button>
            </div>
          </Section>
        ) : (
          <div className="shimmer-border rounded-2xl p-px">
            <form onSubmit={handleSpend} className="rounded-2xl px-5 py-6 flex flex-col gap-5" style={{ background: C.surface }}>
              <div>
                <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {t('client.label_merchant')}
                </p>
                <p style={{ color: C.white, fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '1rem' }}>
                  {selected.name}
                </p>
                <p style={{ color: C.slate, fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300 }}>
                  {selected.category}
                </p>
              </div>

              <Input
                label={t('client.label_points_send')}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />

              {state === 'error' && <StatusMsg type="error" msg={msg} />}

              <PrimaryBtn type="submit" disabled={state === 'loading' || !amount}>
                {state === 'loading' ? t('common.processing') : t('client.btn_send_points')}
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
            {t('client.no_merchants')}
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
          {t('client.network_hint')}
          <br />
          {t('client.network_rate')}
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
  const [inactivity, setInactivity] = useState(false);

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

  function handleLogout(reason?: 'inactivity') {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
    setTransactions([]);
    setMilestones([]);
    setMerchants([]);
    setActiveTab('cuenta');
    setInactivity(reason === 'inactivity');
  }

  useInactivityLogout(5 * 60 * 1000, () => handleLogout('inactivity'), !!user);

  if (!introComplete) return <FidelioIntro onComplete={() => setIntroComplete(true)} />;
  if (!user) return <LoginScreen onLogin={(d) => { setInactivity(false); handleLogin(d); }} inactivity={inactivity} />;

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <TopBar user={user} onLogout={handleLogout} />
      <main className="px-4 pt-5 pb-28 flex flex-col gap-4">
        {activeTab === 'cuenta'    && <CuentaTab user={user} />}
        {activeTab === 'actividad' && <ActividadTab transactions={transactions} milestones={milestones} />}
        {activeTab === 'red'       && <RedTab merchants={merchants} user={user} token={token!} onSpend={refreshUser} />}
        {activeTab === 'ajustes'   && <AjustesTab user={user} token={token!} onUpdate={(u) => { setUser(u); const raw = localStorage.getItem(SESSION_KEY); if (raw) { const s = JSON.parse(raw); localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, user: u })); } }} />}
      </main>
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
