import mockDb, { resetMocks } from '../__mocks__/db';
import { QuestionService } from '../../src/services/question_service';

const service = new QuestionService(mockDb as any);

const q = (overrides: any = {}) => ({
  id: 'q1',
  category: 'RED',
  tier: 3,
  kind: 'MC',
  prompt_es: 'pregunta',
  prompt_en: 'question',
  answers_es: ['a', 'b', 'c', 'd'],
  answers_en: ['a', 'b', 'c', 'd'],
  correct_index: 2,
  active: true,
  ...overrides,
});

beforeEach(() => {
  resetMocks();
  mockDb.questionServe.findMany.mockResolvedValue([]);
  mockDb.questionServe.create.mockResolvedValue({});
});

describe('QuestionService.fetchNext', () => {
  it('returns an unseen question and marks it served', async () => {
    mockDb.gameQuestion.findMany.mockResolvedValue([q()]);

    const result = await service.fetchNext({
      playerId: 'p1', category: 'RED', tier: 3, kind: 'MC', lang: 'en', wildcard: false,
    });

    expect(result.id).toBe('q1');
    expect(result.prompt).toBe('question');
    expect(result.correctIndex).toBe(2);
    expect(mockDb.questionServe.create).toHaveBeenCalledWith({
      data: { player_id: 'p1', question_id: 'q1' },
    });
  });

  it('localizes to es when lang=es', async () => {
    mockDb.gameQuestion.findMany.mockResolvedValue([q()]);
    const result = await service.fetchNext({
      playerId: 'p1', category: 'RED', tier: 3, kind: 'MC', lang: 'es', wildcard: false,
    });
    expect(result.prompt).toBe('pregunta');
  });

  it('falls back to oldest-served when all questions are seen (controlled repeat)', async () => {
    const q1 = q({ id: 'q1' });
    const q2 = q({ id: 'q2' });
    mockDb.gameQuestion.findMany.mockResolvedValue([q1, q2]);
    mockDb.questionServe.findMany.mockResolvedValue([
      { question_id: 'q1', served_at: new Date('2026-01-01') },
      { question_id: 'q2', served_at: new Date('2026-02-01') },
    ]);

    const result = await service.fetchNext({
      playerId: 'p1', category: 'RED', tier: 3, kind: 'MC', lang: 'en', wildcard: false,
    });

    expect(result.id).toBe('q1');
    expect(mockDb.questionServe.create).toHaveBeenCalledWith({
      data: { player_id: 'p1', question_id: 'q1' },
    });
  });

  it('throws when bucket is truly empty (no questions match filter)', async () => {
    mockDb.gameQuestion.findMany.mockResolvedValue([]);
    await expect(service.fetchNext({
      playerId: 'p1', category: 'BLUE', tier: 5, kind: 'MC', lang: 'en', wildcard: false,
    })).rejects.toThrow('No questions available for this filter');
  });

  it('wildcard ignores category, forces tier=5, returns isWildcard=true', async () => {
    mockDb.gameQuestion.findMany.mockResolvedValue([q({ tier: 5 })]);

    const result = await service.fetchNext({
      playerId: 'p1', category: 'RED', tier: 1, kind: 'ANY', lang: 'en', wildcard: true,
    });

    expect(result.isWildcard).toBe(true);
    const callArgs = mockDb.gameQuestion.findMany.mock.calls[0][0];
    expect(callArgs.where.tier).toBe(5);
    expect(['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE']).toContain(callArgs.where.category);
  });

  it('kind=ANY omits kind from filter', async () => {
    mockDb.gameQuestion.findMany.mockResolvedValue([q()]);
    await service.fetchNext({
      playerId: 'p1', category: 'RED', tier: 3, kind: 'ANY', lang: 'en', wildcard: false,
    });
    const callArgs = mockDb.gameQuestion.findMany.mock.calls[0][0];
    expect(callArgs.where.kind).toBeUndefined();
  });

  it('kind=TF applies the kind filter', async () => {
    mockDb.gameQuestion.findMany.mockResolvedValue([q({ kind: 'TF' })]);
    await service.fetchNext({
      playerId: 'p1', category: 'RED', tier: 3, kind: 'TF', lang: 'en', wildcard: false,
    });
    const callArgs = mockDb.gameQuestion.findMany.mock.calls[0][0];
    expect(callArgs.where.kind).toBe('TF');
  });
});

describe('QuestionService.resolve', () => {
  it('updates was_correct on the most recent unresolved serve', async () => {
    mockDb.questionServe.findFirst.mockResolvedValue({ id: 'serve1' });
    mockDb.questionServe.update.mockResolvedValue({});

    await service.resolve({ playerId: 'p1', questionId: 'q1', wasCorrect: true });

    expect(mockDb.questionServe.update).toHaveBeenCalledWith({
      where: { id: 'serve1' },
      data: { was_correct: true },
    });
  });

  it('throws when no unresolved serve exists', async () => {
    mockDb.questionServe.findFirst.mockResolvedValue(null);
    await expect(service.resolve({
      playerId: 'p1', questionId: 'q1', wasCorrect: true,
    })).rejects.toThrow('No unresolved serve found for this question');
  });
});
