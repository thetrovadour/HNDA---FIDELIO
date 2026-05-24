-- CreateEnum
CREATE TYPE "GameQuestionCategory" AS ENUM ('RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE');

-- CreateEnum
CREATE TYPE "GameQuestionKind" AS ENUM ('MC', 'TF');

-- CreateTable
CREATE TABLE "GameQuestion" (
    "id" TEXT NOT NULL,
    "category" "GameQuestionCategory" NOT NULL,
    "tier" INTEGER NOT NULL,
    "kind" "GameQuestionKind" NOT NULL,
    "prompt_es" TEXT NOT NULL,
    "prompt_en" TEXT NOT NULL,
    "answers_es" JSONB NOT NULL,
    "answers_en" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionServe" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "served_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "was_correct" BOOLEAN,

    CONSTRAINT "QuestionServe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameQuestion_category_tier_active_idx" ON "GameQuestion"("category", "tier", "active");

-- CreateIndex
CREATE INDEX "GameQuestion_active_idx" ON "GameQuestion"("active");

-- CreateIndex
CREATE INDEX "QuestionServe_player_id_question_id_idx" ON "QuestionServe"("player_id", "question_id");

-- CreateIndex
CREATE INDEX "QuestionServe_player_id_served_at_idx" ON "QuestionServe"("player_id", "served_at");

-- AddForeignKey
ALTER TABLE "QuestionServe" ADD CONSTRAINT "QuestionServe_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionServe" ADD CONSTRAINT "QuestionServe_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "GameQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
