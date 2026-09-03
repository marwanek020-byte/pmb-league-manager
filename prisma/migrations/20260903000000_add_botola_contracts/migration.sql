-- AlterTable: Add Botola Pro contract fields to Player model
ALTER TABLE "Player"
  ADD COLUMN "seasonSalary"        DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "primeSignature"      DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "contractSeasonsLeft" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "squadRole"           TEXT NOT NULL DEFAULT 'IMPORTANT',
  ADD COLUMN "releaseClause"       DECIMAL(14, 2),
  ADD COLUMN "contractSatisfaction" INTEGER NOT NULL DEFAULT 85,
  ADD COLUMN "lastNegotiatedAt"    TIMESTAMP(3);

-- AlterEnum: Add new budget transaction types
ALTER TYPE "BudgetTransactionType" ADD VALUE 'PRIME_DE_SIGNATURE';
ALTER TYPE "BudgetTransactionType" ADD VALUE 'SEASON_SALARY_PAYOUT';
ALTER TYPE "BudgetTransactionType" ADD VALUE 'RELEASE_CLAUSE_PAYOUT';
