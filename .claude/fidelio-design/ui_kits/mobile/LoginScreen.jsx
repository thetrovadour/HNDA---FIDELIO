function LoginScreen({ onEnter }) {
  return (
    <div style={lsStyles.wrap}>
      <div style={lsStyles.glow}/>
      <div style={lsStyles.top}>
        <div style={lsStyles.logo}>FIDELIO</div>
        <div style={lsStyles.tag}>H-Wallet · Honduras Nativa</div>
      </div>
      <div style={lsStyles.hero}>
        <div style={lsStyles.eyebrow}>BIENVENIDO</div>
        <h2 style={lsStyles.title}>Tu billetera<br/>soberana.</h2>
        <p style={lsStyles.sub}>CATR, HNL, y llaves que solo tú controlas. Sin bancos intermediarios.</p>
      </div>
      <div style={lsStyles.actions}>
        <button style={lsStyles.primary} onClick={onEnter}>ACCEDER</button>
        <button style={lsStyles.secondary}>Crear cuenta nueva</button>
        <div style={lsStyles.role}>
          <span style={{...lsStyles.roleChip, color:'#C9A84C', borderColor:'rgba(201,168,76,0.3)', background:'rgba(201,168,76,0.08)'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C',display:'inline-block'}}/> Usuario
          </span>
          <span style={{...lsStyles.roleChip, color:'#6366f1', borderColor:'rgba(99,102,241,0.3)', background:'rgba(99,102,241,0.08)'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#6366f1',display:'inline-block'}}/> Comerciante
          </span>
        </div>
      </div>
    </div>
  );
}

const lsStyles = {
  wrap: { height: 'calc(100% - 50px)', padding: '32px 24px 40px', display: 'flex', flexDirection: 'column', color: '#F1F5F9', position: 'relative', overflow: 'hidden' },
  glow: { position: 'absolute', top: '-20%', left: '-10%', right: '-10%', height: '60%', background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.12), transparent 60%)', pointerEvents: 'none' },
  top: { position: 'relative', textAlign: 'center', marginTop: 20 },
  logo: { fontFamily: "'SairaStencil', sans-serif", fontWeight: 900, fontSize: 40, color: '#C9A84C', letterSpacing: '0.08em', textShadow: '0 0 30px rgba(201,168,76,0.3)' },
  tag: { fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 600, marginTop: 6 },
  hero: { position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: '0.24em', color: '#C9A84C', fontWeight: 700, marginBottom: 14 },
  title: { fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.05, color: '#F1F5F9' },
  sub: { fontSize: 14, color: '#94A3B8', lineHeight: 1.55, margin: 0 },
  actions: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 },
  primary: { width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(180deg, rgba(201,168,76,0.25), rgba(201,168,76,0.12))', border: '1px solid rgba(201,168,76,0.4)', color: '#F1F5F9', fontWeight: 700, letterSpacing: '0.14em', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  secondary: { width: '100%', padding: '14px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  role: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 },
  roleChip: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '5px 12px', borderRadius: 999, border: '1px solid', fontWeight: 600 },
};

Object.assign(window, { LoginScreen });
