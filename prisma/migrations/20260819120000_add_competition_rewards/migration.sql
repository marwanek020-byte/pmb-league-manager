-- AlterEnum
ALTER TYPE "BudgetTransactionType" ADD VALUE 'COMPETITION_REWARD';

-- AlterTable
ALTER TABLE "ClubBudgetTransaction" ADD COLUMN "matchId" TEXT;

-- CreateIndex
CREATE INDEX "ClubBudgetTransaction_matchId_idx" ON "ClubBudgetTransaction"("matchId");

-- AddForeignKey
ALTER TABLE "ClubBudgetTransaction" ADD CONSTRAINT "ClubBudgetTransaction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
