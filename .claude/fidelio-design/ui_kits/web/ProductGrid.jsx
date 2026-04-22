function ProductGrid() {
  const products = [
    { name: 'H-Wallet', tag: 'Non-custodial wallet', desc: 'Sovereign keys, self-custody, local-first. The front door to HNDA.', status: 'live' },
    { name: 'FIDELIO', tag: 'Loyalty & CATR', desc: 'Closed-loop points token. 1 pt ≈ 1 HNL. For merchants and their clients.', status: 'live' },
    { name: 'HNDA Nodes', tag: 'Validator network', desc: 'Community-run nodes securing the Honduran financial mesh.', status: 'live' },
    { name: 'HNDA Pay', tag: 'Merchant POS', desc: 'Accept CATR and HNL at the counter. QR-first. Works offline.', status: 'soon' },
  ];
  return (
    <section id="products" style={pgStyles.section}>
      <div style={pgStyles.header}>
        <div style={pgStyles.eyebrow}>Products</div>
        <h2 style={pgStyles.h2}>Sovereign by design. <span style={{color:'#0ea5e9'}}>Nativa by mandate.</span></h2>
      </div>
      <div style={pgStyles.grid}>
        {products.map(p => (
          <div key={p.name} style={pgStyles.card}>
            <StatusBadge live={p.status === 'live'} />
            <div style={pgStyles.name}>{p.tag}</div>
            <h3 style={pgStyles.title}>{p.name}</h3>
            <p style={pgStyles.desc}>{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ live }) {
  if (live) return (
    <span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'0.22rem 0.7rem',borderRadius:999,fontSize:'0.65rem',fontWeight:600,letterSpacing:'0.04em',background:'rgba(34,197,94,0.14)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.3)',marginBottom:14}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:'#22c55e'}}/> LIVE ON TESTNET
    </span>
  );
  return (
    <span style={{display:'inline-flex',alignItems:'center',padding:'0.22rem 0.7rem',borderRadius:999,fontSize:'0.65rem',fontWeight:600,letterSpacing:'0.04em',background:'rgba(255,255,255,0.06)',color:'#64748b',marginBottom:14}}>
      COMING SOON
    </span>
  );
}

const pgStyles = {
  section: { padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '3rem' },
  eyebrow: { fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0ea5e9', fontWeight: 700, marginBottom: 16 },
  h2: { fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' },
  card: { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.13)', borderRadius: 16, padding: '1.6rem', transition: 'all .3s' },
  name: { fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 600, marginBottom: 6 },
  title: { fontSize: '1.35rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 10px', letterSpacing: '-0.02em' },
  desc: { fontSize: '0.87rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 },
};

Object.assign(window, { ProductGrid, StatusBadge });
