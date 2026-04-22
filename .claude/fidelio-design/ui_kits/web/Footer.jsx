function Footer() {
  return (
    <footer id="contact" style={footerStyles.footer}>
      <div style={footerStyles.inner}>
        <div>
          <div style={{fontFamily:"'SairaStencil', sans-serif",fontWeight:900,fontSize:'1.4rem',color:'#e2e8f0',letterSpacing:'0.06em',marginBottom:10}}>HNDA</div>
          <div style={{color:'#64748b',fontSize:'0.82rem',lineHeight:1.6}}>Honduras Nativa<br/>Digital Answers.</div>
        </div>
        <div style={footerStyles.col}>
          <div style={footerStyles.hd}>Products</div>
          <a style={footerStyles.lk}>H-Wallet</a>
          <a style={footerStyles.lk}>FIDELIO</a>
          <a style={footerStyles.lk}>HNDA Nodes</a>
        </div>
        <div style={footerStyles.col}>
          <div style={footerStyles.hd}>Network</div>
          <a style={footerStyles.lk}>Polygon</a>
          <a style={footerStyles.lk}>Base</a>
          <a style={footerStyles.lk}>Audit</a>
        </div>
        <div style={footerStyles.col}>
          <div style={footerStyles.hd}>Location</div>
          <div style={{color:'#94A3B8',fontSize:'0.82rem',lineHeight:1.6}}>San Pedro Sula<br/>Honduras</div>
        </div>
      </div>
      <div style={footerStyles.bottom}>
        <span>© 2026 HNDA. All rights reserved.</span>
        <span>Testnet build · v0.8.2</span>
      </div>
    </footer>
  );
}

const footerStyles = {
  footer: { borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4rem 2rem 2rem', marginTop: '4rem' },
  inner: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '2rem', marginBottom: '3rem' },
  col: { display: 'flex', flexDirection: 'column', gap: 8 },
  hd: { fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700, marginBottom: 6 },
  lk: { color: '#e2e8f0', fontSize: '0.85rem', textDecoration: 'none', cursor: 'pointer' },
  bottom: { maxWidth: 1100, margin: '0 auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem' },
};

Object.assign(window, { Footer });
