// Merchant POS — Home (Mi Negocio tab)
// Production source: packages/web/src/app/merchant/page.tsx → TopBar + NegocioTab + TabBar

const C = window.C;

const MOCK_MERCHANT = {
  name: 'Cafetería Morazán',
  category: 'Alimentos y bebidas',
  contact_email: 'morazan@hnda.network',
  wallet_address: '0xABCD1234567890abcdef1234567890abcdef5678',
  active: true,
};

const MOCK_BALANCE = '1,247.50';

function TopBar({ onLogout }) {
  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '48px 20px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', width: 288, height: 128, background: 'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ color: C.gold, fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.12em' }}>FIDELIO</span>
        <button onClick={onLogout} style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, color: C.slate, fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
          Salir
        </button>
      </div>

      <p style={{ color: C.slate, fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.06em', margin: '0 0 4px' }}>
        {MOCK_MERCHANT.category}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontSize: '1.6rem', lineHeight: 1, color: C.white, fontWeight: 300, margin: 0 }}>{MOCK_MERCHANT.name}</h2>
        <span style={{ background: 'rgba(16,185,129,0.1)', color: C.success, border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
          Activo
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: '3.5rem', lineHeight: 1, color: C.white, fontWeight: 200 }}>{MOCK_BALANCE}</span>
        <span style={{ fontSize: '1rem', fontWeight: 300, color: C.slateHi }}>pts</span>
      </div>
      <p style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 300, marginTop: 6, letterSpacing: '0.08em' }}>
        Balance disponible · 1 pt = 1 HNL
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
      {title && <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>{title}</p>}
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
      <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ color: C.white, fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{value}</p>
    </div>
  );
}

function NegocioTab() {
  const addr = MOCK_MERCHANT.wallet_address;
  const short = `${addr.slice(0, 8)}…${addr.slice(-6)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Wallet">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div>
              <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Dirección</p>
              <p style={{ color: C.white, fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace', margin: 0 }}>{short}</p>
            </div>
            <div style={{ background: C.surface, color: C.slate, padding: 8, borderRadius: 8 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Red</p>
              <p style={{ color: C.slateHi, fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Base (L2)</p>
            </div>
            <div style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Token</p>
              <p style={{ color: C.gold, fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>CATR + GCA</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Información">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InfoRow label="Nombre"    value={MOCK_MERCHANT.name} />
          <InfoRow label="Categoría" value={MOCK_MERCHANT.category} />
          <InfoRow label="Contacto"  value={MOCK_MERCHANT.contact_email} />
          <InfoRow label="Estado"    value={<span style={{ color: C.success }}>Activo</span>} />
        </div>
      </Section>
    </div>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'negocio',     label: 'Mi Negocio',  icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l1-5h16l1 5" strokeLinecap="round"/><path d="M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/><path d="M9 21V12h6v9" strokeLinecap="round"/></svg> },
    { id: 'canjear',     label: 'Canjear',     icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 16V4m0 0L3 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { id: 'gca',         label: 'GCA',         icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 22 9 18 20 6 20 2 9" strokeLinejoin="round"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="12" y1="2" x2="6" y2="20"/><line x1="12" y1="2" x2="18" y2="20"/></svg> },
    { id: 'movimientos', label: 'Movimientos', icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round"/><line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round"/><line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round"/><circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/></svg> },
    { id: 'ajustes',     label: 'Ajustes',     icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  ];

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', background: C.surface, borderTop: `1px solid ${C.border}`, paddingBottom: 8 }}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0 6px', gap: 4, color: isActive ? C.gold : C.slate, background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
          >
            {isActive && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 32, height: 2, background: C.gold, borderRadius: 999 }} />}
            {t.icon}
            <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HomeScreen({ onLogout, onTab }) {
  const [activeTab, setActiveTab] = React.useState('negocio');

  function handleTab(t) {
    setActiveTab(t);
    if (onTab) onTab(t);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 50px)', background: C.bg, fontFamily: 'var(--font-body)', position: 'relative' }}>
      <TopBar onLogout={onLogout} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activeTab === 'negocio' && <NegocioTab />}
        {activeTab !== 'negocio' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <p style={{ color: C.slate, fontSize: '0.85rem' }}>Ver pantalla de {activeTab}</p>
          </div>
        )}
      </div>
      <TabBar active={activeTab} onChange={handleTab} />
    </div>
  );
}

Object.assign(window, { HomeScreen, TopBar, NegocioTab, TabBar, MOCK_MERCHANT, MOCK_BALANCE });
