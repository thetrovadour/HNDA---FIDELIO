'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
      await register({ role: 'client', username, full_name: fullName, email, phone, password });
      localStorage.removeItem('fidelio_session');
      setSuccess(true);
      setTimeout(() => router.push('/client'), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar';
      if (msg.includes('USERNAME_TAKEN')) {
        setError('Este usuario ya está en uso.');
      } else if (msg.includes('409') || msg.includes('EMAIL_TAKEN')) {
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
            {!success && (
              <div style={{ marginBottom: '1.75rem', textAlign: 'center' as const }}>
                <Link href="/" style={{ ...font, fontSize: '0.6rem', fontWeight: 300, letterSpacing: '0.2em', color: C.slate, textTransform: 'uppercase' as const, marginBottom: '0.4rem', textDecoration: 'none', display: 'block' }}>
                  FIDELIO
                </Link>
                <h1 style={{ ...font, fontSize: '1.2rem', fontWeight: 300, color: C.white, letterSpacing: '0.04em' }}>
                  Crear cuenta
                </h1>
              </div>
            )}


            {success ? (
              <div style={{ ...font, background: C.successBg, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' as const }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: C.success, marginBottom: '0.25rem' }}>¡Cuenta creada exitosamente!</p>
                <p style={{ fontSize: '0.72rem', color: C.slate }}>Redirigiendo al inicio de sesión...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                <Field label="Usuario">
                  <input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required placeholder="juan_perez" autoComplete="username" />
                  <span style={{ ...font, fontSize: '0.62rem', color: '#64748B' }}>Solo letras minúsculas, números y guión bajo. No se puede cambiar después.</span>
                </Field>

                <Field label="Nombre completo">
                  <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Juan Pérez" autoComplete="name" />
                </Field>

                <Field label="Correo electrónico">
                  <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="juan@email.com" autoComplete="email" />
                </Field>

                <Field label="Teléfono">
                  <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+504 9999-9999" autoComplete="tel" />
                </Field>

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

                <p style={{ ...font, textAlign: 'center' as const, fontSize: '0.7rem', color: C.slate, margin: 0 }}>
                  ¿Eres un comercio?{' '}
                  <a href="/apply" style={{ color: C.gold, textDecoration: 'none' }}>Aplica aquí</a>
                </p>

              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
