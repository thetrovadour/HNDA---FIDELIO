'use client';

import { useState } from 'react';
import { createRedemption } from '@/lib/api';

interface Props {
  merchantId: string;
  onSuccess: () => void;
}

export default function RedemptionForm({ merchantId, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setStatus('loading');
    setMessage('');
    try {
      await createRedemption({ merchant_id: merchantId, amount_catr: amount });
      setStatus('success');
      setMessage('Redemption request submitted successfully.');
      setAmount('');
      onSuccess();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Request failed.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <label className="text-sm font-medium text-gray-700">
        Amount (CATR)
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. 100"
          required
        />
      </label>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Submitting…' : 'Request Redemption'}
      </button>
      {status === 'success' && <p className="text-green-600 text-sm">{message}</p>}
      {status === 'error' && <p className="text-red-600 text-sm">{message}</p>}
    </form>
  );
}
