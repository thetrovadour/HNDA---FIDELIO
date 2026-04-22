'use client';

import { useState } from 'react';
import { createMerchant, updateMerchant, type Merchant } from '@/lib/api';

interface Props {
  merchants: Merchant[];
  token: string;
  onRefresh: () => void;
}

const C = {
  surface:   '#0C1018',
  surfaceHi: '#111820',
  border:    'rgba(255,255,255,0.07)',
  gold:      '#C9A84C',
  goldDim:   'rgba(201,168,76,0.12)',
  white:     '#F1F5F9',
  slate:     '#64748B',
  slateHi:   '#94A3B8',
  danger:    '#EF4444',
  dangerBg:  'rgba(239,68,68,0.08)',
  success:   '#10B981',
  successBg: 'rgba(16,185,129,0.08)',
};
const font = { fontFamily: 'var(--font-body)' };

const emptyForm = { name: '', category: '', wallet_address: '', contact_email: '' };

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  category: 'Category',
  wallet_address: 'Wallet Address',
  contact_email: 'Contact Email',
};

export default function MerchantList({ merchants, token, onRefresh }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [formError, setFormError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormStatus('loading');
    setFormError('');
    try {
      await createMerchant(form, token);
      setForm(emptyForm);
      setFormStatus('idle');
      onRefresh();
    } catch (err) {
      setFormStatus('error');
      setFormError(err instanceof Error ? err.message : 'Failed to create merchant.');
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await updateMerchant(id, { active: false }, token);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate merchant.');
    }
  }

  const thStyle: React.CSSProperties = {
    ...font,
    padding: '0.5rem 0.75rem',
    fontSize: '0.6rem',
    fontWeight: 400,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: C.slate,
    borderBottom: `1px solid ${C.border}`,
    textAlign: 'left',
  };

  const tdStyle: React.CSSProperties = {
    ...font,
    padding: '0.6rem 0.75rem',
    fontSize: '0.78rem',
    color: C.slateHi,
    borderBottom: `1px solid ${C.border}`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.surfaceHi }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((m) => (
              <tr key={m.id}>
                <td style={{ ...tdStyle, color: C.white }}>
                  {m.name}
                  <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: C.slate, marginTop: '0.2rem', userSelect: 'all' as const }}>
                    {m.id}
                  </div>
                </td>
                <td style={tdStyle}>{m.category}</td>
                <td style={tdStyle}>
                  <span style={{ color: m.active ? C.success : C.danger }}>
                    {m.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={tdStyle}>
                  {m.active && (
                    <button
                      onClick={() => handleDeactivate(m.id)}
                      style={{ ...font, background: C.dangerBg, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: '0.25rem', color: C.danger, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {merchants.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: C.slate, padding: '1.5rem' }}>
                  No merchants.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1.25rem' }}>
        <p style={{ ...font, fontSize: '0.65rem', fontWeight: 400, letterSpacing: '0.12em', color: C.slate, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Add Merchant
        </p>
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: '560px' }}>
          {(['name', 'category', 'wallet_address', 'contact_email'] as const).map((field) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ ...font, fontSize: '0.6rem', letterSpacing: '0.1em', color: C.slate, textTransform: 'uppercase' }}>
                {FIELD_LABELS[field]}
              </label>
              <input
                name={field}
                value={form[field]}
                onChange={handleChange}
                required
                style={{ ...font, background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: '0.375rem', padding: '0.5rem 0.75rem', color: C.white, fontSize: '0.8rem', outline: 'none' }}
              />
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              disabled={formStatus === 'loading'}
              style={{ ...font, background: C.goldDim, border: `1px solid ${C.gold}`, borderRadius: '0.375rem', color: C.gold, fontSize: '0.7rem', fontWeight: 400, letterSpacing: '0.1em', padding: '0.5rem 1.25rem', cursor: 'pointer', textTransform: 'uppercase', opacity: formStatus === 'loading' ? 0.5 : 1 }}
            >
              {formStatus === 'loading' ? 'Adding...' : 'Add Merchant'}
            </button>
            {formStatus === 'error' && (
              <p style={{ ...font, color: C.danger, fontSize: '0.75rem', marginTop: '0.5rem' }}>{formError}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
