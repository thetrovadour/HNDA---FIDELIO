-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('SAVINGS', 'CHECKING');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "notify_redemption_update" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payout_account_number" TEXT,
ADD COLUMN     "payout_account_type" "BankAccountType",
ADD COLUMN     "payout_bank" TEXT,
ADD COLUMN     "payout_crypto_address" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notify_milestone_near" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_points_received" BOOLEAN NOT NULL DEFAULT true;
