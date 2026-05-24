import { PrismaClient, GameQuestionCategory, GameQuestionKind } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface SeedQuestion {
  id: string;
  category: GameQuestionCategory;
  tier: number;
  kind: GameQuestionKind;
  prompt_es: string;
  prompt_en: string;
  answers_es: string[];
  answers_en: string[];
  correct_index: number;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const jsonPath = path.join(__dirname, 'seed-questions.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const questions: SeedQuestion[] = JSON.parse(raw);

  console.log(`Seeding ${questions.length} game questions...`);

  for (const q of questions) {
    await db.gameQuestion.upsert({
      where: { id: q.id },
      update: {
        category: q.category,
        tier: q.tier,
        kind: q.kind,
        prompt_es: q.prompt_es,
        prompt_en: q.prompt_en,
        answers_es: q.answers_es,
        answers_en: q.answers_en,
        correct_index: q.correct_index,
        active: true,
      },
      create: {
        id: q.id,
        category: q.category,
        tier: q.tier,
        kind: q.kind,
        prompt_es: q.prompt_es,
        prompt_en: q.prompt_en,
        answers_es: q.answers_es,
        answers_en: q.answers_en,
        correct_index: q.correct_index,
        active: true,
      },
    });
  }

  const total = await db.gameQuestion.count();
  console.log(`✔ Seed complete. GameQuestion rows in DB: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
