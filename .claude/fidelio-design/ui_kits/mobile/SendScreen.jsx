function SendScreen({ onBack, onConfirm }) {
  const [amount, setAmount] = React.useState('250.00');
  return (
    <div style={ssStyles.wrap}>
      <div style={ssStyles.topNav}>
        <button style={ssStyles.back} onClick={onBack}>←</button>
        <div style={ssStyles.title}>Enviar CATR</div>
        <div style={{width:36}}/>
      </div>

      <div style={ssStyles.recipient}>
        <div style={ssStyles.rAvatar}>C</div>
        <div>
          <div style={{fontSize:14, fontWeight:700}}>Carlos M.</div>
          <div style={{fontSize:11, color:'#64748b'}}>@carlos.hnda</div>
        </div>
      </div>

      <div style={ssStyles.amountBlock}>
        <div style={ssStyles.lbl}>MONTO</div>
        <div style={ssStyles.amountRow}>
          <span className="shimmer-text" style={ssStyles.amount}>{amount}</span>
          <span style={ssStyles.unit}>CATR</span>
        </div>
        <div style={ssStyles.hnl}>≈ L {amount}</div>
      </div>

      <div style={ssStyles.keypad}>
        {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
          <button key={k} style={ssStyles.key} onClick={() => {
            if (k === '⌫') setAmount(a => a.slice(0,-1) || '0');
            else if (k === '.') setAmount(a => a.includes('.') ? a : a + '.');
            else setAmount(a => (a === '0' ? k : a + k));
          }}>{k}</button>
        ))}
      </div>

      <div style={ssStyles.feeRow}>
        <span style={{color:'#64748b', fontSize:12}}>Comisión de red</span>
        <span style={{color:'#F1F5F9', fontSize:12, fontWeight:600}}>0.00 pts · gratis</span>
      </div>

      <button style={ssStyles.confirm} onClick={onConfirm}>CONFIRMAR ENVÍO</button>
    </div>
  );
}

const ssStyles = {
  wrap: { height: 'calc(100% - 50px)', padding: '8px 20px 30px', color: '#F1F5F9', display: 'flex', flexDirection: 'column' },
  topNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  back: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#F1F5F9', fontSize: 18, cursor: 'pointer' },
  title: { fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' },
  recipient: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 18 },
  rAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' },
  amountBlock: { textAlign: 'center', padding: '10px 0 18px' },
  lbl: { fontSize: 10, letterSpacing: '0.18em', color: '#94A3B8', fontWeight: 700, marginBottom: 10 },
  amountRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  amount: { fontSize: 48, fontWeight: 200, letterSpacing: '-0.03em', color: '#C9A84C' },
  unit: { fontSize: 16, color: '#94A3B8', fontWeight: 400 },
  hnl: { fontSize: 12, color: '#64748b', marginTop: 6 },
  keypad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 },
  key: { padding: '12px 0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: '#F1F5F9', fontSize: 18, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' },
  feeRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginBottom: 10 },
  confirm: { width: '100%', padding: 16, borderRadius: 12, background: 'linear-gradient(180deg, rgba(201,168,76,0.3), rgba(201,168,76,0.15))', border: '1px solid rgba(201,168,76,0.4)', color: '#F1F5F9', fontWeight: 700, letterSpacing: '0.14em', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
};

Object.assign(window, { SendScreen });
