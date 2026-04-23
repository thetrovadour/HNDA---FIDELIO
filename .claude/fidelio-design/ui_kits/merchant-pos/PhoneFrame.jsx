function PhoneFrame({ children }) {
  return (
    <div style={pfStyles.outer}>
      <div style={pfStyles.bezel}>
        <div style={pfStyles.notch} />
        <div style={pfStyles.screen}>
          <StatusBar />
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div style={sbStyles.bar}>
      <span style={sbStyles.time}>9:41</span>
      <div style={sbStyles.right}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="#F1F5F9"><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="4.5" y="5" width="3" height="6" rx="0.5"/><rect x="9" y="2.5" width="3" height="8.5" rx="0.5"/><rect x="13.5" y="0" width="3" height="11" rx="0.5"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="#F1F5F9" strokeWidth="1"><path d="M1 4 Q7.5 -2 14 4"/><path d="M3.5 6.5 Q7.5 2.5 11.5 6.5"/><circle cx="7.5" cy="9" r="1" fill="#F1F5F9"/></svg>
        <div style={sbStyles.bat}><div style={sbStyles.batFill}/></div>
      </div>
    </div>
  );
}

const pfStyles = {
  outer:  { display: 'flex', justifyContent: 'center', padding: '40px 20px', minHeight: '100vh', background: 'radial-gradient(ellipse at center top, rgba(201,168,76,0.06), transparent 60%)' },
  bezel:  { width: 390, height: 844, background: '#000', borderRadius: 50, padding: 12, boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.06)', position: 'relative', flexShrink: 0 },
  notch:  { position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: 120, height: 32, background: '#000', borderRadius: 20, zIndex: 10 },
  screen: { width: '100%', height: '100%', borderRadius: 40, overflow: 'hidden', background: '#0C1018', position: 'relative' },
};

const sbStyles = {
  bar:     { height: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 28px 8px', color: '#F1F5F9', fontSize: 15, fontWeight: 600 },
  time:    { fontFamily: "'SF Pro', -apple-system, sans-serif" },
  right:   { display: 'flex', alignItems: 'center', gap: 6 },
  bat:     { width: 24, height: 11, border: '1px solid rgba(241,245,249,0.5)', borderRadius: 3, padding: 1 },
  batFill: { width: '80%', height: '100%', background: '#F1F5F9', borderRadius: 1 },
};

Object.assign(window, { PhoneFrame, StatusBar });
