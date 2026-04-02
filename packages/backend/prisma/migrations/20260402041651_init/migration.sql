-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('MINT', 'SPEND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "PendingMintStatus" AS ENUM ('PENDING', 'SENT', 'MINTED', 'FAILED');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING_BURN', 'BURN_SUBMITTED', 'BURNED', 'LEMPIRAS_SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RedemptionTier" AS ENUM ('AUTO', 'ADMIN_APPROVAL', 'VAULT_OP');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('TX_5', 'TX_10', 'TX_25', 'CROSS_MERCHANT');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'TRIGGERED', 'PAID');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('QUEUED', 'AUTO_PROCESSING', 'PENDING_ADMIN', 'PENDING_VAULT_OP', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutTier" AS ENUM ('AUTO', 'ADMIN_APPROVAL', 'VAULT_OP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "catr_balance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount_catr" DECIMAL(36,18) NOT NULL,
    "amount_lempiras" DECIMAL(12,2),
    "reference_code" TEXT,
    "tx_hash" TEXT,
    "commission_catr" DECIMAL(36,18),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingMint" (
    "id" TEXT NOT NULL,
    "reference_code" TEXT NOT NULL,
    "client_wallet" TEXT NOT NULL,
    "amount_lempiras" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL,
    "status" "PendingMintStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "tx_hash" TEXT,
    "transaction_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingMint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedReference" (
    "reference_code" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "ProcessedReference_pkey" PRIMARY KEY ("reference_code")
);

-- CreateTable
CREATE TABLE "RedemptionRequest" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "amount_catr" DECIMAL(36,18) NOT NULL,
    "amount_lempiras" DECIMAL(12,2),
    "tier" "RedemptionTier" NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING_BURN',
    "burn_tx_hash" TEXT,
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedemptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardMilestone" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "amount_catr" DECIMAL(36,18) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "payout_queue_id" TEXT,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "RewardMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantVisit" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_id" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "reward_catr" DECIMAL(36,18),
    "payout_queue_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggered_at" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardPayoutQueue" (
    "id" TEXT NOT NULL,
    "recipient_wallet" TEXT NOT NULL,
    "amount_catr" DECIMAL(36,18) NOT NULL,
    "tier" "PayoutTier" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'QUEUED',
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "tx_hash" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardPayoutQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_user_id_key" ON "Wallet"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE INDEX "Wallet_address_idx" ON "Wallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_wallet_address_key" ON "Merchant"("wallet_address");

-- CreateIndex
CREATE INDEX "Merchant_wallet_address_idx" ON "Merchant"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_code_key" ON "Transaction"("reference_code");

-- CreateIndex
CREATE INDEX "Transaction_user_id_idx" ON "Transaction"("user_id");

-- CreateIndex
CREATE INDEX "Transaction_merchant_id_idx" ON "Transaction"("merchant_id");

-- CreateIndex
CREATE INDEX "Transaction_reference_code_idx" ON "Transaction"("reference_code");

-- CreateIndex
CREATE INDEX "Transaction_tx_hash_idx" ON "Transaction"("tx_hash");

-- CreateIndex
CREATE INDEX "Transaction_status_type_idx" ON "Transaction"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PendingMint_reference_code_key" ON "PendingMint"("reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "PendingMint_transaction_id_key" ON "PendingMint"("transaction_id");

-- CreateIndex
CREATE INDEX "PendingMint_status_idx" ON "PendingMint"("status");

-- CreateIndex
CREATE INDEX "PendingMint_created_at_idx" ON "PendingMint"("created_at");

-- CreateIndex
CREATE INDEX "PendingMint_reference_code_idx" ON "PendingMint"("reference_code");

-- CreateIndex
CREATE INDEX "ProcessedReference_processed_at_idx" ON "ProcessedReference"("processed_at");

-- CreateIndex
CREATE INDEX "RedemptionRequest_merchant_id_idx" ON "RedemptionRequest"("merchant_id");

-- CreateIndex
CREATE INDEX "RedemptionRequest_status_idx" ON "RedemptionRequest"("status");

-- CreateIndex
CREATE INDEX "RedemptionRequest_tier_idx" ON "RedemptionRequest"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "RewardMilestone_payout_queue_id_key" ON "RewardMilestone"("payout_queue_id");

-- CreateIndex
CREATE INDEX "RewardMilestone_user_id_idx" ON "RewardMilestone"("user_id");

-- CreateIndex
CREATE INDEX "RewardMilestone_status_idx" ON "RewardMilestone"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RewardMilestone_user_id_type_key" ON "RewardMilestone"("user_id", "type");

-- CreateIndex
CREATE INDEX "MerchantVisit_user_id_visited_at_idx" ON "MerchantVisit"("user_id", "visited_at");

-- CreateIndex
CREATE INDEX "MerchantVisit_user_id_merchant_id_idx" ON "MerchantVisit"("user_id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referred_id_key" ON "Referral"("referred_id");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_payout_queue_id_key" ON "Referral"("payout_queue_id");

-- CreateIndex
CREATE INDEX "Referral_referrer_id_idx" ON "Referral"("referrer_id");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "RewardPayoutQueue_status_idx" ON "RewardPayoutQueue"("status");

-- CreateIndex
CREATE INDEX "RewardPayoutQueue_tier_idx" ON "RewardPayoutQueue"("tier");

-- CreateIndex
CREATE INDEX "RewardPayoutQueue_recipient_wallet_idx" ON "RewardPayoutQueue"("recipient_wallet");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingMint" ADD CONSTRAINT "PendingMint_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionRequest" ADD CONSTRAINT "RedemptionRequest_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardMilestone" ADD CONSTRAINT "RewardMilestone_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardMilestone" ADD CONSTRAINT "RewardMilestone_payout_queue_id_fkey" FOREIGN KEY ("payout_queue_id") REFERENCES "RewardPayoutQueue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantVisit" ADD CONSTRAINT "MerchantVisit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantVisit" ADD CONSTRAINT "MerchantVisit_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_payout_queue_id_fkey" FOREIGN KEY ("payout_queue_id") REFERENCES "RewardPayoutQueue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
