-- CreateEnum
CREATE TYPE "GcaApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "GcaApplication" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "status" "GcaApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GcaApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GcaApplication_merchant_id_idx" ON "GcaApplication"("merchant_id");

-- CreateIndex
CREATE INDEX "GcaApplication_status_idx" ON "GcaApplication"("status");

-- AddForeignKey
ALTER TABLE "GcaApplication" ADD CONSTRAINT "GcaApplication_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
