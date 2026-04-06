import mockDb, { resetMocks } from '../__mocks__/db';
import { TransactionService } from '../../src/services/transaction_service';

const service = new TransactionService(mockDb as any);

beforeEach(() => resetMocks());

describe('TransactionService.recordSpend', () => {
  it('creates Transaction and MerchantVisit atomically', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'u1' });
    mockDb.merchant.findUnique.mockResolvedValue({ id: 'm1' });
    mockDb.transaction.create.mockResolvedValue({ id: 'tx1', type: 'SPEND', status: 'CONFIRMED' });
    mockDb.merchantVisit.create.mockResolvedValue({});

    const result = await service.recordSpend({ user_id: 'u1', merchant_id: 'm1', amount_catr: '100' });

    expect(result.type).toBe('SPEND');
    expect(mockDb.transaction.create).toHaveBeenCalled();
    expect(mockDb.merchantVisit.create).toHaveBeenCalled();
  });

  it('throws if user not found', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(service.recordSpend({ user_id: 'bad', merchant_id: 'm1', amount_catr: '100' }))
      .rejects.toThrow('User not found');
  });

  it('throws if merchant not found', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'u1' });
    mockDb.merchant.findUnique.mockResolvedValue(null);
    await expect(service.recordSpend({ user_id: 'u1', merchant_id: 'bad', amount_catr: '100' }))
      .rejects.toThrow('Merchant not found');
  });
});

describe('TransactionService.getUserTransactions', () => {
  it('returns paginated results', async () => {
    mockDb.transaction.findMany.mockResolvedValue([{ id: 'tx1' }, { id: 'tx2' }]);
    mockDb.transaction.count.mockResolvedValue(5);

    const result = await service.getUserTransactions('u1', 1, 2);

    expect(result.transactions).toHaveLength(2);
    expect(result.total).toBe(5);
  });

  it('returns empty for unknown user', async () => {
    mockDb.transaction.findMany.mockResolvedValue([]);
    mockDb.transaction.count.mockResolvedValue(0);

    const result = await service.getUserTransactions('unknown', 1, 20);

    expect(result.transactions).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
