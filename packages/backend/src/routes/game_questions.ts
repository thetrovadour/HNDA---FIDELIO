import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { userAuth } from '../middleware/auth';
import { QuestionService } from '../services/question_service';

const NextSchema = z.object({
  category: z.enum(['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE']),
  tier: z.number().int().min(1).max(5),
  kind: z.enum(['MC', 'TF', 'ANY']),
  lang: z.enum(['es', 'en']),
  wildcard: z.boolean().optional().default(false),
});

const ResolveSchema = z.object({
  questionId: z.string().uuid(),
  wasCorrect: z.boolean(),
});

export function gameQuestionsRouter(service: QuestionService): Router {
  const router = Router();

  router.post('/next', userAuth, validate(NextSchema), async (req: Request, res: Response) => {
    try {
      const question = await service.fetchNext({
        playerId: req.user!.id,
        category: req.body.category,
        tier: req.body.tier,
        kind: req.body.kind,
        lang: req.body.lang,
        wildcard: req.body.wildcard,
      });
      res.status(200).json({ data: question });
    } catch (err: any) {
      res.status(404).json({ error: err.message, code: 'NOT_FOUND' });
    }
  });

  router.post('/resolve', userAuth, validate(ResolveSchema), async (req: Request, res: Response) => {
    try {
      await service.resolve({
        playerId: req.user!.id,
        questionId: req.body.questionId,
        wasCorrect: req.body.wasCorrect,
      });
      res.status(200).json({ data: { ok: true } });
    } catch (err: any) {
      res.status(404).json({ error: err.message, code: 'NOT_FOUND' });
    }
  });

  return router;
}
