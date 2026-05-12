import mockDb, { resetMocks } from '../__mocks__/db';
import { RedemptionService } from '../../src/services/redemption_service';

const service = new RedemptionService(mockDb as any);

beforeEach(() => resetMocks());

describe('RedemptionService.createRequest', () => {
  it('assigns AUTO tier for amount < 50', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({ id: 'm1', merchant_status: 'ACTIVE' });
    mockDb.redemptionRequest.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'r1', ...data }));

    const result = await service.createRequest('m1', '30');
    expect(result.tier).toBe('AUTO');
  });

  it('assigns ADMIN_APPROVAL tier for amount 50-500', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({ id: 'm1', merchant_status: 'ACTIVE' });
    mockDb.redemptionRequest.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'r1', ...data }));

    const result = await service.createRequest('m1', '200');
    expect(result.tier).toBe('ADMIN_APPROVAL');
  });

  it('assigns VAULT_OP tier for amount > 500', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({ id: 'm1', merchant_status: 'ACTIVE' });
    mockDb.redemptionRequest.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'r1', ...data }));

    const result = await service.createRequest('m1', '1000');
    expect(result.tier).toBe('VAULT_OP');
  });

  it('throws if merchant not found', async () => {
    mockDb.merchant.findUnique.mockResolvedValue(null);
    await expect(service.createRequest('bad', '100')).rejects.toThrow('Merchant not found');
  });

  it('throws if merchant not active', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({ id: 'm1', merchant_status: 'PENDING_ACTIVATION' });
    await expect(service.createRequest('m1', '100')).rejects.toThrow('Merchant is not active');
  });
});

describe('RedemptionService.approveRequest', () => {
  it('transitions PENDING_BURN to BURN_SUBMITTED', async () => {
    mockDb.redemptionRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'PENDING_BURN' });
    mockDb.redemptionRequest.update.mockResolvedValue({ id: 'r1', status: 'BURN_SUBMITTED', approved_by: 'admin1' });

    const result = await service.approveRequest('r1', 'admin1');
    expect(result.status).toBe('BURN_SUBMITTED');
  });
});

describe('RedemptionService.confirmBurn', () => {
  it('throws if called on PENDING_BURN status (wrong sequence)', async () => {
    mockDb.redemptionRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'PENDING_BURN' });
    await expect(service.confirmBurn('r1', '0xhash')).rejects.toThrow('not in BURN_SUBMITTED status');
  });
});

describe('RedemptionService.confirmLempirasSent', () => {
  it('transitions BURNED to LEMPIRAS_SENT', async () => {
    mockDb.redemptionRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'BURNED' });
    mockDb.redemptionRequest.update.mockResolvedValue({ id: 'r1', status: 'LEMPIRAS_SENT' });

    const result = await service.confirmLempirasSent('r1');
    expect(result.status).toBe('LEMPIRAS_SENT');
  });
});
