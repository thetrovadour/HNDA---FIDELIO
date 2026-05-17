'use client';

import { useState, useEffect } from 'react';
import { useNfcPayment } from '@/hooks/useNfcPayment';
import { submitNfcPayment } from '@/lib/api';

// ─── Design tokens (matches merchant page) ────────────────────────────────────
const C = {
  bg:        '#06080D',
  surface:   '#0C1018',
  surfaceHi: '#111820',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.13)',
  gold:      '#C9A84C',
  goldDim:   'rgba(201,168,76,0.12)',
  white:     '#F1F5F9',
  slate:     '#64748B',
  slateHi:   '#94A3B8',
  success:   '#10B981',
  successBg: 'rgba(16,185,129,0.08)',
  error:     '#EF4444',
  errorBg:   'rgba(239,68,68,0.08)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrimaryBtn({
  children, onClick, disabled = false,
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem',
        background: disabled ? C.surfaceHi : C.gold,
        border: `1px solid ${disabled ? C.border : C.gold}`,
        color: disabled ? C.slate : C.bg,
        fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600,
        letterSpacing: '0.06em', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: C.slate, fontSize: '0.72rem', textDecoration: 'underline',
        textUnderlineOffset: '3px', fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </button>
  );
}

// Pulsing NFC icon shown while scanning
function NfcScanIcon() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        {/* Outer pulse rings */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${C.gold}`,
              opacity: 0,
              animation: `nfc-pulse 1.8s ease-out ${i * 0.6}s infinite`,
            }}
          />
        ))}
        {/* Core icon */}
        <div style={{
          position: 'absolute', inset: '20%', borderRadius: '50%',
          background: C.goldDim, border: `1px solid ${C.gold}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round">
            <path d="M20 12a8 8 0 0 0-8-8" />
            <path d="M4 12a8 8 0 0 0 8 8" />
            <path d="M17 12a5 5 0 0 0-5-5" />
            <path d="M7 12a5 5 0 0 0 5 5" />
            <circle cx="12" cy="12" r="1.5" fill={C.gold} stroke="none" />
          </svg>
        </div>
      </div>
      <style>{`
        @keyframes nfc-pulse {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function truncateWallet(w: string) {
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}

function generateReferenceCode(wallet: string): string {
  return `CATR-${wallet}-${Math.floor(Date.now() / 1000)}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

type FlowStep = 'amount' | 'scan' | 'confirm' | 'done' | 'error';

interface NfcChargeFlowProps {
  merchantId: string;
}

export function NfcChargeFlow({ merchantId: _merchantId }: NfcChargeFlowProps) {
  const [step, setStep] = useState<FlowStep>('amount');
  const [amountInput, setAmountInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);

  const { isSupported, status, clientWallet, error: nfcError, startScan, reset: resetNfc } = useNfcPayment();

  const amountLempiras = parseFloat(amountInput.replace(',', '.'));
  const amountValid = !isNaN(amountLempiras) && amountLempiras > 0;

  function handleReset() {
    setStep('amount');
    setAmountInput('');
    setSubmitting(false);
    setSubmitError(null);
    setTxRef(null);
    resetNfc();
  }

  async function handleStartScan() {
    if (!amountValid) return;
    setStep('scan');
    await startScan();
  }

  // When NFC succeeds or fails, advance the flow step
  useEffect(() => {
    if (step !== 'scan') return;
    if (status === 'success') setStep('confirm');
    if (status === 'error') setStep('error');
  }, [status, step]);

  async function handleConfirm() {
    if (!clientWallet || !amountValid) return;
    setSubmitting(true);
    setSubmitError(null);
    const reference_code = generateReferenceCode(clientWallet);
    try {
      await submitNfcPayment({
        reference_code,
        amount_lempiras: amountLempiras,
        client_wallet: clientWallet,
        received_at: Math.floor(Date.now() / 1000),
      });
      setTxRef(reference_code);
      setStep('done');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error al procesar el pago.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── NFC not supported ────────────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', padding: '1.5rem 0' }}>
        <p style={{ color: C.slate, fontSize: '0.78rem', textAlign: 'center', lineHeight: 1.6 }}>
          NFC no está disponible en este dispositivo.<br />
          Se requiere Android con Chrome para cobrar por NFC.
        </p>
      </div>
    );
  }

  // ─── Step: enter amount ───────────────────────────────────────────────────
  if (step === 'amount') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <p style={{ color: C.slate, fontSize: '0.65rem', fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Monto a cobrar
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.surfaceHi, border: `1px solid ${C.borderHi}`, borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
            <span style={{ color: C.slateHi, fontSize: '0.9rem', fontWeight: 300 }}>L.</span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: C.white, fontFamily: 'var(--font-body)', fontSize: '1.4rem',
                fontWeight: 200, letterSpacing: '0.04em',
              }}
            />
          </div>
        </div>
        <PrimaryBtn onClick={handleStartScan} disabled={!amountValid}>
          Cobrar con NFC
        </PrimaryBtn>
      </div>
    );
  }

  // ─── Step: scanning ───────────────────────────────────────────────────────
  if (step === 'scan') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
        <NfcScanIcon />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: C.white, fontSize: '0.85rem', fontWeight: 300, marginBottom: '0.3rem' }}>
            {status === 'scanning' ? 'Esperando tarjeta...' : 'Activando NFC...'}
          </p>
          <p style={{ color: C.slate, fontSize: '0.72rem', lineHeight: 1.6 }}>
            Pide al cliente que toque su tarjeta<br />contra la parte trasera del teléfono.
          </p>
        </div>
        <p style={{ color: C.gold, fontSize: '1.1rem', fontWeight: 200, letterSpacing: '0.06em' }}>
          L. {amountLempiras.toFixed(2)}
        </p>
        <GhostBtn onClick={handleReset}>Cancelar</GhostBtn>
      </div>
    );
  }

  // ─── Step: confirm ────────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: C.surfaceHi, border: `1px solid ${C.borderHi}`, borderRadius: '1rem', padding: '1rem' }}>
          <Row label="Monto" value={`L. ${amountLempiras.toFixed(2)}`} />
          <Row label="Billetera cliente" value={truncateWallet(clientWallet!)} />
        </div>
        {submitError && (
          <p style={{ color: C.error, fontSize: '0.72rem', textAlign: 'center' }}>{submitError}</p>
        )}
        <PrimaryBtn onClick={handleConfirm} disabled={submitting}>
          {submitting ? 'Procesando...' : 'Confirmar cobro'}
        </PrimaryBtn>
        <GhostBtn onClick={handleReset}>Cancelar</GhostBtn>
      </div>
    );
  }

  // ─── Step: done ───────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.successBg, border: `1px solid ${C.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: C.success, fontSize: '0.85rem', fontWeight: 400, marginBottom: '0.3rem' }}>Cobro enviado</p>
          <p style={{ color: C.slate, fontSize: '0.7rem', lineHeight: 1.6 }}>
            El cliente recibirá sus CATR en breve.<br />
            Ref: <span style={{ color: C.slateHi, fontFamily: 'monospace' }}>{txRef}</span>
          </p>
        </div>
        <PrimaryBtn onClick={handleReset}>Nuevo cobro</PrimaryBtn>
      </div>
    );
  }

  // ─── Step: error ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.errorBg, border: `1px solid ${C.error}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <p style={{ color: C.error, fontSize: '0.78rem', textAlign: 'center', lineHeight: 1.6 }}>
        {nfcError ?? submitError ?? 'Ocurrió un error.'}
      </p>
      <PrimaryBtn onClick={handleReset}>Intentar de nuevo</PrimaryBtn>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.slate, fontSize: '0.72rem' }}>{label}</span>
      <span style={{ color: C.white, fontSize: '0.78rem', fontWeight: 400 }}>{value}</span>
    </div>
  );
}
