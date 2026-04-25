import request from 'supertest';
import express from 'express';
import { bridgeEventsRouter } from '../../src/routes/bridge_events';
import { bridgeAuth } from '../../src/middleware/auth';

const BRIDGE_SECRET = 'test-secret';

const mockMintService = {
  receivePaymentEvent: jest.fn(),
  confirmMint: jest.fn(),
};

const mockRedemptionService = {
  processRedemption: jest.fn(),
};

function createTestApp() {
  const app = express();
  app.use(express.json());
  process.env.BRIDGE_SECRET = BRIDGE_SECRET;
  app.use('/internal/bridge', bridgeAuth, bridgeEventsRouter(mockMintService as any, mockRedemptionService as any));
  return app;
}

const app = createTestApp();

const validPayment = {
  reference_code: 'CATR-0xABCD-1234',
  amount_lempiras: 500,
  client_wallet: '0xABCD1234',
  source: 'EMAIL',
  received_at: 1711800000,
};

beforeEach(() => {
  mockMintService.receivePaymentEvent.mockReset();
  mockMintService.confirmMint.mockReset();
});

describe('POST /internal/bridge/payment-received', () => {
  it('returns 200 ACK with valid body and correct secret', async () => {
    mockMintService.receivePaymentEvent.mockResolvedValue({ status: 'ACK', reference_code: validPayment.reference_code });

    const res = await request(app)
      .post('/internal/bridge/payment-received')
      .set('x-bridge-secret', BRIDGE_SECRET)
      .send(validPayment);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACK');
  });

  it('returns 401 with missing secret', async () => {
    const res = await request(app)
      .post('/internal/bridge/payment-received')
      .send(validPayment);

    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid body (missing fields)', async () => {
    const res = await request(app)
      .post('/internal/bridge/payment-received')
      .set('x-bridge-secret', BRIDGE_SECRET)
      .send({ reference_code: 'CATR-1' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when MintService returns NACK', async () => {
    mockMintService.receivePaymentEvent.mockResolvedValue({
      status: 'NACK', reference_code: validPayment.reference_code, reason: 'Duplicate',
    });

    const res = await request(app)
      .post('/internal/bridge/payment-received')
      .set('x-bridge-secret', BRIDGE_SECRET)
      .send(validPayment);

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('NACK');
  });
});

describe('POST /internal/bridge/mint-confirmed', () => {
  it('returns 200 with valid body', async () => {
    mockMintService.confirmMint.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/internal/bridge/mint-confirmed')
      .set('x-bridge-secret', BRIDGE_SECRET)
      .send({ reference_code: 'CATR-1', tx_hash: '0xhash' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns 404 when confirmMint throws', async () => {
    mockMintService.confirmMint.mockRejectedValue(new Error('Not found'));

    const res = await request(app)
      .post('/internal/bridge/mint-confirmed')
      .set('x-bridge-secret', BRIDGE_SECRET)
      .send({ reference_code: 'CATR-1', tx_hash: '0xhash' });

    expect(res.status).toBe(404);
  });
});
