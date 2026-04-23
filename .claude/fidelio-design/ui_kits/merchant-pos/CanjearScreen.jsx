// Merchant POS — Canjear tab
// Production source: packages/web/src/app/merchant/page.tsx → CanjearTab

const C = window.C;

const MOCK_REDEMPTIONS = [
  { id: '1', amount_catr: '250.00', tier: 'ADMIN_APPROVAL', status: 'LEMPIRAS_SENT', created_at: '2026-04-20T10:30:00Z' },
  { id: '2', amount_catr: '45.00',  tier: 'AUTO',           status: 'BURNED',        created_at: '2026-04-18T14:15:00Z' },
  { id: '3', amount_catr: '600.00', tier: 'VAULT_OP',       status: 'PENDING_BURN',  created_at: '2026-04-15T09:00:00Z' },
];

const TIER_LABELS   = { AUTO: 'Automático', ADMIN_APPROVAL: 'Aprobación admin', VAULT_OP: 'VaultOp (2-de-2)' };
const STATUS_LABELS = { PENDING_BURN: 'Pendiente', BURN_SUBMITTED: 'En proceso', BURNED: 'Quemado', LEMPIRAS_SENT: 'Completado', FAILED: 'Fallido' };

function statusColor(s) {
  if (s === 'LEMPIRAS_SENT') return C.success;
  if (s === 'FAILED')        return C.error;
  if (s === 'BURNED' || s === 'BURN_SUBMITTED') return C.warn;
  return C.slateHi;
}

function Section({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
      {title && <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>{title}</p>}
      {children}
    </div>
  );
}

function CanjearScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 50px)', background: C.bg, fontFamily: 'var(--font-body)', overflowY: 'auto' }}>
      <div style={{ padding: '20px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Redemption form */}
        <div style={{ border: `1px solid ${C.gold}30`, borderRadius: 16, padding: 1 }}>
          <div style={{ background: C.surface, borderRadius: 15, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Monto a canjear (CATR)</label>
              <div style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ color: C.white, fontSize: '0.95rem', fontWeight: 300 }}>250.00</span>
              </div>
            </div>

            {/* Tier indicator */}
            <div style={{ display: 'flex', alignItems: 'center', background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 16px' }}>
              <span style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Tipo</span>
              <span style={{ color: C.slateHi, fontSize: '0.75rem', fontWeight: 600, marginLeft: 'auto' }}>Aprobación admin</span>
            </div>

            <button style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderHi}`, color: C.white, fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: '0.08em', fontWeight: 600, cursor: 'pointer' }}>
              Solicitar canje
            </button>
          </div>
        </div>

        {/* History */}
        <Section title="Historial de canjes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_REDEMPTIONS.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
                <div>
                  <p style={{ color: C.white, fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{parseFloat(r.amount_catr).toFixed(2)} CATR</p>
                  <p style={{ color: C.slate, fontSize: '0.72rem', margin: '2px 0 0' }}>
                    {TIER_LABELS[r.tier]} · {new Date(r.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span style={{ color: statusColor(r.status), fontSize: '0.72rem', fontWeight: 700 }}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Approval tiers reference */}
        <div style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px' }}>
          <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Niveles de aprobación</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { range: '< 50 CATR',     tier: 'Automático' },
              { range: '50 – 500 CATR', tier: 'Aprobación admin' },
              { range: '> 500 CATR',    tier: 'VaultOp (Gnosis Safe 2-de-2)' },
            ].map(({ range, tier }) => (
              <div key={range} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.slate, fontSize: '0.75rem' }}>{range}</span>
                <span style={{ color: C.slateHi, fontSize: '0.75rem', fontWeight: 600 }}>{tier}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CanjearScreen });
