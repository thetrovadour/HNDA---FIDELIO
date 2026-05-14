-- Add username to User (nullable first so we can backfill)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill from email prefix (lowercase, replace special chars with underscore)
UPDATE "User" SET "username" = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9_]', '_', 'g'));

-- Make NOT NULL and unique
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Add username to MerchantApplication (nullable for existing rows)
ALTER TABLE "MerchantApplication" ADD COLUMN "username" TEXT;
