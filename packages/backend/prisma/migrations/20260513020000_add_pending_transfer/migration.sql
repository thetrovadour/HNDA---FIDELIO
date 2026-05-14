CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

CREATE TABLE "PendingTransfer" (
    "id"              TEXT NOT NULL,
    "transaction_id"  TEXT NOT NULL,
    "from_wallet"     TEXT NOT NULL,
    "to_wallet"       TEXT NOT NULL,
    "amount_catr"     DECIMAL(36,18) NOT NULL,
    "status"          "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "tx_hash"         TEXT,
    "attempts"        INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "resolved_at"     TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingTransfer_transaction_id_key" ON "PendingTransfer"("transaction_id");
CREATE INDEX "PendingTransfer_status_idx" ON "PendingTransfer"("status");
CREATE INDEX "PendingTransfer_created_at_idx" ON "PendingTransfer"("created_at");

ALTER TABLE "PendingTransfer" ADD CONSTRAINT "PendingTransfer_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
