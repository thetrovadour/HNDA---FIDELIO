-- CreateEnum
CREATE TYPE "GcaTransactionType" AS ENUM ('GIFT', 'VEST', 'TRADE_OUT', 'TRADE_IN', 'REDEEM');

-- CreateEnum
CREATE TYPE "GcaRedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "MerchantGcaAllocation" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "gca_balance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "lifetime_effective_catr" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "milestones_claimed" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantGcaAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GcaTransaction" (
    "id" TEXT NOT NULL,
    "allocation_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "type" "GcaTransactionType" NOT NULL,
    "amount_gca" DECIMAL(20,4) NOT NULL,
    "counterpart_merchant_id" TEXT,
    "catr_paid" DECIMAL(36,18),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GcaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GcaRedemptionRequest" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "amount_gca" DECIMAL(20,4) NOT NULL,
    "price_floor_hnl" DECIMAL(12,4) NOT NULL,
    "amount_hnl_estimated" DECIMAL(12,2) NOT NULL,
    "status" "GcaRedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GcaRedemptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GcaPriceFloor" (
    "id" TEXT NOT NULL,
    "price_hnl" DECIMAL(12,4) NOT NULL,
    "set_by" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GcaPriceFloor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantGcaAllocation_merchant_id_key" ON "MerchantGcaAllocation"("merchant_id");

-- CreateIndex
CREATE INDEX "MerchantGcaAllocation_merchant_id_idx" ON "MerchantGcaAllocation"("merchant_id");

-- CreateIndex
CREATE INDEX "GcaTransaction_merchant_id_idx" ON "GcaTransaction"("merchant_id");

-- CreateIndex
CREATE INDEX "GcaTransaction_allocation_id_idx" ON "GcaTransaction"("allocation_id");

-- CreateIndex
CREATE INDEX "GcaTransaction_type_idx" ON "GcaTransaction"("type");

-- CreateIndex
CREATE INDEX "GcaRedemptionRequest_merchant_id_idx" ON "GcaRedemptionRequest"("merchant_id");

-- CreateIndex
CREATE INDEX "GcaRedemptionRequest_status_idx" ON "GcaRedemptionRequest"("status");

-- CreateIndex
CREATE INDEX "GcaPriceFloor_active_idx" ON "GcaPriceFloor"("active");

-- AddForeignKey
ALTER TABLE "MerchantGcaAllocation" ADD CONSTRAINT "MerchantGcaAllocation_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GcaTransaction" ADD CONSTRAINT "GcaTransaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GcaTransaction" ADD CONSTRAINT "GcaTransaction_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "MerchantGcaAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GcaRedemptionRequest" ADD CONSTRAINT "GcaRedemptionRequest_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
