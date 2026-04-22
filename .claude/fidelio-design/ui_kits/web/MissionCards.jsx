function MissionCards() {
  const pillars = [
    { eyebrow: 'Who we are', title: 'Sovereignty as strategy', body: 'We build financial infrastructure that belongs to Honduras — not to a vendor, not to a state treaty. Sovereign keys, sovereign code, sovereign rails.' },
    { eyebrow: 'How we build', title: 'Public chains, honest by default', body: 'We use public blockchains because they are auditable, transparent, and honest. Those guarantees don\u2019t exist in a database row.' },
    { eyebrow: 'Where we stand', title: 'Honduran by design', body: 'Built in San Pedro Sula for merchants, workers, and remitters. Spanish-first product. Local-first data. Local-first trust.' },
  ];
  return (
    <section id="mission" style={mcStyles.section}>
      <div style={mcStyles.grid}>
        {pillars.map((p, i) => (
          <div key={i} style={mcStyles.card}>
            <div style={mcStyles.eyebrow}>{p.eyebrow}</div>
            <h4 style={mcStyles.title}>{p.title}</h4>
            <p style={mcStyles.body}>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const mcStyles = {
  section: { padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem' },
  eyebrow: { fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0ea5e9', fontWeight: 700, marginBottom: 16 },
  title: { fontSize: '1.1rem', fontWeight: 700, color: '#F1F5F9', margin: '0 0 12px', letterSpacing: '-0.01em' },
  body: { fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.65, margin: 0 },
};

Object.assign(window, { MissionCards });
