import mockDb, { resetMocks } from '../__mocks__/db';
import { RewardService } from '../../src/services/reward_service';

const service = new RewardService(mockDb as any);

beforeEach(() => resetMocks());

describe('RewardService.checkMilestones', () => {
  it('does not award TX_5 when tx count is 4', async () => {
    mockDb.transaction.count.mockResolvedValue(4);

    await service.checkMilestones('u1');

    expect(mockDb.rewardMilestone.create).not.toHaveBeenCalled();
  });

  it('awards TX_5 when tx count reaches 5', async () => {
    mockDb.transaction.count.mockResolvedValue(5);
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
    mockDb.transaction.count.mockResolvedValue(5);
    mockDb.rewardMilestone.findUnique.mockResolvedValue({ id: 'existing', type: 'TX_5' });

    await service.checkMilestones('u1');

    expect(mockDb.rewardMilestone.create).not.toHaveBeenCalled();
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

describe('RewardService.queuePayout (via checkMilestones)', () => {
  it('assigns correct tier based on amount', async () => {
    // TX_5 awards 5 CATR → should be AUTO tier
    mockDb.transaction.count.mockResolvedValue(5);
    mockDb.rewardMilestone.findUnique.mockResolvedValue(null);
    mockDb.wallet.findUnique.mockResolvedValue({ user_id: 'u1', address: '0xWALLET' });
    mockDb.rewardMilestone.create.mockResolvedValue({ id: 'rm1', type: 'TX_5' });
    mockDb.rewardPayoutQueue.create.mockResolvedValue({});

    await service.checkMilestones('u1');

    expect(mockDb.rewardPayoutQueue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: 'AUTO' }),
      }),
    );
  });
});
