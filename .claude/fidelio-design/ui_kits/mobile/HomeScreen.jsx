function HomeScreen({ onSend, onLogout }) {
  return (
    <div style={hsStyles.wrap}>
      <div style={hsStyles.header}>
        <div>
          <div style={hsStyles.hi}>Hola, Elena</div>
          <div style={hsStyles.sub}>Buenas noches · SPS</div>
        </div>
        <div style={hsStyles.avatar} onClick={onLogout}>E</div>
      </div>

      <div style={hsStyles.balCard}>
        <div style={hsStyles.balLbl}>BALANCE CATR</div>
        <div style={hsStyles.balVal}><span className="shimmer-text">56,203.19</span> <span style={hsStyles.balUnit}>pts</span></div>
        <div style={hsStyles.balSub}>Saldo disponible · 1 pt ≈ 1 HNL</div>
        <div style={hsStyles.balHnl}>
          <span>≈ L 56,203.19</span>
          <span style={{color:'#10B981', fontWeight:600}}>+2.4% este mes</span>
        </div>
      </div>

      <div style={hsStyles.actions}>
        <ActionBtn icon="↗" label="Enviar" onClick={onSend} primary/>
        <ActionBtn icon="↙" label="Recibir"/>
        <ActionBtn icon="⇄" label="Cambiar"/>
        <ActionBtn icon="⊞" label="Pagar"/>
      </div>

      <div style={hsStyles.sectionHead}>
        <span>Actividad reciente</span>
        <a style={{color:'#C9A84C', fontSize:12, fontWeight:600}}>Ver todo</a>
      </div>

      <div style={hsStyles.txList}>
        <Tx name="Supermercado La Colonia" sub="Hace 2h · Pago" amount="-245.50" negative/>
        <Tx name="Carlos M." sub="Ayer · Recibido" amount="+1,200.00"/>
        <Tx name="Recompensa FIDELIO" sub="Lun · Bonus" amount="+52.00" gold/>
        <Tx name="Gasolinera Puma" sub="Dom · Pago" amount="-430.00" negative/>
      </div>

      <TabBar/>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, primary }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, background: primary ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${primary ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 12, padding: '14px 8px', color: '#F1F5F9', cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <div style={{fontSize:22, color: primary ? '#C9A84C' : '#F1F5F9', fontWeight:300}}>{icon}</div>
      <div style={{fontSize:11, fontWeight:600, letterSpacing:'0.02em'}}>{label}</div>
    </button>
  );
}

function Tx({ name, sub, amount, negative, gold }) {
  return (
    <div style={txStyles.row}>
      <div style={{...txStyles.dot, background: gold ? 'rgba(201,168,76,0.15)' : negative ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: gold ? '#C9A84C' : negative ? '#EF4444' : '#10B981'}}>
        {gold ? '★' : negative ? '↗' : '↙'}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={txStyles.name}>{name}</div>
        <div style={txStyles.sub}>{sub}</div>
      </div>
      <div style={{...txStyles.amt, color: negative ? '#F1F5F9' : gold ? '#C9A84C' : '#10B981'}}>{amount}</div>
    </div>
  );
}

function TabBar() {
  const tabs = [['◎','Inicio',true],['⇅','Actividad'],['⊞','Pagar'],['⚙','Ajustes']];
  return (
    <div style={tbStyles.bar}>
      {tabs.map(([i,l,a]) => (
        <div key={l} style={{...tbStyles.tab, color: a ? '#C9A84C' : '#64748b'}}>
          <span style={{fontSize:20}}>{i}</span>
          <span style={{fontSize:10, fontWeight:600, letterSpacing:'0.04em'}}>{l}</span>
        </div>
      ))}
    </div>
  );
}

const hsStyles = {
  wrap: { height: 'calc(100% - 50px)', padding: '16px 20px 70px', color: '#F1F5F9', overflowY: 'auto', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  hi: { fontSize: 18, fontWeight: 700, color: '#F1F5F9' },
  sub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C, #a8893a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0C1018', cursor: 'pointer' },
  balCard: { background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(255,255,255,0.02))', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 16, padding: '20px 18px', marginBottom: 16 },
  balLbl: { fontSize: 10, letterSpacing: '0.16em', color: '#94A3B8', fontWeight: 700, marginBottom: 6 },
  balVal: { fontSize: 36, fontWeight: 200, letterSpacing: '-0.02em', color: '#C9A84C', lineHeight: 1 },
  balUnit: { fontSize: 14, fontWeight: 300, color: '#94A3B8' },
  balSub: { fontSize: 11, color: '#64748b', marginTop: 6, letterSpacing: '0.03em' },
  balHnl: { marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8' },
  actions: { display: 'flex', gap: 8, marginBottom: 20 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.01em' },
  txList: { display: 'flex', flexDirection: 'column', gap: 4 },
};

const txStyles = {
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  dot: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 },
  name: { fontSize: 13, fontWeight: 600, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  amt: { fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
};

const tbStyles = {
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'rgba(12,16,24,0.92)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 12 },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' },
};

Object.assign(window, { HomeScreen });
