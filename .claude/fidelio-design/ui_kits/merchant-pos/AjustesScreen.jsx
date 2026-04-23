// Merchant POS — Ajustes tab
// Production source: packages/web/src/app/merchant/page.tsx → AjustesTab

const C = window.C;
const MOCK_MERCHANT = window.MOCK_MERCHANT || { name: 'Cafetería Morazán', category: 'Alimentos y bebidas', contact_email: 'morazan@hnda.network' };

function AjustesScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 50px)', background: C.bg, fontFamily: 'var(--font-body)', overflowY: 'auto' }}>
      <div style={{ padding: '20px 16px 100px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
            Información del negocio
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Nombre del negocio', value: MOCK_MERCHANT.name },
              { label: 'Categoría',          value: MOCK_MERCHANT.category },
              { label: 'Correo de contacto', value: MOCK_MERCHANT.contact_email },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</label>
                <div style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
                  <span style={{ color: C.white, fontSize: '0.95rem', fontWeight: 300 }}>{value}</span>
                </div>
              </div>
            ))}

            <button style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderHi}`, color: C.white, fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: '0.08em', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AjustesScreen });
