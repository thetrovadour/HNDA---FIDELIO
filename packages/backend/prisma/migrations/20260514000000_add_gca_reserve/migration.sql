-- CreateTable
CREATE TABLE "GcaReserve" (
    "id" TEXT NOT NULL,
    "balance_hnl" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GcaReserve_pkey" PRIMARY KEY ("id")
);

-- Seed the single reserve row
INSERT INTO "GcaReserve" ("id", "balance_hnl", "updated_at") VALUES ('gca-reserve-singleton', 0, NOW());
