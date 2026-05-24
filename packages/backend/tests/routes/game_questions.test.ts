import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { gameQuestionsRouter } from '../../src/routes/game_questions';
import { QuestionService } from '../../src/services/question_service';

const JWT_SECRET = 'test-jwt-secret';
process.env.JWT_SECRET = JWT_SECRET;

const fetchNextMock = jest.fn();
const resolveMock = jest.fn();

const fakeService = {
  fetchNext: fetchNextMock,
  resolve: resolveMock,
} as unknown as QuestionService;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/game/questions', gameQuestionsRouter(fakeService));
  return app;
}

const app = createTestApp();
const userToken = jwt.sign({ id: 'p1', role: 'user' }, JWT_SECRET);

beforeEach(() => {
  fetchNextMock.mockReset();
  resolveMock.mockReset();
});

describe('POST /api/game/questions/next', () => {
  const validBody = {
    category: 'RED', tier: 3, kind: 'MC', lang: 'en', wildcard: false,
  };

  it('200 — returns a question on happy path', async () => {
    fetchNextMock.mockResolvedValue({
      id: 'q1', prompt: 'question', answers: ['a', 'b', 'c', 'd'],
      correctIndex: 2, kind: 'MC', category: 'RED', tier: 3, isWildcard: false,
    });

    const res = await request(app)
      .post('/api/game/questions/next')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('q1');
    expect(fetchNextMock).toHaveBeenCalledWith(expect.objectContaining({ playerId: 'p1' }));
  });

  it('401 — without auth', async () => {
    const res = await request(app).post('/api/game/questions/next').send(validBody);
    expect(res.status).toBe(401);
  });

  it('400 — validation error on invalid tier', async () => {
    const res = await request(app)
      .post('/api/game/questions/next')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validBody, tier: 99 });
    expect(res.status).toBe(400);
  });

  it('404 — when service throws "no questions available"', async () => {
    fetchNextMock.mockRejectedValue(new Error('No questions available for this filter'));
    const res = await request(app)
      .post('/api/game/questions/next')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it('derives playerId from auth token, ignores any body playerId attempt', async () => {
    fetchNextMock.mockResolvedValue({
      id: 'q1', prompt: 'q', answers: [], correctIndex: 0,
      kind: 'MC', category: 'RED', tier: 3, isWildcard: false,
    });
    await request(app)
      .post('/api/game/questions/next')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validBody, playerId: 'attacker' });
    expect(fetchNextMock).toHaveBeenCalledWith(expect.objectContaining({ playerId: 'p1' }));
  });
});

describe('POST /api/game/questions/resolve', () => {
  it('200 — resolves a question', async () => {
    resolveMock.mockResolvedValue(undefined);
    const res = await request(app)
      .post('/api/game/questions/resolve')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '11111111-1111-4111-8111-111111111111', wasCorrect: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ok: true });
  });

  it('404 — when serve not found', async () => {
    resolveMock.mockRejectedValue(new Error('No unresolved serve found for this question'));
    const res = await request(app)
      .post('/api/game/questions/resolve')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '11111111-1111-4111-8111-111111111111', wasCorrect: false });
    expect(res.status).toBe(404);
  });

  it('400 — validation error on bad UUID', async () => {
    const res = await request(app)
      .post('/api/game/questions/resolve')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: 'not-a-uuid', wasCorrect: true });
    expect(res.status).toBe(400);
  });
});
