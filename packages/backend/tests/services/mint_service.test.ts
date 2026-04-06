import mockDb, { resetMocks } from '../__mocks__/db';
import { MintService } from '../../src/services/mint_service';
import { PaymentEventDTO } from '../../src/types';

const service = new MintService(mockDb as any);

const validEvent: PaymentEventDTO = {
  reference_code: 'CATR-0xABCD-1234',
  amount_lempiras: 500,
  client_wallet: '0xABCD1234',
  source: 'EMAIL',
  received_at: 1711800000,
};

beforeEach(() => resetMocks());

describe('MintService.receivePaymentEvent', () => {
  it('returns ACK and creates PendingMint + ProcessedReference for new reference', async () => {
    mockDb.processedReference.findUnique.mockResolvedValue(null);
    mockDb.pendingMint.findUnique.mockResolvedValue(null);
    mockDb.wallet.findUnique.mockResolvedValue(null);
    mockDb.pendingMint.create.mockResolvedValue({});
    mockDb.processedReference.create.mockResolvedValue({});

    const result = await service.receivePaymentEvent(validEvent);

    expect(result).toEqual({ status: 'ACK', reference_code: validEvent.reference_code });
    expect(mockDb.pendingMint.create).toHaveBeenCalled();
    expect(mockDb.processedReference.create).toHaveBeenCalled();
  });

  it('returns NACK when reference_code found in ProcessedReference', async () => {
    mockDb.processedReference.findUnique.mockResolvedValue({ reference_code: validEvent.reference_code });

    const result = await service.receivePaymentEvent(validEvent);

    expect(result).toEqual({
      status: 'NACK',
      reference_code: validEvent.reference_code,
      reason: 'Duplicate reference_code',
    });
  });

  it('returns NACK when PendingMint found with status MINTED', async () => {
    mockDb.processedReference.findUnique.mockResolvedValue(null);
    mockDb.pendingMint.findUnique.mockResolvedValue({ status: 'MINTED' });

    const result = await service.receivePaymentEvent(validEvent);

    expect(result).toEqual({
      status: 'NACK',
      reference_code: validEvent.reference_code,
      reason: 'Already minted',
    });
  });

  it('creates Transaction when wallet is found', async () => {
    mockDb.processedReference.findUnique.mockResolvedValue(null);
    mockDb.pendingMint.findUnique.mockResolvedValue(null);
    mockDb.wallet.findUnique.mockResolvedValue({ user_id: 'user-1', address: '0xABCD1234' });
    mockDb.transaction.create.mockResolvedValue({ id: 'tx-1' });
    mockDb.pendingMint.create.mockResolvedValue({});
    mockDb.processedReference.create.mockResolvedValue({});

    const result = await service.receivePaymentEvent(validEvent);

    expect(result.status).toBe('ACK');
    expect(mockDb.transaction.create).toHaveBeenCalled();
  });

  it('does NOT create Transaction when wallet not found, still returns ACK', async () => {
    mockDb.processedReference.findUnique.mockResolvedValue(null);
    mockDb.pendingMint.findUnique.mockResolvedValue(null);
    mockDb.wallet.findUnique.mockResolvedValue(null);
    mockDb.pendingMint.create.mockResolvedValue({});
    mockDb.processedReference.create.mockResolvedValue({});

    const result = await service.receivePaymentEvent(validEvent);

    expect(result.status).toBe('ACK');
    expect(mockDb.transaction.create).not.toHaveBeenCalled();
  });
});

describe('MintService.confirmMint', () => {
  it('updates PendingMint to MINTED with tx_hash', async () => {
    mockDb.pendingMint.findUnique.mockResolvedValue({
      reference_code: 'CATR-0xABCD-1234',
      transaction_id: null,
    });
    mockDb.pendingMint.update.mockResolvedValue({});

    await service.confirmMint('CATR-0xABCD-1234', '0xhash123');

    expect(mockDb.pendingMint.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reference_code: 'CATR-0xABCD-1234' },
        data: expect.objectContaining({ status: 'MINTED', tx_hash: '0xhash123' }),
      }),
    );
  });

  it('throws when reference_code not found', async () => {
    mockDb.pendingMint.findUnique.mockResolvedValue(null);

    await expect(service.confirmMint('NONEXIST', '0xhash')).rejects.toThrow(
      'PendingMint not found for reference_code: NONEXIST',
    );
  });
});
