'use client';

import { useState, useEffect } from 'react';
import { getAdminUsers, getMerchants, adminMint, type AdminUser, type Merchant } from '@/lib/api';

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

const font = { fontFamily: 'var(--font-body)' };

type TargetType = 'client' | 'merchant' | 'address';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ ...font, fontSize: '0.65rem', fontWeight: 400, letterSpacing: '0.12em', color: C.slate, textTransform: 'uppercase' as const }}>
      {children}
    </span>
  );
}

function FieldBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.4rem' }}>
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  ...font,
  background: C.surfaceHi,
  border: `1px solid ${C.borderHi}`,
  borderRadius: '0.625rem',
  padding: '0.65rem 0.875rem',
  color: C.white,
  fontSize: '0.875rem',
  fontWeight: 300,
  width: '100%',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  ...font,
  background: C.surfaceHi,
  border: `1px solid ${C.borderHi}`,
  borderRadius: '0.625rem',
  padding: '0.65rem 0.875rem',
  color: C.white,
  fontSize: '0.875rem',
  fontWeight: 300,
  width: '100%',
  outline: 'none',
};

export default function AwardPoints({ token }: { token: string }) {
  const [targetType, setTargetType] = useState<TargetType>('client');
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadErr, setLoadErr]     = useState('');

  const [selectedUserId,     setSelectedUserId]     = useState('');
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [rawAddress,         setRawAddress]         = useState('');
  const [amount,             setAmount]             = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState<{ reference_code: string; wallet_address: string; amount: number } | null>(null);
  const [error,      setError]      = useState('');

  useEffect(() => {
    Promise.all([getAdminUsers(token), getMerchants(token)])
      .then(([u, m]) => { setUsers(u.data); setMerchants(m.data); })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : 'Error al cargar datos.'))
      .finally(() => setLoading(false));
  }, [token]);

  function reset() {
    setResult(null);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setSubmitting(true);
    try {
      let body: Parameters<typeof adminMint>[0];
      if (targetType === 'client')   body = { user_id: selectedUserId, amount: Number(amount) };
      else if (targetType === 'merchant') body = { merchant_id: selectedMerchantId, amount: Number(amount) };
      else body = { wallet_address: rawAddress.trim(), amount: Number(amount) };

      const res = await adminMint(body, token);
      setResult(res.data);
      setAmount('');
      setRawAddress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedUser     = users.find((u) => u.id === selectedUserId);
  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId);

  const canSubmit = !submitting && !!amount &&
    (targetType === 'client'   ? !!selectedUserId :
     targetType === 'merchant' ? !!selectedMerchantId :
     rawAddress.trim().length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem', maxWidth: '480px' }}>

      {/* Target type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        {(['client', 'merchant', 'address'] as TargetType[]).map((t) => {
          const labels = { client: 'Cliente', merchant: 'Comercio', address: 'Dirección' };
          const isActive = targetType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => { setTargetType(t); reset(); }}
              style={{
                ...font,
                padding: '0.6rem',
                borderRadius: '0.625rem',
                border: isActive ? `1px solid rgba(201,168,76,0.4)` : `1px solid ${C.border}`,
                background: isActive ? C.goldDim : C.surfaceHi,
                color: isActive ? C.gold : C.slate,
                fontSize: '0.7rem',
                fontWeight: isActive ? 500 : 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {loading && <p style={{ ...font, color: C.slate, fontSize: '0.8rem' }}>Cargando…</p>}
      {loadErr && <p style={{ ...font, color: C.error, fontSize: '0.8rem' }}>{loadErr}</p>}

      {!loading && !loadErr && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.875rem' }}>

          {/* Target selector */}
          {targetType === 'client' && (
            <FieldBox>
              <Label>Cliente</Label>
              <select
                value={selectedUserId}
                onChange={(e) => { setSelectedUserId(e.target.value); reset(); }}
                style={selectStyle}
                required
              >
                <option value="">— seleccionar cliente —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} · {u.email}
                  </option>
                ))}
              </select>
              {selectedUser && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                  <Label>Balance</Label>
                  <span style={{ ...font, fontSize: '0.75rem', color: C.gold }}>
                    {selectedUser.wallet ? `${Number(selectedUser.wallet.catr_balance).toFixed(2)} CATR` : 'Sin wallet'}
                  </span>
                </div>
              )}
            </FieldBox>
          )}

          {targetType === 'merchant' && (
            <FieldBox>
              <Label>Comercio</Label>
              <select
                value={selectedMerchantId}
                onChange={(e) => { setSelectedMerchantId(e.target.value); reset(); }}
                style={selectStyle}
                required
              >
                <option value="">— seleccionar comercio —</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.category}
                  </option>
                ))}
              </select>
              {selectedMerchant && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                  <Label>Wallet</Label>
                  <span style={{ ...font, fontSize: '0.7rem', color: C.slateHi, fontFamily: 'monospace' }}>
                    {selectedMerchant.wallet_address.slice(0, 10)}…{selectedMerchant.wallet_address.slice(-6)}
                  </span>
                </div>
              )}
            </FieldBox>
          )}

          {targetType === 'address' && (
            <FieldBox>
              <Label>Dirección de wallet</Label>
              <input
                type="text"
                value={rawAddress}
                onChange={(e) => { setRawAddress(e.target.value); reset(); }}
                placeholder="0x..."
                style={inputStyle}
                required
              />
            </FieldBox>
          )}

          {/* Amount */}
          <FieldBox>
            <Label>Cantidad (CATR)</Label>
            <input
              type="number"
              min="1"
              max="10000"
              step="1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); reset(); }}
              placeholder="0"
              style={inputStyle}
              required
            />
          </FieldBox>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...font,
              background: canSubmit ? C.goldDim : 'rgba(255,255,255,0.03)',
              border: `1px solid ${canSubmit ? 'rgba(201,168,76,0.4)' : C.border}`,
              borderRadius: '0.625rem',
              color: canSubmit ? C.gold : C.slate,
              fontSize: '0.75rem',
              fontWeight: 400,
              letterSpacing: '0.1em',
              padding: '0.75rem',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase' as const,
              transition: 'all 0.15s',
            }}
          >
            {submitting ? 'Enviando al bridge…' : 'Emitir CATR'}
          </button>
        </form>
      )}

      {result && (
        <div style={{ background: C.successBg, border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.625rem', padding: '0.875rem', display: 'flex', flexDirection: 'column' as const, gap: '0.35rem' }}>
          <p style={{ ...font, fontSize: '0.8rem', fontWeight: 500, color: C.success }}>Mint ejecutado correctamente.</p>
          <p style={{ ...font, fontSize: '0.7rem', color: C.slateHi }}>El bridge procesará la transacción on-chain en breve.</p>
          <p style={{ ...font, fontSize: '0.65rem', color: C.slate, marginTop: '0.25rem', wordBreak: 'break-all' as const }}>
            Ref: {result.reference_code}
          </p>
          <p style={{ ...font, fontSize: '0.65rem', color: C.slate, wordBreak: 'break-all' as const }}>
            Wallet: {result.wallet_address}
          </p>
          <p style={{ ...font, fontSize: '0.65rem', color: C.gold }}>
            {result.amount} CATR emitidos
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: C.errorBg, border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.625rem', padding: '0.75rem' }}>
          <p style={{ ...font, fontSize: '0.8rem', color: C.error }}>{error}</p>
        </div>
      )}
    </div>
  );
}
