'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';

// ─── Design tokens ────────────────────────────────────────────────────────────

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

// ─── Field ────────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'client' | 'merchant'>('client');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const body = role === 'client'
        ? { role: 'client' as const, full_name: fullName, email, password }
        : { role: 'merchant' as const, full_name: fullName, email, password, business_name: businessName, category };

      await register(body);
      setSuccess(true);

      setTimeout(() => {
        router.push(role === 'client' ? '/client' : '/merchant');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar';
      if (msg.includes('409') || msg.includes('EMAIL_TAKEN')) {
        setError('Este correo ya está registrado.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div className="shimmer-border" style={{ padding: '1px', borderRadius: '1rem' }}>
          <div style={{ background: C.surface, borderRadius: 'calc(1rem - 1px)', padding: '2rem 1.75rem' }}>

            {/* Header */}
            <div style={{ marginBottom: '1.75rem', textAlign: 'center' as const }}>
              <p style={{ ...font, fontSize: '0.6rem', fontWeight: 300, letterSpacing: '0.2em', color: C.slate, textTransform: 'uppercase' as const, marginBottom: '0.4rem' }}>
                FIDELIO
              </p>
              <h1 style={{ ...font, fontSize: '1.2rem', fontWeight: 300, color: C.white, letterSpacing: '0.04em' }}>
                Crear cuenta
              </h1>
            </div>

            {/* Role toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: C.surfaceHi, borderRadius: '0.5rem', padding: '0.25rem' }}>
              {(['client', 'merchant'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); setError(''); }}
                  style={{
                    ...font,
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: role === r ? 500 : 300,
                    background: role === r ? C.goldDim : 'transparent',
                    color: role === r ? C.gold : C.slate,
                    transition: 'all 0.2s',
                    letterSpacing: '0.04em',
                  }}
                >
                  {r === 'client' ? 'Soy Cliente' : 'Soy Comercio'}
                </button>
              ))}
            </div>

            {success ? (
              <div style={{ ...font, textAlign: 'center' as const, padding: '1rem', background: C.successBg, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: '0.5rem', color: C.success, fontSize: '0.8rem' }}>
                {role === 'client'
                  ? '¡Cuenta creada! Redirigiendo...'
                  : '¡Solicitud enviada! Un administrador activará tu cuenta pronto. Redirigiendo...'}
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                <Field label="Nombre completo">
                  <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Juan Pérez" />
                </Field>

                <Field label="Correo electrónico">
                  <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="juan@email.com" />
                </Field>

                {role === 'merchant' && (
                  <>
                    <Field label="Nombre del negocio">
                      <input style={inputStyle} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="Restaurante El Buen Sabor" />
                    </Field>
                    <Field label="Categoría">
                      <select
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c} style={{ background: C.surface }}>{c}</option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}

                <Field label="Contraseña">
                  <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
                </Field>

                <Field label="Confirmar contraseña">
                  <input style={inputStyle} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repite la contraseña" />
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
                  {loading ? 'Registrando...' : 'Crear cuenta'}
                </button>

                <p style={{ ...font, textAlign: 'center' as const, fontSize: '0.7rem', color: C.slate, margin: 0 }}>
                  ¿Ya tienes cuenta?{' '}
                  <a href="/client" style={{ color: C.gold, textDecoration: 'none' }}>Inicia sesión</a>
                </p>

              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
