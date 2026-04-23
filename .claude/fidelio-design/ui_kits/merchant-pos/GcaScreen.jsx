// Merchant POS — GCA tab
// Production source: packages/web/src/app/merchant/page.tsx → GcaTab

const C = window.C;

const MOCK_GCA = {
  gca_balance:        '850.00',
  estimated_hnl_value:'212.50',
  milestones_claimed: 6,
  price_floor_hnl:    '0.2500',
  next_milestone_at:  '12,500',
};

function Section({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
      {title && <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>{title}</p>}
      {children}
    </div>
  );
}

function GcaScreen() {
  const progress = (MOCK_GCA.milestones_claimed / 10) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 50px)', background: C.bg, fontFamily: 'var(--font-body)', overflowY: 'auto' }}>
      <div style={{ padding: '20px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* What is GCA */}
        <Section title="¿Qué es GCA?">
          <p style={{ color: C.slateHi, fontSize: '0.85rem', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
            Guacacoin (GCA) es el token de participación de la red FIDELIO.
            Los comercios lo reciben como reconocimiento por el volumen de transacciones
            que procesan dentro de la red y pueden canjearlo por Lempiras.
          </p>
        </Section>

        {/* Earning rules */}
        <Section title="Cómo se gana GCA">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { title: 'Regalo de bienvenida', desc: '200 GCA al unirte a la red FIDELIO' },
              { title: 'Hitos de volumen',     desc: '+100 GCA por cada 25,000 CATR efectivos procesados · máximo 10 hitos' },
            ].map(({ title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, display: 'inline-block', flexShrink: 0, marginTop: 6 }} />
                <div>
                  <p style={{ color: C.gold, fontSize: '0.85rem', fontWeight: 700, margin: '0 0 2px' }}>{title}</p>
                  <p style={{ color: C.slate, fontSize: '0.72rem', margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Multiplier table */}
        <Section title="Multiplicador por clientes únicos">
          <p style={{ color: C.slate, fontSize: '0.72rem', fontWeight: 300, marginBottom: 12 }}>
            El CATR efectivo se multiplica según la diversidad de clientes que te visitan.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { range: '≥ 60% clientes únicos', mult: '×2.0' },
              { range: '≥ 40% clientes únicos', mult: '×1.5' },
              { range: '≥ 20% clientes únicos', mult: '×1.25' },
              { range: '< 20% clientes únicos',  mult: '×1.0' },
            ].map(({ range, mult }) => (
              <div key={range} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 16px' }}>
                <span style={{ color: C.slate, fontSize: '0.75rem' }}>{range}</span>
                <span style={{ color: C.gold, fontSize: '0.85rem', fontWeight: 700 }}>{mult}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Current status */}
        <Section title="Tu estado actual">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Balance GCA',    value: MOCK_GCA.gca_balance,          color: C.gold },
                { label: 'Valor est. HNL', value: `L. ${MOCK_GCA.estimated_hnl_value}`, color: C.white },
                { label: 'Hitos',          value: `${MOCK_GCA.milestones_claimed} / 10`, color: C.white },
                { label: 'Precio piso',    value: `L. ${MOCK_GCA.price_floor_hnl}`,       color: C.white },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
                  <p style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
                  <p style={{ color, fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.slate, marginBottom: 6 }}>
                <span>Progreso de vesting</span>
                <span>{MOCK_GCA.milestones_claimed * 100 + 200} / 1,200 GCA ganados</span>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: C.gold }} />
              </div>
            </div>

            <div style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 16px' }}>
              <p style={{ color: C.slate, fontSize: '0.72rem', margin: 0 }}>
                Próximo hito en{' '}
                <span style={{ color: C.slateHi, fontWeight: 600 }}>{MOCK_GCA.next_milestone_at} CATR efectivos</span>
              </p>
            </div>
          </div>
        </Section>

        {/* Apply CTA */}
        <button style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: C.gold, fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: '0.1em', fontWeight: 600, cursor: 'pointer' }}>
          Aplicar para canje de GCA
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { GcaScreen });
