'use client';

import { useState } from 'react';
import { createMerchant, updateMerchant, type Merchant } from '@/lib/api';

interface Props {
  merchants: Merchant[];
  token: string;
  onRefresh: () => void;
}

const emptyForm = { name: '', category: '', wallet_address: '', contact_email: '' };

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

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-3 py-2 border border-gray-200">Name</th>
              <th className="px-3 py-2 border border-gray-200">Category</th>
              <th className="px-3 py-2 border border-gray-200">Active</th>
              <th className="px-3 py-2 border border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border border-gray-200">{m.name}</td>
                <td className="px-3 py-2 border border-gray-200">{m.category}</td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className={m.active ? 'text-green-600' : 'text-red-500'}>
                    {m.active ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  {m.active && (
                    <button
                      onClick={() => handleDeactivate(m.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {merchants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-400">No merchants.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Merchant</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3 max-w-lg">
          {(['name', 'category', 'wallet_address', 'contact_email'] as const).map((field) => (
            <label key={field} className="flex flex-col gap-1 text-xs text-gray-600">
              {field.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              <input
                name={field}
                value={form[field]}
                onChange={handleChange}
                required
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          ))}
          <div className="col-span-2">
            <button
              type="submit"
              disabled={formStatus === 'loading'}
              className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {formStatus === 'loading' ? 'Adding…' : 'Add Merchant'}
            </button>
            {formStatus === 'error' && <p className="text-red-600 text-xs mt-1">{formError}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
