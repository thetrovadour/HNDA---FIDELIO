'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { useLang } from '@/hooks/useLang';
import {
  getMerchants,
  getAdminUsers,
  getAdminApplications,
  approveApplication,
  rejectApplication,
  type Merchant,
  type AdminUser,
  type MerchantApplication,
  type ApprovedMerchantCredentials,
} from '@/lib/api';
import MerchantList from '@/components/MerchantList';
import RedemptionQueue from '@/components/RedemptionQueue';
import RewardPayoutQueue from '@/components/RewardPayoutQueue';
import AwardPoints from '@/components/AwardPoints';
import RunwayWidget from '@/components/RunwayWidget';
import GcaAdminPanel from '@/components/GcaAdminPanel';

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
  danger:    '#EF4444',
  dangerBg:  'rgba(239,68,68,0.08)',
  muted:     'rgba(255,255,255,0.04)',
};

const font = { fontFamily: 'var(--font-body)' };

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'merchants' | 'redemptions' | 'payouts' | 'mint' | 'health' | 'clients' | 'gca' | 'applications';

const TAB_IDS: Tab[] = ['merchants', 'redemptions', 'payouts', 'mint', 'health', 'clients', 'gca', 'applications'];

const SESSION_KEY = 'fidelio_admin_session';

// ─── Shared primitives ────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: '0.75rem',
      padding: '1.25rem',
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ ...font, fontSize: '0.65rem', fontWeight: 400, letterSpacing: '0.12em', color: C.slate, textTransform: 'uppercase' as const }}>
      {children}
    </span>
  );
}

// ─── Clients tab ──────────────────────────────────────────────────────────────

function ClientsTab({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminUsers(token)
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p style={{ ...font, color: C.slate, fontSize: '0.8rem' }}>Cargando...</p>;
  if (error)   return <p style={{ ...font, color: C.danger, fontSize: '0.8rem' }}>{error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {users.map((u) => (
        <Section key={u.id}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ ...font, fontSize: '0.875rem', fontWeight: 500, color: C.white }}>{u.full_name}</span>
            <span style={{ ...font, fontSize: '0.75rem', color: C.slate }}>{u.email}</span>
            {u.wallet ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <Label>Wallet</Label>
                <span style={{ ...font, fontSize: '0.7rem', color: C.slateHi, fontFamily: 'monospace' }}>
                  {u.wallet.address.slice(0, 10)}…{u.wallet.address.slice(-6)}
                </span>
              </div>
            ) : (
              <span style={{ ...font, fontSize: '0.7rem', color: C.slate, marginTop: '0.25rem' }}>Sin wallet</span>
            )}
            {u.wallet && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Label>Balance</Label>
                <span style={{ ...font, fontSize: '0.75rem', color: C.gold }}>{u.wallet.catr_balance} CATR</span>
              </div>
            )}
            {u.reset_code && u.reset_code_expires_at && new Date(u.reset_code_expires_at) > new Date() && (
              <div style={{ marginTop: '0.5rem', background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.25)`, borderRadius: '0.375rem', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Label>Código de reset</Label>
                <span style={{ ...font, fontSize: '0.9rem', fontWeight: 600, color: C.gold, fontFamily: 'monospace', letterSpacing: '0.2em' }}>{u.reset_code}</span>
              </div>
            )}
          </div>
        </Section>
      ))}
    </div>
  );
}

// ─── Applications tab ─────────────────────────────────────────────────────────

function ApplicationsTab({ token }: { token: string }) {
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState<Record<string, ApprovedMerchantCredentials>>({});

  useEffect(() => {
    getAdminApplications(token)
      .then((r) => setApplications(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleApprove(id: string) {
    setActionMsg((m) => ({ ...m, [id]: 'Aprobando...' }));
    try {
      const res = await approveApplication(id, token);
      setCredentials((c) => ({ ...c, [id]: res.data }));
      setApplications((apps) => apps.map((a) => a.id === id ? { ...a, status: 'APPROVED' as const } : a));
      setActionMsg((m) => ({ ...m, [id]: '' }));
    } catch (e) {
      setActionMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : 'Error' }));
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Razón del rechazo (opcional):') ?? undefined;
    setActionMsg((m) => ({ ...m, [id]: 'Rechazando...' }));
    try {
      await rejectApplication(id, token, reason);
      setApplications((apps) => apps.map((a) => a.id === id ? { ...a, status: 'REJECTED' as const } : a));
      setActionMsg((m) => ({ ...m, [id]: '' }));
    } catch (e) {
      setActionMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : 'Error' }));
    }
  }

  if (loading) return <p style={{ ...font, color: C.slate, fontSize: '0.8rem' }}>Cargando...</p>;
  if (error)   return <p style={{ ...font, color: C.danger, fontSize: '0.8rem' }}>{error}</p>;
  if (applications.length === 0) return <p style={{ ...font, color: C.slate, fontSize: '0.8rem' }}>No hay solicitudes.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {applications.map((app) => (
        <Section key={app.id}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...font, fontSize: '0.875rem', fontWeight: 500, color: C.white }}>{app.business_name}</span>
              <span style={{
                ...font, fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.08em', padding: '0.2rem 0.5rem', borderRadius: '0.25rem',
                background: app.status === 'PENDING' ? 'rgba(201,168,76,0.12)' : app.status === 'APPROVED' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: app.status === 'PENDING' ? C.gold : app.status === 'APPROVED' ? '#22C55E' : C.danger,
              }}>
                {app.status}
              </span>
            </div>
            <span style={{ ...font, fontSize: '0.72rem', color: C.slate }}>{app.category}</span>
            <span style={{ ...font, fontSize: '0.75rem', color: C.white }}>{app.contact_name} — {app.contact_email}</span>
            <span style={{ ...font, fontSize: '0.72rem', color: C.slate }}>{app.contact_phone}</span>
            {app.notes && <span style={{ ...font, fontSize: '0.7rem', color: C.slate, fontStyle: 'italic' }}>{app.notes}</span>}
            <span style={{ ...font, fontSize: '0.65rem', color: C.slate }}>{new Date(app.created_at).toLocaleDateString('es-HN')}</span>

            {credentials[app.id] && (
              <div style={{ marginTop: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <Label>Credenciales generadas</Label>
                <span style={{ ...font, fontSize: '0.75rem', color: C.white }}>Usuario: <strong>{credentials[app.id].full_name}</strong></span>
                <span style={{ ...font, fontSize: '0.75rem', color: C.white }}>Email: {credentials[app.id].email}</span>
                <span style={{ ...font, fontSize: '0.75rem', color: C.gold, fontFamily: 'monospace' }}>Contraseña temporal: {credentials[app.id].temp_password}</span>
                <span style={{ ...font, fontSize: '0.65rem', color: C.slate, wordBreak: 'break-all' as const }}>Wallet: {credentials[app.id].wallet_address}</span>
              </div>
            )}

            {app.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => handleApprove(app.id)}
                  style={{ ...font, flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)', color: '#22C55E', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleReject(app.id)}
                  style={{ ...font, flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid rgba(239,68,68,0.4)`, background: 'rgba(239,68,68,0.08)', color: C.danger, fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  Rechazar
                </button>
              </div>
            )}
            {actionMsg[app.id] && <span style={{ ...font, fontSize: '0.7rem', color: C.slate }}>{actionMsg[app.id]}</span>}
          </div>
        </Section>
      ))}
    </div>
  );
}

// ─── Auth screen ──────────────────────────────────────────────────────────────

function AuthScreen({ onConnect, inactivity }: { onConnect: (token: string) => void; inactivity?: boolean }) {
  const [value, setValue] = useState('');
  const t = useLang();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    localStorage.setItem(SESSION_KEY, t);
    onConnect(t);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* shimmer border wrapper */}
        <div className="shimmer-border" style={{ padding: '1px', borderRadius: '1rem' }}>
          <div style={{ background: C.surface, borderRadius: 'calc(1rem - 1px)', padding: '2rem 1.75rem' }}>

            <div style={{ marginBottom: '2rem', textAlign: 'center' as const }}>
              <p style={{ ...font, fontSize: '0.6rem', fontWeight: 300, letterSpacing: '0.2em', color: C.slate, textTransform: 'uppercase' as const, marginBottom: '0.5rem' }}>
                FIDELIO
              </p>
              <h1 style={{ ...font, fontSize: '1.25rem', fontWeight: 300, color: C.white, letterSpacing: '0.06em' }}>
                {t('admin.title')}
              </h1>
            </div>

            {inactivity && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', marginBottom: '0.5rem', textAlign: 'center' as const }}>
                Sesión cerrada por inactividad.
              </p>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Label>{t('admin.jwt_label')}</Label>
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={t('admin.jwt_placeholder')}
                  rows={4}
                  required
                  style={{
                    ...font,
                    background: C.surfaceHi,
                    border: `1px solid ${C.border}`,
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    color: C.white,
                    fontSize: '0.7rem',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'monospace',
                    lineBreak: 'anywhere' as const,
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  ...font,
                  background: C.goldDim,
                  border: `1px solid ${C.gold}`,
                  borderRadius: '0.5rem',
                  color: C.gold,
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  letterSpacing: '0.1em',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase' as const,
                }}
              >
                {t('admin.connect')}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const t = useLang();
  const TABS = TAB_IDS.map((id) => ({ id, label: t(`tab.${id}` as Parameters<typeof t>[0]) }));
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'rgba(6,8,13,0.96)',
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      overflowX: 'auto' as const,
      padding: '0.5rem 0.25rem',
      gap: '0.125rem',
      zIndex: 50,
    }}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              ...font,
              flex: '0 0 auto',
              padding: '0.5rem 0.875rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontWeight: isActive ? 500 : 300,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              background: isActive ? C.goldDim : 'transparent',
              color: isActive ? C.gold : C.slate,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ onDisconnect }: { onDisconnect: () => void }) {
  const t = useLang();
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.25rem',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <p style={{ ...font, fontSize: '0.55rem', fontWeight: 300, letterSpacing: '0.2em', color: C.slate, textTransform: 'uppercase' as const }}>FIDELIO</p>
        <h1 style={{ ...font, fontSize: '0.95rem', fontWeight: 400, color: C.white, letterSpacing: '0.06em' }}>{t('admin.title')}</h1>
      </div>
      <button
        onClick={onDisconnect}
        style={{
          ...font,
          background: C.dangerBg,
          border: `1px solid rgba(239,68,68,0.2)`,
          borderRadius: '0.375rem',
          color: C.danger,
          fontSize: '0.65rem',
          fontWeight: 300,
          letterSpacing: '0.1em',
          padding: '0.375rem 0.75rem',
          cursor: 'pointer',
          textTransform: 'uppercase' as const,
        }}
      >
        {t('admin.disconnect')}
      </button>
    </header>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('merchants');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [inactivity, setInactivity] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) setToken(saved);
  }, []);

  const loadMerchants = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getMerchants(token);
      setMerchants(res.data);
    } catch { /* handled per-component */ }
  }, [token]);

  useEffect(() => {
    if (token) loadMerchants();
  }, [token, loadMerchants]);

  function handleDisconnect(reason?: 'inactivity') {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setMerchants([]);
    setTab('merchants');
    setInactivity(reason === 'inactivity');
  }

  useInactivityLogout(5 * 60 * 1000, () => handleDisconnect('inactivity'), !!token);

  if (!token) return <AuthScreen onConnect={(t) => { setInactivity(false); setToken(t); }} inactivity={inactivity} />;

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <TopBar onDisconnect={handleDisconnect} />
      <main style={{ padding: '1.25rem', paddingBottom: '6rem' }}>
        {tab === 'merchants'   && <MerchantList merchants={merchants} token={token} onRefresh={loadMerchants} />}
        {tab === 'redemptions' && <RedemptionQueue token={token} />}
        {tab === 'payouts'     && <RewardPayoutQueue token={token} />}
        {tab === 'mint'        && <AwardPoints token={token} />}
        {tab === 'health'      && <RunwayWidget token={token} />}
        {tab === 'clients'       && <ClientsTab token={token} />}
        {tab === 'gca'           && <GcaAdminPanel token={token} />}
        {tab === 'applications'  && <ApplicationsTab token={token} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
