-- AlterTable
ALTER TABLE "User" ADD COLUMN "blockedReason" TEXT;

-- Backfill legacy role values from previous enum shape.
UPDATE "User"
SET "role" = 'SELLER_VERIFIED'
WHERE "role" = 'SELLER';
