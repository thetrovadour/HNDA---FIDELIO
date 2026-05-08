import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { merchantsRouter } from '../../src/routes/merchants';

const JWT_SECRET = 'test-jwt-secret';

// Mock db
jest.mock('../../src/db', () => require('../__mocks__/db').default);
import mockDb from '../__mocks__/db';
import { resetMocks } from '../__mocks__/db';

// Mock gca_service
jest.mock('../../src/services/gca_service', () => ({
  initGcaAllocation: jest.fn().mockResolvedValue(undefined),
}));

// Mock merchant_activation_service
jest.mock('../../src/services/merchant_activation_service', () => ({
  checkAndActivate: jest.fn().mockResolvedValue(undefined),
  deactivateMerchant: jest.fn().mockResolvedValue(undefined),
}));

import { checkAndActivate, deactivateMerchant } from '../../src/services/merchant_activation_service';

const mockCheckAndActivate = checkAndActivate as jest.MockedFunction<typeof checkAndActivate>;
const mockDeactivateMerchant = deactivateMerchant as jest.MockedFunction<typeof deactivateMerchant>;

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
  app.use('/api/merchants', merchantsRouter(mockRedemptionService as any));
  return app;
}

const app = createTestApp();
const adminToken = jwt.sign({ sub: 'admin1', role: 'admin' }, JWT_SECRET);
const merchantToken = (merchantId: string) =>
  jwt.sign({ sub: 'user1', role: 'merchant', merchant_id: merchantId, user_id: 'user1' }, JWT_SECRET);

beforeEach(() => {
  resetMocks();
  mockCheckAndActivate.mockReset();
  mockDeactivateMerchant.mockReset();
  mockRedemptionService.createRequest.mockReset();
});

// ── Auto-activation ──────────────────────────────────────────────────────────

describe('POST /api/merchants (auto-activation)', () => {
  it('calls checkAndActivate after merchant creation', async () => {
    const merchant = {
      id: 'merchant-1',
      name: 'Shop A',
      category: 'retail',
      wallet_address: '0xabc',
      contact_email: 'shop@a.com',
      merchant_status: 'PENDING_ACTIVATION',
    };
    mockDb.merchant.create.mockResolvedValue(merchant);
    mockCheckAndActivate.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/merchants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Shop A',
        category: 'retail',
        wallet_address: '0xabc',
        contact_email: 'shop@a.com',
      });

    expect(res.status).toBe(201);
    expect(mockCheckAndActivate).toHaveBeenCalledWith(expect.anything(), 'merchant-1');
  });

  it('does not activate when checkAndActivate is not triggered for incomplete checklist', async () => {
    // Simulate: checkAndActivate is a no-op (merchant stays PENDING_ACTIVATION)
    const merchant = {
      id: 'merchant-2',
      name: 'Shop B',
      category: 'retail',
      wallet_address: null,
      contact_email: 'shop@b.com',
      merchant_status: 'PENDING_ACTIVATION',
    };
    mockDb.merchant.create.mockResolvedValue(merchant);
    mockCheckAndActivate.mockResolvedValue(undefined);

    // Create with missing wallet_address — schema requires it so use PATCH path instead
    // We test that checkAndActivate was called but didn't change the status (no-op)
    mockDb.merchant.update.mockResolvedValue({ ...merchant, name: 'Shop B Updated' });

    const res = await request(app)
      .patch('/api/merchants/merchant-2')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Shop B Updated' });

    expect(res.status).toBe(200);
    expect(mockCheckAndActivate).toHaveBeenCalledWith(expect.anything(), 'merchant-2');
    // Merchant stays PENDING_ACTIVATION since checkAndActivate is mocked (no-op in unit test)
    expect(res.body.data.merchant_status).toBe('PENDING_ACTIVATION');
  });
});

// ── PATCH /:id/deactivate ────────────────────────────────────────────────────

describe('PATCH /api/merchants/:id/deactivate', () => {
  it('requires reason in body', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({ id: 'm1', merchant_status: 'ACTIVE' });

    const res = await request(app)
      .patch('/api/merchants/m1/deactivate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('deactivates merchant with reason', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({ id: 'm1', merchant_status: 'ACTIVE' });
    mockDeactivateMerchant.mockResolvedValue(undefined);

    const res = await request(app)
      .patch('/api/merchants/m1/deactivate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Policy violation' });

    expect(res.status).toBe(200);
    expect(mockDeactivateMerchant).toHaveBeenCalledWith(
      expect.anything(),
      'm1',
      'Policy violation',
      'admin1',
    );
    expect(res.body.data.success).toBe(true);
  });

  it('returns 401 without admin token', async () => {
    const res = await request(app)
      .patch('/api/merchants/m1/deactivate')
      .send({ reason: 'test' });

    expect(res.status).toBe(401);
  });

  it('returns 404 if merchant not found', async () => {
    mockDb.merchant.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/merchants/nonexistent/deactivate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Gone' });

    expect(res.status).toBe(404);
  });
});

// ── POST /:id/redemptions guard ──────────────────────────────────────────────

describe('POST /api/merchants/:id/redemptions (active guard)', () => {
  it('blocks redemption when merchant is PENDING_ACTIVATION', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({
      id: 'm1',
      merchant_status: 'PENDING_ACTIVATION',
    });

    const res = await request(app)
      .post('/api/merchants/m1/redemptions')
      .set('Authorization', `Bearer ${merchantToken('m1')}`)
      .send({ amount_catr: '10' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MERCHANT_NOT_ACTIVE');
  });

  it('blocks redemption when merchant is DEACTIVATED', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({
      id: 'm1',
      merchant_status: 'DEACTIVATED',
    });

    const res = await request(app)
      .post('/api/merchants/m1/redemptions')
      .set('Authorization', `Bearer ${merchantToken('m1')}`)
      .send({ amount_catr: '10' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MERCHANT_NOT_ACTIVE');
  });

  it('allows redemption when merchant is ACTIVE', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({
      id: 'm1',
      merchant_status: 'ACTIVE',
    });
    mockRedemptionService.createRequest.mockResolvedValue({
      id: 'r1', merchant_id: 'm1', amount_catr: '10', tier: 'AUTO', status: 'PENDING_BURN',
    });

    const res = await request(app)
      .post('/api/merchants/m1/redemptions')
      .set('Authorization', `Bearer ${merchantToken('m1')}`)
      .send({ amount_catr: '10' });

    expect(res.status).toBe(201);
  });
});

// ── GET /:id/status ──────────────────────────────────────────────────────────

describe('GET /api/merchants/:id/status', () => {
  it('returns merchant status fields', async () => {
    mockDb.merchant.findUnique.mockResolvedValue({
      merchant_status: 'ACTIVE',
      deactivation_reason: null,
      activation_checklist: { wallet_address: true, contact_email: true, category: true, name: true, owner_user_id: true },
    });

    const res = await request(app)
      .get('/api/merchants/m1/status')
      .set('Authorization', `Bearer ${merchantToken('m1')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.merchant_status).toBe('ACTIVE');
  });

  it('returns 404 if not found', async () => {
    mockDb.merchant.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/merchants/nonexistent/status')
      .set('Authorization', `Bearer ${merchantToken('nonexistent')}`);

    expect(res.status).toBe(404);
  });
});
