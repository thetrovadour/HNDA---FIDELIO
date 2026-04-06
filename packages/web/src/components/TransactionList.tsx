'use client';

import type { Transaction } from '@/lib/api';

interface Props {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: Props) {
  if (transactions.length === 0) {
    return <p className="text-gray-500 text-sm">No transactions found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-3 py-2 border border-gray-200">Date</th>
            <th className="px-3 py-2 border border-gray-200">Type</th>
            <th className="px-3 py-2 border border-gray-200">Amount (CATR)</th>
            <th className="px-3 py-2 border border-gray-200">Merchant ID</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 border border-gray-200">
                {new Date(tx.created_at).toLocaleString('es-HN')}
              </td>
              <td className="px-3 py-2 border border-gray-200">
                <span className="capitalize">{tx.type}</span>
              </td>
              <td className="px-3 py-2 border border-gray-200 font-mono">{tx.amount_catr}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-500 text-xs">
                {tx.merchant_id ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
