-- Migration: update_transfer_status_type_and_snapshot_fields
--
-- Scope: Transfer table and its two enums only. Nothing else in the
-- schema is touched.
--
-- ASSUMPTION: the Transfer table currently has zero rows. This is safe to
-- assume because the transfer service (the only code that would ever
-- create a Transfer) has not been built yet - the previous migration only
-- added the table. If your database already has Transfer rows, do NOT run
-- this as-is: the value-mapping CASE below and the NOT NULL columns added
-- without defaults will need real backfill data first.

-- ================================================================
-- 1. TransferType: purely additive, safe with existing rows either way.
-- ================================================================
ALTER TYPE "TransferType" ADD VALUE IF NOT EXISTS 'SWAP';
ALTER TYPE "TransferType" ADD VALUE IF NOT EXISTS 'FREE_TRANSFER';

-- ================================================================
-- 2. TransferStatus: replacing the value set, not just adding to it.
--    Postgres can't remove/rename enum values in place, so we swap the
--    type: create the new enum, migrate the column across with an
--    explicit value mapping, then drop the old type.
-- ================================================================

-- CreateEnum (new shape)
CREATE TYPE "TransferStatus_new" AS ENUM ('PENDING_SELLER_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- Drop the old default before changing the column's type.
ALTER TABLE "Transfer" ALTER COLUMN "status" DROP DEFAULT;

-- Migrate the column to the new enum, mapping old values to their new
-- equivalents. PENDING -> PENDING_SELLER_APPROVAL, ACCEPTED -> APPROVED;
-- COMPLETED, REJECTED, CANCELLED are unchanged.
ALTER TABLE "Transfer"
  ALTER COLUMN "status" TYPE "TransferStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'PENDING_SELLER_APPROVAL'
      WHEN 'ACCEPTED' THEN 'APPROVED'
      ELSE "status"::text
    END
  )::"TransferStatus_new";

-- Swap the type names so the column's type is once again "TransferStatus".
DROP TYPE "TransferStatus";
ALTER TYPE "TransferStatus_new" RENAME TO "TransferStatus";

-- Restore the default, pointed at the new equivalent of the old PENDING.
ALTER TABLE "Transfer" ALTER COLUMN "status" SET DEFAULT 'PENDING_SELLER_APPROVAL';

-- ================================================================
-- 3. New immutable snapshot columns on Transfer.
-- ================================================================
ALTER TABLE "Transfer" ADD COLUMN "season" TEXT NOT NULL;
ALTER TABLE "Transfer" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "Transfer" ADD COLUMN "notes" TEXT;
ALTER TABLE "Transfer" ADD COLUMN "playerName" TEXT NOT NULL;
ALTER TABLE "Transfer" ADD COLUMN "fromClubName" TEXT NOT NULL;
ALTER TABLE "Transfer" ADD COLUMN "toClubName" TEXT NOT NULL;
