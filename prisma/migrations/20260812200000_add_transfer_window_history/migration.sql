-- CreateEnum
CREATE TYPE "TransferWindowAction" AS ENUM ('OPENED', 'CLOSED');

-- CreateTable
CREATE TABLE "TransferWindowHistory" (
    "id" TEXT NOT NULL,
    "previousIsOpen" BOOLEAN NOT NULL,
    "newIsOpen" BOOLEAN NOT NULL,
    "action" "TransferWindowAction" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferWindowHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferWindowHistory_createdAt_idx" ON "TransferWindowHistory"("createdAt");

-- CreateIndex
CREATE INDEX "TransferWindowHistory_changedByUserId_idx" ON "TransferWindowHistory"("changedByUserId");

-- AddForeignKey
ALTER TABLE "TransferWindowHistory" ADD CONSTRAINT "TransferWindowHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
