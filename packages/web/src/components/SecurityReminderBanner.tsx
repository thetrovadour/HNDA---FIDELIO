'use client';

import { useState, useEffect } from 'react';
import { getUserSecurityStatus, getMerchantSecurityStatus } from '@/lib/api';

const DISMISSED_KEY = 'fidelio_security_reminder_dismissed';

const C = {
  gold:    '#C9A84C',
  goldDim: 'rgba(201,168,76,0.10)',
  goldBorder: 'rgba(201,168,76,0.25)',
  white:   '#F1F5F9',
  slate:   '#64748B',
};

const font = { fontFamily: 'var(--font-body)' };

export default function SecurityReminderBanner({ userId, merchantId }: { userId?: string; merchantId?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const fetch = merchantId
      ? getMerchantSecurityStatus(merchantId)
      : getUserSecurityStatus(userId!);
    fetch
      .then((r) => {
        if (!r.data.jwt_session_active && !r.data.passkey_registered) {
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [userId]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      background: C.goldDim,
      border: `1px solid ${C.goldBorder}`,
      borderRadius: '0.875rem',
      padding: '0.875rem 1rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
    }}>
      <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' }}>🔐</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...font, fontSize: '0.8rem', fontWeight: 600, color: C.gold, marginBottom: '0.2rem' }}>
          Activa tu sesión segura
        </p>
        <p style={{ ...font, fontSize: '0.73rem', color: C.white, lineHeight: 1.5 }}>
          Activa una sesión JWT persistente o huella dactilar para mayor seguridad. Disponible en{' '}
          <strong style={{ color: C.gold }}>Ajustes → Seguridad</strong>.
        </p>
      </div>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate, fontSize: '0.85rem', flexShrink: 0, padding: 0, lineHeight: 1 }}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
