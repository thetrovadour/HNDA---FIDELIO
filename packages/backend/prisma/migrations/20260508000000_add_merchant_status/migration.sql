-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'DEACTIVATED');

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "active",
ADD COLUMN     "merchant_status" "MerchantStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
ADD COLUMN     "deactivation_reason" TEXT,
ADD COLUMN     "deactivated_at" TIMESTAMP(3),
ADD COLUMN     "deactivated_by" TEXT,
ADD COLUMN     "activation_checklist" JSONB;
