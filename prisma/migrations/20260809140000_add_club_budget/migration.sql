-- Migration: add_club_budget
--
-- Adds a budget to every club and a permanent, append-only transaction
-- ledger explaining every change to it. Nothing existing is altered:
-- no column is dropped or renamed, and no other table is touched.
--
-- IMPORTANT - existing data behavior: "Club" already has rows (112 seeded
-- clubs, or however many exist in your database). Adding "budget" as
-- NOT NULL with a DEFAULT means Postgres backfills every existing row
-- with that default value automatically as part of this ALTER TABLE -
-- this is a deliberate, one-time initial budget grant for clubs that
-- didn't have a budget concept before, not an overwrite of any existing
-- financial data (none existed). It only ever runs once, at migration
-- time; every future INSERT that omits "budget" also gets this default,
-- but nothing UPDATEs an existing club's budget as part of this file.

-- CreateEnum
CREATE TYPE "BudgetTransactionType" AS ENUM ('TRANSFER_IN', 'TRANSFER_OUT', 'ADMIN_ADJUSTMENT');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "budget" DECIMAL(14,2) NOT NULL DEFAULT 100000000;

-- CreateTable
CREATE TABLE "ClubBudgetTransaction" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "type" "BudgetTransactionType" NOT NULL,
    "description" TEXT,
    "transferId" TEXT,
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubBudgetTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubBudgetTransaction_clubId_idx" ON "ClubBudgetTransaction"("clubId");

-- CreateIndex
CREATE INDEX "ClubBudgetTransaction_clubId_createdAt_idx" ON "ClubBudgetTransaction"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "ClubBudgetTransaction_transferId_idx" ON "ClubBudgetTransaction"("transferId");

-- AddForeignKey
ALTER TABLE "ClubBudgetTransaction" ADD CONSTRAINT "ClubBudgetTransaction_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubBudgetTransaction" ADD CONSTRAINT "ClubBudgetTransaction_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubBudgetTransaction" ADD CONSTRAINT "ClubBudgetTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
