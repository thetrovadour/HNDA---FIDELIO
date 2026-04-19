'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getMerchants,
  getAdminUsers,
  type Merchant,
  type AdminUser,
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

type Tab = 'merchants' | 'redemptions' | 'payouts' | 'mint' | 'health' | 'clients' | 'gca';

const TABS: { id: Tab; label: string }[] = [
  { id: 'merchants',   label: 'Merchants'   },
  { id: 'redemptions', label: 'Redemptions' },
  { id: 'payouts',     label: 'Payouts'     },
  { id: 'mint',        label: 'Mint'        },
  { id: 'health',      label: 'Health'      },
  { id: 'clients',     label: 'Clients'     },
  { id: 'gca',         label: 'GCA'         },
];

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
          </div>
        </Section>
      ))}
    </div>
  );
}

// ─── Auth screen ──────────────────────────────────────────────────────────────

function AuthScreen({ onConnect }: { onConnect: (token: string) => void }) {
  const [value, setValue] = useState('');

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
                Admin Console
              </h1>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Label>JWT Token</Label>
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Paste admin JWT..."
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
                Connect
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
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
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
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
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ onDisconnect }: { onDisconnect: () => void }) {
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
        <h1 style={{ ...font, fontSize: '0.95rem', fontWeight: 400, color: C.white, letterSpacing: '0.06em' }}>Admin Console</h1>
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
        Disconnect
      </button>
    </header>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('merchants');
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) setToken(saved);
  }, []);

  const loadMerchants = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getMerchants();
      setMerchants(res.data);
    } catch { /* handled per-component */ }
  }, [token]);

  useEffect(() => {
    if (token) loadMerchants();
  }, [token, loadMerchants]);

  function handleDisconnect() {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setMerchants([]);
    setTab('merchants');
  }

  if (!token) return <AuthScreen onConnect={setToken} />;

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <TopBar onDisconnect={handleDisconnect} />
      <main style={{ padding: '1.25rem', paddingBottom: '6rem' }}>
        {tab === 'merchants'   && <MerchantList merchants={merchants} token={token} onRefresh={loadMerchants} />}
        {tab === 'redemptions' && <RedemptionQueue token={token} />}
        {tab === 'payouts'     && <RewardPayoutQueue token={token} />}
        {tab === 'mint'        && <AwardPoints token={token} />}
        {tab === 'health'      && <RunwayWidget token={token} />}
        {tab === 'clients'     && <ClientsTab token={token} />}
        {tab === 'gca'         && <GcaAdminPanel token={token} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
