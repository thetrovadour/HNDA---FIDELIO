import mockDb, { resetMocks } from '../__mocks__/db';
import { RewardService } from '../../src/services/reward_service';

const service = new RewardService(mockDb as any);

beforeEach(() => resetMocks());

function makeSpend(merchant_id: string, amount_catr: string, date: string) {
  return { merchant_id, amount_catr, created_at: new Date(`${date}T12:00:00Z`) };
}

describe('RewardService.checkMilestones', () => {
  it('does not award TX_5 when qualifying tx count is 4', async () => {
    mockDb.transaction.findMany.mockResolvedValue([
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m2', '100', '2026-04-02'),
      makeSpend('m3', '100', '2026-04-03'),
      makeSpend('m4', '100', '2026-04-04'),
    ]);

    await service.checkMilestones('u1');

    expect(mockDb.rewardMilestone.create).not.toHaveBeenCalled();
  });

  it('awards TX_5 when qualifying tx count reaches 5', async () => {
    mockDb.transaction.findMany.mockResolvedValue([
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m2', '100', '2026-04-02'),
      makeSpend('m3', '100', '2026-04-03'),
      makeSpend('m4', '100', '2026-04-04'),
      makeSpend('m5', '100', '2026-04-05'),
    ]);
    mockDb.rewardMilestone.findUnique.mockResolvedValue(null);
    mockDb.wallet.findUnique.mockResolvedValue({ user_id: 'u1', address: '0xWALLET' });
    mockDb.rewardMilestone.create.mockResolvedValue({ id: 'rm1', type: 'TX_5' });
    mockDb.rewardPayoutQueue.create.mockResolvedValue({});

    await service.checkMilestones('u1');

    expect(mockDb.rewardMilestone.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'TX_5' }) }),
    );
  });

  it('does not award TX_5 again if already exists', async () => {
    mockDb.transaction.findMany.mockResolvedValue([
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m2', '100', '2026-04-02'),
      makeSpend('m3', '100', '2026-04-03'),
      makeSpend('m4', '100', '2026-04-04'),
      makeSpend('m5', '100', '2026-04-05'),
    ]);
    mockDb.rewardMilestone.findUnique.mockResolvedValue({ id: 'existing', type: 'TX_5' });

    await service.checkMilestones('u1');

    expect(mockDb.rewardMilestone.create).not.toHaveBeenCalled();
  });

  it('velocity cap: counts at most 3 txns per merchant per day', async () => {
    mockDb.transaction.findMany.mockResolvedValue([
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m1', '100', '2026-04-01'), // 4th — excluded
    ]);

    await service.checkMilestones('u1');

    expect(mockDb.rewardMilestone.create).not.toHaveBeenCalled();
  });
});

describe('RewardService.getActiveTier', () => {
  it('returns null when fewer than 5 qualifying txns in 90 days', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue(null);
    mockDb.transaction.findMany.mockResolvedValue([
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m2', '100', '2026-04-02'),
    ]);

    const tier = await service.getActiveTier('u1');
    expect(tier).toBeNull();
  });

  it('returns TX_5 for 5–9 qualifying txns', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue(null);
    mockDb.transaction.findMany.mockResolvedValue([
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m2', '100', '2026-04-02'),
      makeSpend('m3', '100', '2026-04-03'),
      makeSpend('m4', '100', '2026-04-04'),
      makeSpend('m5', '100', '2026-04-05'),
    ]);

    const tier = await service.getActiveTier('u1');
    expect(tier).toBe('TX_5');
  });

  it('returns TX_25 for 25+ qualifying txns', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue(null);
    const txns = Array.from({ length: 25 }, (_, i) =>
      makeSpend(`m${i}`, '100', `2026-04-${String(i + 1).padStart(2, '0')}`),
    );
    mockDb.transaction.findMany.mockResolvedValue(txns);

    const tier = await service.getActiveTier('u1');
    expect(tier).toBe('TX_25');
  });
});

describe('RewardService.processCashbackBatch', () => {
  it('returns zeros when no unprocessed transactions', async () => {
    mockDb.transaction.findMany.mockResolvedValue([]);

    const result = await service.processCashbackBatch();
    expect(result).toEqual({ processed: 0, payouts: 0 });
  });

  it('marks transactions processed and queues payout for active tier user', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue(null); // not GOLD → not skipped by batch
    // Batch query returns unprocessed txns
    mockDb.transaction.findMany
      .mockResolvedValueOnce([{ id: 'tx1', user_id: 'u1', amount_catr: '500' }]) // unprocessed batch
      .mockResolvedValueOnce([ // getActiveTier inner call — 5 qualifying txns
        makeSpend('m1', '100', '2026-04-01'),
        makeSpend('m2', '100', '2026-04-02'),
        makeSpend('m3', '100', '2026-04-03'),
        makeSpend('m4', '100', '2026-04-04'),
        makeSpend('m5', '100', '2026-04-05'),
      ]);
    mockDb.transaction.updateMany.mockResolvedValue({ count: 1 });
    mockDb.wallet.findUnique.mockResolvedValue({ user_id: 'u1', address: '0xWALLET' });
    mockDb.rewardPayoutQueue.create.mockResolvedValue({});

    const result = await service.processCashbackBatch();

    expect(result.processed).toBe(1);
    expect(result.payouts).toBe(1);
    expect(mockDb.rewardPayoutQueue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source_type: 'CASHBACK' }),
      }),
    );
  });

  it('marks processed but skips payout when user has no active tier', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue(null); // not GOLD
    mockDb.transaction.findMany
      .mockResolvedValueOnce([{ id: 'tx1', user_id: 'u1', amount_catr: '200' }])
      .mockResolvedValueOnce([]); // no qualifying txns → no tier
    mockDb.transaction.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.processCashbackBatch();

    expect(result.processed).toBe(1);
    expect(result.payouts).toBe(0);
    expect(mockDb.rewardPayoutQueue.create).not.toHaveBeenCalled();
  });
});

describe('RewardService.queuePayout tier assignment', () => {
  it('assigns AUTO tier for small reward', async () => {
    mockDb.transaction.findMany.mockResolvedValue([
      makeSpend('m1', '100', '2026-04-01'),
      makeSpend('m2', '100', '2026-04-02'),
      makeSpend('m3', '100', '2026-04-03'),
      makeSpend('m4', '100', '2026-04-04'),
      makeSpend('m5', '100', '2026-04-05'),
    ]);
    mockDb.rewardMilestone.findUnique.mockResolvedValue(null);
    mockDb.wallet.findUnique.mockResolvedValue({ user_id: 'u1', address: '0xWALLET' });
    mockDb.rewardMilestone.create.mockResolvedValue({ id: 'rm1', type: 'TX_5' });
    mockDb.rewardPayoutQueue.create.mockResolvedValue({});

    await service.checkMilestones('u1');

    expect(mockDb.rewardPayoutQueue.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tier: 'AUTO' }) }),
    );
  });
});

describe('RewardService.isGoldActive', () => {
  it('returns false when no active gold status record', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue(null);
    expect(await service.isGoldActive('u1')).toBe(false);
  });

  it('returns true when active gold status record exists', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue({ id: 'gs1', user_id: 'u1' });
    expect(await service.isGoldActive('u1')).toBe(true);
  });
});

describe('RewardService.getActiveTier with GOLD', () => {
  it('returns GOLD when user has active gold status', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue({ id: 'gs1', user_id: 'u1' });
    expect(await service.getActiveTier('u1')).toBe('GOLD');
  });

  it('falls through to TX_25 when no active gold status', async () => {
    mockDb.userGoldStatus.findFirst.mockResolvedValue(null);
    const txns = Array.from({ length: 25 }, (_, i) =>
      makeSpend(`m${i}`, '100', `2026-04-${String(i + 1).padStart(2, '0')}`),
    );
    mockDb.transaction.findMany.mockResolvedValue(txns);
    expect(await service.getActiveTier('u1')).toBe('TX_25');
  });
});

describe('RewardService.processGoldCashbackBatch', () => {
  it('returns zeros when no unprocessed transactions', async () => {
    mockDb.transaction.findMany.mockResolvedValue([]);
    const result = await service.processGoldCashbackBatch();
    expect(result).toEqual({ processed: 0, payouts: 0 });
  });

  it('processes GOLD user and skips non-GOLD user', async () => {
    mockDb.transaction.findMany.mockResolvedValue([
      { id: 'tx1', user_id: 'u_gold', amount_catr: '500' },
      { id: 'tx2', user_id: 'u_regular', amount_catr: '500' },
    ]);
    mockDb.userGoldStatus.findFirst
      .mockResolvedValueOnce({ id: 'gs1' })  // u_gold → GOLD active
      .mockResolvedValueOnce(null);           // u_regular → not GOLD
    mockDb.transaction.updateMany.mockResolvedValue({ count: 1 });
    mockDb.wallet.findUnique.mockResolvedValue({ user_id: 'u_gold', address: '0xGOLD' });
    mockDb.rewardPayoutQueue.create.mockResolvedValue({});

    const result = await service.processGoldCashbackBatch();

    expect(result.processed).toBe(1);
    expect(result.payouts).toBe(1);
    expect(mockDb.rewardPayoutQueue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source_type: 'CASHBACK_GOLD' }),
      }),
    );
  });
});

describe('RewardService.checkCrossMerchantBonus', () => {
  it('does not award when only 2 unique merchants', async () => {
    mockDb.merchantVisit.groupBy.mockResolvedValue([{ merchant_id: 'm1' }, { merchant_id: 'm2' }]);

    await service.checkCrossMerchantBonus('u1');

    expect(mockDb.rewardMilestone.create).not.toHaveBeenCalled();
  });

  it('awards when 3+ unique merchants in 30 days', async () => {
    mockDb.merchantVisit.groupBy.mockResolvedValue([
      { merchant_id: 'm1' }, { merchant_id: 'm2' }, { merchant_id: 'm3' },
    ]);
    mockDb.rewardMilestone.findUnique.mockResolvedValue(null);
    mockDb.wallet.findUnique.mockResolvedValue({ user_id: 'u1', address: '0xWALLET' });
    mockDb.rewardMilestone.create.mockResolvedValue({ id: 'rm1', type: 'CROSS_MERCHANT' });
    mockDb.rewardPayoutQueue.create.mockResolvedValue({});

    await service.checkCrossMerchantBonus('u1');

    expect(mockDb.rewardMilestone.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'CROSS_MERCHANT' }) }),
    );
  });
});

describe('RewardService.checkReferralTrigger', () => {
  it('does nothing when no pending referral found', async () => {
    mockDb.referral.findFirst.mockResolvedValue(null);

    await service.checkReferralTrigger('u1');

    expect(mockDb.referral.update).not.toHaveBeenCalled();
  });

  it('triggers reward when pending referral found', async () => {
    mockDb.referral.findFirst.mockResolvedValue({ id: 'ref1', referrer_id: 'u2', referred_id: 'u1', status: 'PENDING' });
    mockDb.referral.update.mockResolvedValue({});
    mockDb.wallet.findUnique.mockResolvedValue({ user_id: 'u2', address: '0xREFERRER' });
    mockDb.rewardPayoutQueue.create.mockResolvedValue({});

    await service.checkReferralTrigger('u1');

    expect(mockDb.referral.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'TRIGGERED' }) }),
    );
    expect(mockDb.rewardPayoutQueue.create).toHaveBeenCalled();
  });
});
