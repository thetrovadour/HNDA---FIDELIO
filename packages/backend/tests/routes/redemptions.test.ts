import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { redemptionsRouter } from '../../src/routes/redemptions';

const JWT_SECRET = 'test-jwt-secret';

const mockRedemptionService = {
  createRequest: jest.fn(),
  approveRequest: jest.fn(),
  db: {
    redemptionRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
};

function createTestApp() {
  const app = express();
  app.use(express.json());
  process.env.JWT_SECRET = JWT_SECRET;
  app.use('/api/redemptions', redemptionsRouter(mockRedemptionService as any));
  return app;
}

const app = createTestApp();
const adminToken = jwt.sign({ sub: 'admin1', role: 'admin' }, JWT_SECRET);

beforeEach(() => {
  mockRedemptionService.createRequest.mockReset();
  mockRedemptionService.approveRequest.mockReset();
  mockRedemptionService.db.redemptionRequest.findUnique.mockReset();
  mockRedemptionService.db.redemptionRequest.findMany.mockReset();
  mockRedemptionService.db.redemptionRequest.update.mockReset();
});

describe('POST /api/redemptions', () => {
  it('returns 201 with correct tier assigned', async () => {
    mockRedemptionService.createRequest.mockResolvedValue({
      id: 'r1', merchant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', amount_catr: '30', tier: 'AUTO', status: 'PENDING_BURN',
    });

    const res = await request(app)
      .post('/api/redemptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ merchant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', amount_catr: '30' });

    expect(res.status).toBe(201);
    expect(res.body.data.tier).toBe('AUTO');
  });

  it('returns 400 with missing fields', async () => {
    const res = await request(app)
      .post('/api/redemptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ merchant_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/redemptions/:id/approve', () => {
  it('returns 401 without JWT', async () => {
    const res = await request(app)
      .patch('/api/redemptions/r1/approve');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/redemptions/:id', () => {
  it('returns 200 for valid id', async () => {
    mockRedemptionService.db.redemptionRequest.findUnique.mockResolvedValue({
      id: 'r1', status: 'PENDING_BURN',
    });

    const res = await request(app)
      .get('/api/redemptions/r1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('r1');
  });
});
