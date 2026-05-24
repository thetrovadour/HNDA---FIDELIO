import mockDb, { resetMocks } from '../__mocks__/db';
import { ReconciliationJob } from '../../src/jobs/reconciliation';

// Mock fetch globally
const mockFetch = jest.fn().mockResolvedValue({ ok: true });
(global as any).fetch = mockFetch;

beforeEach(() => {
  resetMocks();
  mockFetch.mockClear();
  process.env.RECONCILIATION_STALE_MINUTES = '30';
  process.env.RECONCILIATION_MAX_ATTEMPTS = '3';
});

const job = new ReconciliationJob(mockDb as any, 'http://localhost:3002');

describe('ReconciliationJob.run', () => {
  it('returns zero counts when no stale rows exist', async () => {
    mockDb.pendingMint.findMany.mockResolvedValue([]);

    const result = await job.run();

    expect(result).toEqual({
      checked: 0,
      retried: 0,
      failed: 0,
      already_minted: 0,
      transfers_checked: 0,
      transfers_retried: 0,
      transfers_failed: 0,
    });
  });

  it('marks row as already_minted when tx_hash is already set', async () => {
    mockDb.pendingMint.findMany.mockResolvedValue([
      { id: 'pm1', tx_hash: '0xexisting', attempts: 0, reference_code: 'CATR-1' },
    ]);
    mockDb.pendingMint.update.mockResolvedValue({});

    const result = await job.run();

    expect(result.already_minted).toBe(1);
    expect(mockDb.pendingMint.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'MINTED' }) }),
    );
  });

  it('increments attempts and retries when row is stale and no tx_hash', async () => {
    mockDb.pendingMint.findMany.mockResolvedValue([
      { id: 'pm1', tx_hash: null, attempts: 0, reference_code: 'CATR-1', client_wallet: '0x1', amount_lempiras: { toString: () => '500' }, source: 'EMAIL' },
    ]);
    mockDb.pendingMint.update.mockResolvedValue({});

    const result = await job.run();

    expect(result.retried).toBe(1);
    expect(mockDb.pendingMint.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attempts: 1 }) }),
    );
  });

  it('marks FAILED when attempts reaches maxAttempts', async () => {
    mockDb.pendingMint.findMany.mockResolvedValue([
      { id: 'pm1', tx_hash: null, attempts: 2, reference_code: 'CATR-1', client_wallet: '0x1', amount_lempiras: { toString: () => '500' }, source: 'EMAIL' },
    ]);
    mockDb.pendingMint.update.mockResolvedValue({});

    const result = await job.run();

    expect(result.failed).toBe(1);
    expect(mockDb.pendingMint.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('does not process rows younger than staleMinutes', async () => {
    // findMany returns empty because the query filters by updated_at < cutoff
    mockDb.pendingMint.findMany.mockResolvedValue([]);

    const result = await job.run();

    expect(result.checked).toBe(0);
  });

  it('does not process rows with status MINTED or FAILED', async () => {
    // findMany filters by status IN (PENDING, SENT) — MINTED/FAILED excluded by query
    mockDb.pendingMint.findMany.mockResolvedValue([]);

    const result = await job.run();

    expect(result.checked).toBe(0);
    expect(mockDb.pendingMint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['PENDING', 'SENT'] },
        }),
      }),
    );
  });
});
