-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "owner_user_id" TEXT;

-- CreateTable
CREATE TABLE "UserGoldStatus" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "active_from" TIMESTAMP(3) NOT NULL,
    "active_until" TIMESTAMP(3) NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGoldStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserGoldStatus_user_id_idx" ON "UserGoldStatus"("user_id");

-- CreateIndex
CREATE INDEX "UserGoldStatus_active_until_idx" ON "UserGoldStatus"("active_until");

-- CreateIndex
CREATE INDEX "Merchant_owner_user_id_idx" ON "Merchant"("owner_user_id");

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGoldStatus" ADD CONSTRAINT "UserGoldStatus_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
