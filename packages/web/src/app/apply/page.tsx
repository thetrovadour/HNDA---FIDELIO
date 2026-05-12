'use client';

import { useState } from 'react';
import { applyMerchant } from '@/lib/api';

const C = {
  bg:        '#06080D',
  surface:   '#0C1018',
  surfaceHi: '#111820',
  border:    'rgba(255,255,255,0.07)',
  gold:      '#C9A84C',
  goldDim:   'rgba(201,168,76,0.12)',
  white:     '#F1F5F9',
  slate:     '#64748B',
  danger:    '#EF4444',
  dangerBg:  'rgba(239,68,68,0.08)',
  success:   '#22C55E',
  successBg: 'rgba(34,197,94,0.08)',
};

const font = { fontFamily: 'var(--font-body)' };

const CATEGORIES = [
  'Restaurante', 'Supermercado', 'Farmacia', 'Ropa y Calzado',
  'Electrónica', 'Salud y Belleza', 'Educación', 'Transporte',
  'Entretenimiento', 'Servicios', 'Otro',
];

const inputStyle = {
  ...font,
  background: C.surfaceHi,
  border: `1px solid ${C.border}`,
  borderRadius: '0.5rem',
  padding: '0.65rem 0.75rem',
  color: C.white,
  fontSize: '0.8rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ ...font, fontSize: '0.65rem', fontWeight: 400, letterSpacing: '0.12em', color: C.slate, textTransform: 'uppercase' as const }}>
        {label}
      </span>
      {children}
    </div>
  );
}

export default function ApplyPage() {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await applyMerchant({
        business_name: businessName,
        category,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        notes: notes || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div className="shimmer-border" style={{ padding: '1px', borderRadius: '1rem' }}>
          <div style={{ background: C.surface, borderRadius: 'calc(1rem - 1px)', padding: '2rem 1.75rem' }}>

            {success ? (
              <div style={{ ...font, background: C.successBg, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center' as const }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 500, color: C.success, marginBottom: '0.75rem' }}>¡Solicitud enviada!</p>
                <p style={{ fontSize: '0.82rem', color: C.white, lineHeight: 1.6 }}>
                  Recibimos tu solicitud, te contactaremos pronto para confirmar tu número de teléfono y activar tu cuenta!
                </p>
                <a
                  href="/"
                  style={{ ...font, display: 'inline-block', marginTop: '1.25rem', color: C.gold, fontSize: '0.72rem', textDecoration: 'none', letterSpacing: '0.08em' }}
                >
                  ← Volver al inicio
                </a>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.75rem', textAlign: 'center' as const }}>
                  <p style={{ ...font, fontSize: '0.6rem', fontWeight: 300, letterSpacing: '0.2em', color: C.slate, textTransform: 'uppercase' as const, marginBottom: '0.4rem' }}>
                    FIDELIO
                  </p>
                  <h1 style={{ ...font, fontSize: '1.2rem', fontWeight: 300, color: C.white, letterSpacing: '0.04em' }}>
                    Aplica como comercio
                  </h1>
                  <p style={{ ...font, fontSize: '0.72rem', color: C.slate, marginTop: '0.4rem' }}>
                    Completa el formulario y HNDA te contactará para activar tu cuenta.
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <Field label="Nombre del negocio">
                    <input style={inputStyle} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="Restaurante El Buen Sabor" />
                  </Field>

                  <Field label="Categoría">
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} style={{ background: C.surface }}>{c}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Nombre del contacto">
                    <input style={inputStyle} value={contactName} onChange={(e) => setContactName(e.target.value)} required placeholder="Juan Pérez" />
                  </Field>

                  <Field label="Correo electrónico">
                    <input style={inputStyle} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required placeholder="juan@negocio.com" />
                  </Field>

                  <Field label="Teléfono">
                    <input style={inputStyle} type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required placeholder="+504 9999-9999" />
                  </Field>

                  <Field label="Notas adicionales (opcional)">
                    <textarea
                      style={{ ...inputStyle, resize: 'vertical' as const, minHeight: '80px' }}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Cuéntanos más sobre tu negocio..."
                      maxLength={500}
                    />
                  </Field>

                  {error && (
                    <p style={{ ...font, fontSize: '0.75rem', color: C.danger, background: C.dangerBg, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: '0.5rem', padding: '0.6rem 0.75rem', margin: 0 }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...font,
                      marginTop: '0.25rem',
                      background: loading ? 'transparent' : C.goldDim,
                      border: `1px solid ${C.gold}`,
                      borderRadius: '0.5rem',
                      color: C.gold,
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      letterSpacing: '0.1em',
                      padding: '0.75rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textTransform: 'uppercase' as const,
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {loading ? 'Enviando...' : 'Enviar solicitud'}
                  </button>

                  <p style={{ ...font, textAlign: 'center' as const, fontSize: '0.7rem', color: C.slate, margin: 0 }}>
                    ¿Ya tienes cuenta?{' '}
                    <a href="/merchant" style={{ color: C.gold, textDecoration: 'none' }}>Inicia sesión</a>
                  </p>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
