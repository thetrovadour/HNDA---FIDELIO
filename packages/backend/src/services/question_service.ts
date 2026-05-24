import { PrismaClient, GameQuestion, GameQuestionCategory, GameQuestionKind } from '@prisma/client';

export type QuestionLang = 'es' | 'en';
export type QuestionKindFilter = GameQuestionKind | 'ANY';

export interface FetchNextParams {
  playerId: string;
  category: GameQuestionCategory;
  tier: number;
  kind: QuestionKindFilter;
  lang: QuestionLang;
  wildcard: boolean;
}

export interface ResolveParams {
  playerId: string;
  questionId: string;
  wasCorrect: boolean;
}

export interface QuestionResponse {
  id: string;
  prompt: string;
  answers: unknown;
  correctIndex: number;
  kind: GameQuestionKind;
  category: GameQuestionCategory;
  tier: number;
  isWildcard: boolean;
}

const WILDCARD_CATEGORIES: GameQuestionCategory[] = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE'];

export class QuestionService {
  constructor(private db: PrismaClient) {}

  async fetchNext(params: FetchNextParams): Promise<QuestionResponse> {
    const effectiveCategory = params.wildcard ? this.pickWildcardCategory() : params.category;
    const effectiveTier = params.wildcard ? 5 : params.tier;

    const filter: { category: GameQuestionCategory; tier: number; active: true; kind?: GameQuestionKind } = {
      category: effectiveCategory,
      tier: effectiveTier,
      active: true,
    };
    if (params.kind !== 'ANY') filter.kind = params.kind;

    const allMatching = await this.db.gameQuestion.findMany({ where: filter });
    if (allMatching.length === 0) {
      throw new Error('No questions available for this filter');
    }

    const serves = await this.db.questionServe.findMany({
      where: {
        player_id: params.playerId,
        question_id: { in: allMatching.map((q) => q.id) },
      },
      orderBy: { served_at: 'asc' },
    });

    const servedIds = new Set(serves.map((s) => s.question_id));
    const unseen = allMatching.filter((q) => !servedIds.has(q.id));

    let chosen: GameQuestion;
    if (unseen.length > 0) {
      chosen = unseen[Math.floor(Math.random() * unseen.length)];
    } else {
      const oldestServedId = serves[0].question_id;
      chosen = allMatching.find((q) => q.id === oldestServedId)!;
    }

    await this.db.questionServe.create({
      data: { player_id: params.playerId, question_id: chosen.id },
    });

    return {
      id: chosen.id,
      prompt: params.lang === 'es' ? chosen.prompt_es : chosen.prompt_en,
      answers: params.lang === 'es' ? chosen.answers_es : chosen.answers_en,
      correctIndex: chosen.correct_index,
      kind: chosen.kind,
      category: chosen.category,
      tier: chosen.tier,
      isWildcard: params.wildcard,
    };
  }

  async resolve(params: ResolveParams): Promise<void> {
    const serve = await this.db.questionServe.findFirst({
      where: {
        player_id: params.playerId,
        question_id: params.questionId,
        was_correct: null,
      },
      orderBy: { served_at: 'desc' },
    });
    if (!serve) {
      throw new Error('No unresolved serve found for this question');
    }
    await this.db.questionServe.update({
      where: { id: serve.id },
      data: { was_correct: params.wasCorrect },
    });
  }

  private pickWildcardCategory(): GameQuestionCategory {
    return WILDCARD_CATEGORIES[Math.floor(Math.random() * WILDCARD_CATEGORIES.length)];
  }
}
