CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "MerchantApplication" (
    "id"               TEXT NOT NULL,
    "business_name"    TEXT NOT NULL,
    "category"         TEXT NOT NULL,
    "contact_name"     TEXT NOT NULL,
    "contact_email"    TEXT NOT NULL,
    "contact_phone"    TEXT NOT NULL,
    "notes"            TEXT,
    "status"           "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by"      TEXT,
    "reviewed_at"      TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MerchantApplication_status_idx" ON "MerchantApplication"("status");
CREATE INDEX "MerchantApplication_created_at_idx" ON "MerchantApplication"("created_at");
