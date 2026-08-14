-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PlayerLoan" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fromClubId" TEXT NOT NULL,
    "toClubId" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerLoan_transferId_key" ON "PlayerLoan"("transferId");

-- CreateIndex
CREATE INDEX "PlayerLoan_playerId_idx" ON "PlayerLoan"("playerId");

-- CreateIndex
CREATE INDEX "PlayerLoan_fromClubId_idx" ON "PlayerLoan"("fromClubId");

-- CreateIndex
CREATE INDEX "PlayerLoan_toClubId_idx" ON "PlayerLoan"("toClubId");

-- CreateIndex
CREATE INDEX "PlayerLoan_status_idx" ON "PlayerLoan"("status");

-- CreateIndex
CREATE INDEX "PlayerLoan_endDate_idx" ON "PlayerLoan"("endDate");

-- AddForeignKey
ALTER TABLE "PlayerLoan" ADD CONSTRAINT "PlayerLoan_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerLoan" ADD CONSTRAINT "PlayerLoan_fromClubId_fkey" FOREIGN KEY ("fromClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerLoan" ADD CONSTRAINT "PlayerLoan_toClubId_fkey" FOREIGN KEY ("toClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerLoan" ADD CONSTRAINT "PlayerLoan_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

