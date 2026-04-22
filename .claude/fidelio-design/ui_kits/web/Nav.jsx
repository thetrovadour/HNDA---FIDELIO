const { useState } = React;

function Nav() {
  return (
    <nav style={navStyles.nav}>
      <div style={navStyles.inner}>
        <a href="#" style={navStyles.brand}>HNDA</a>
        <div style={navStyles.links}>
          <a href="#mission" style={navStyles.link}>Mission</a>
          <a href="#products" style={navStyles.link}>Products</a>
          <a href="#contact" style={navStyles.link}>Contact</a>
        </div>
        <div style={navStyles.ctas}>
          <button style={navStyles.ctaPill}>HNDA Nodes</button>
          <button style={navStyles.ctaPill}>H-Wallets</button>
        </div>
      </div>
    </nav>
  );
}

const navStyles = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, height: 64, zIndex: 50,
    background: 'rgba(10,15,20,0.72)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  inner: {
    maxWidth: 1100, margin: '0 auto', padding: '0 2rem', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
  },
  brand: {
    fontFamily: "'SairaStencil', sans-serif", fontWeight: 900, fontSize: '1.5rem',
    color: '#e2e8f0', textDecoration: 'none', letterSpacing: '0.06em',
  },
  links: { display: 'flex', gap: 28 },
  link: { color: '#94A3B8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 },
  ctas: { display: 'flex', gap: 8 },
  ctaPill: {
    background: '#0ea5e9', color: '#fff', border: 'none',
    padding: '0.35rem 0.85rem', borderRadius: 999, fontSize: '0.75rem',
    fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
  },
};

Object.assign(window, { Nav });
