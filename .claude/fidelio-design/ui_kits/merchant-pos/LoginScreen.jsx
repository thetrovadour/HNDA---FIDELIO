// Merchant POS — Login screen
// Production source: packages/web/src/app/merchant/page.tsx → LoginScreen

const C = window.C;

function LoginScreen({ onEnter }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', background: C.bg, fontFamily: 'var(--font-body)', overflowY: 'auto', height: 'calc(100% - 50px)' }}>

      {/* Brand header */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <p style={{ color: C.slate, fontSize: '0.62rem', fontWeight: 300, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>
          Honduras Nativa Digital Answers
        </p>
        <h1 style={{ fontSize: '3rem', fontWeight: 200, letterSpacing: '0.18em', color: C.white, lineHeight: 1, margin: 0 }}>
          FIDELIO
        </h1>
        <div style={{ width: 32, height: 1, background: 'rgba(201,168,76,0.4)', margin: '12px auto' }} />
        <p style={{ color: C.slate, fontSize: '0.6rem', fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Portal de Comercios
        </p>
      </div>

      {/* Login card */}
      <div style={{ width: '100%', maxWidth: 320, border: `1px solid ${C.gold}30`, borderRadius: 16, padding: 1 }}>
        <div style={{ background: C.surface, borderRadius: 15, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              ID de comercio
            </label>
            <div style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
              <span style={{ color: C.slate, fontSize: '0.85rem', fontFamily: 'monospace' }}>xxxxxxxx-xxxx-xxxx-xxxx</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onEnter}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderHi}`, color: C.white, fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: '0.08em', fontWeight: 600, cursor: 'pointer' }}
          >
            Acceder
          </button>

          {/* Footer links */}
          <p style={{ textAlign: 'center', color: C.slate, fontSize: '0.7rem', fontWeight: 300, margin: 0 }}>
            Cliente —{' '}
            <span style={{ color: C.slateHi, textDecoration: 'underline', textUnderlineOffset: 3 }}>accede aquí</span>
          </p>
          <p style={{ textAlign: 'center', color: C.slate, fontSize: '0.7rem', fontWeight: 300, margin: 0 }}>
            ¿No tienes cuenta?{' '}
            <span style={{ color: C.slateHi, textDecoration: 'underline', textUnderlineOffset: 3 }}>Regístrate</span>
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen });
