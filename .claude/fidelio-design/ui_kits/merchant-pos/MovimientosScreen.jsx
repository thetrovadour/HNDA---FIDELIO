// Merchant POS — Movimientos tab
// Production source: packages/web/src/app/merchant/page.tsx → MovimientosTab

const C = window.C;

const MOCK_TRANSACTIONS = [
  { id: '1', type: 'MINT', source: 'EMAIL',  amount_catr: '500.00',  created_at: '2026-04-22T10:15:00Z' },
  { id: '2', type: 'MINT', source: 'EMAIL',  amount_catr: '300.00',  created_at: '2026-04-20T14:32:00Z' },
  { id: '3', type: 'MINT', source: 'ADMIN',  amount_catr: '1000.00', created_at: '2026-04-18T09:05:00Z' },
  { id: '4', type: 'MINT', source: 'WEBHOOK',amount_catr: '150.00',  created_at: '2026-04-16T16:45:00Z' },
];

function MovimientosScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 50px)', background: C.bg, fontFamily: 'var(--font-body)', overflowY: 'auto' }}>
      <div style={{ padding: '20px 16px 100px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
            Historial de movimientos
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_TRANSACTIONS.map((tx) => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.12)', color: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>↓</div>
                  <div>
                    <p style={{ color: C.white, fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
                      {tx.source === 'ADMIN' ? 'Acreditación admin' : `Acreditación (${tx.source.toLowerCase()})`}
                    </p>
                    <p style={{ color: C.slate, fontSize: '0.72rem', margin: '2px 0 0' }}>
                      {new Date(tx.created_at).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span style={{ color: C.success, fontSize: '0.85rem', fontWeight: 700 }}>
                  +{parseFloat(tx.amount_catr).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MovimientosScreen });
