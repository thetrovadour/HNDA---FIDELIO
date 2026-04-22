function Hero() {
  return (
    <section style={heroStyles.section}>
      <div style={heroStyles.glow} />
      <div style={heroStyles.grid} />
      <div style={heroStyles.content}>
        <div style={heroStyles.eyebrow}>
          <span style={heroStyles.dash} />
          HONDURAS NATIVA · DIGITAL ANSWERS
        </div>
        <h1 style={heroStyles.h1}>
          Honduras pays <span style={{color:'#0ea5e9'}}>on its own terms.</span>
        </h1>
        <p style={heroStyles.sub}>
          Sovereign digital infrastructure for a nation that builds, audits, and owns
          its own financial rails. Public blockchains, Honduran mandate.
        </p>
        <div style={heroStyles.ctas}>
          <InteractiveButton>Explore the Network</InteractiveButton>
          <button style={heroStyles.ghost}>Read the manifesto</button>
        </div>
      </div>
    </section>
  );
}

function InteractiveButton({ children }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#0a0f14', border: '1.5px solid #0ea5e9', color: '#F1F5F9',
        padding: '0.85rem 1.75rem', borderRadius: 999, fontWeight: 600, fontSize: '0.95rem',
        cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 10,
        transition: 'background .25s',
        background: hover ? 'rgba(14,165,233,0.08)' : '#0a0f14',
      }}>
      {children}
      <span style={{color:'#0ea5e9', display:'inline-block', transition:'transform .3s', transform: hover ? 'translateX(4px)' : 'translateX(0)'}}>→</span>
    </button>
  );
}

const heroStyles = {
  section: { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 2rem' },
  glow: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 40%, rgba(14,165,233,0.18), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(14,165,233,0.08), transparent 50%)', pointerEvents: 'none' },
  grid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)' },
  content: { position: 'relative', maxWidth: 960, textAlign: 'center' },
  eyebrow: { fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  dash: { width: 24, height: 1, background: '#0ea5e9', display: 'inline-block' },
  h1: { fontSize: 'clamp(2.8rem, 7vw, 5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 1.5rem', textShadow: '0 0 60px rgba(14,165,233,0.2)' },
  sub: { fontSize: 'clamp(1rem, 2.2vw, 1.25rem)', color: '#94A3B8', lineHeight: 1.6, maxWidth: 620, margin: '0 auto 2.5rem' },
  ctas: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  ghost: { background: 'transparent', border: '1.5px solid rgba(255,255,255,0.13)', color: '#e2e8f0', padding: '0.85rem 1.75rem', borderRadius: 999, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' },
};

Object.assign(window, { Hero });
