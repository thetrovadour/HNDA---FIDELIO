'use client';

import type { Milestone } from '@/lib/api';

interface Props {
  milestones: Milestone[];
}

const MILESTONE_LABELS: Record<string, string> = {
  TX_5: 'Milestone: 5 Transactions',
  TX_10: 'Milestone: 10 Transactions',
  TX_25: 'Milestone: 25 Transactions',
  CROSS_MERCHANT: 'Cross-Merchant Bonus',
  REFERRAL: 'Referral Reward',
};

export default function RewardStatus({ milestones }: Props) {
  if (milestones.length === 0) {
    return <p className="text-gray-500 text-sm">No milestones unlocked yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {milestones.map((m) => (
        <li key={m.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-4 py-2 text-sm">
          <span className="font-medium text-green-800">
            {MILESTONE_LABELS[m.type] ?? m.type}
          </span>
          <span className="text-gray-500 text-xs">
            {new Date(m.unlocked_at).toLocaleDateString('es-HN')}
          </span>
        </li>
      ))}
    </ul>
  );
}
