import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { rewardsRouter } from '../../src/routes/rewards';

const JWT_SECRET = 'test-jwt-secret';

// Mock the db module used directly by rewards.ts
jest.mock('../../src/db', () => ({
  __esModule: true,
  default: {
    rewardPayoutQueue: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    rewardMilestone: {
      findMany: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
    },
  },
}));

import db from '../../src/db';

const mockDb = db as jest.Mocked<typeof db> & {
  rewardPayoutQueue: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    aggregate: jest.Mock;
  };
  rewardMilestone: { findMany: jest.Mock };
  transaction: { aggregate: jest.Mock };
};

function createTestApp() {
  const app = express();
  app.use(express.json());
  process.env.JWT_SECRET = JWT_SECRET;
  app.use('/api/rewards', rewardsRouter());
  return app;
}

const app = createTestApp();
const adminToken = jwt.sign({ sub: 'admin1', role: 'admin' }, JWT_SECRET);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PATCH /api/rewards/queue/:id/approve', () => {
  it('returns 404 when payout entry does not exist', async () => {
    (mockDb.rewardPayoutQueue.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/rewards/queue/nonexistent/approve')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 and marks PAID when pool is solvent', async () => {
    (mockDb.rewardPayoutQueue.findUnique as jest.Mock).mockResolvedValue({
      id: 'pq1', amount_catr: '1', status: 'QUEUED',
    });
    // Pool inflow: 10,000 CATR commission × 35% = 3,500 CATR
    (mockDb.transaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { commission_catr: '10000' },
    });
    // Paid out so far: 0
    (mockDb.rewardPayoutQueue.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount_catr: '0' },
    });
    (mockDb.rewardPayoutQueue.update as jest.Mock).mockResolvedValue({
      id: 'pq1', status: 'PAID',
    });

    const res = await request(app)
      .patch('/api/rewards/queue/pq1/approve')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PAID');
  });

  it('returns 402 and marks DEFERRED when payout would breach reserve floor', async () => {
    (mockDb.rewardPayoutQueue.findUnique as jest.Mock).mockResolvedValue({
      id: 'pq2', amount_catr: '1000', status: 'QUEUED',
    });
    // Pool inflow: 100 CATR commission × 35% = 35 CATR in pool
    (mockDb.transaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { commission_catr: '100' },
    });
    // Paid out: 30 CATR → pool balance = 35 - 30 = 5 CATR
    // Payout of 1000 would bring balance to -995, well below 15% floor (0.75 CATR)
    (mockDb.rewardPayoutQueue.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount_catr: '30' },
    });
    (mockDb.rewardPayoutQueue.update as jest.Mock).mockResolvedValue({
      id: 'pq2', status: 'DEFERRED',
    });

    const res = await request(app)
      .patch('/api/rewards/queue/pq2/approve')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('POOL_INSUFFICIENT');
    expect(res.body.data.status).toBe('DEFERRED');
    expect(mockDb.rewardPayoutQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DEFERRED' }) }),
    );
  });

  it('returns 401 without JWT', async () => {
    const res = await request(app)
      .patch('/api/rewards/queue/pq1/approve');

    expect(res.status).toBe(401);
  });
});
