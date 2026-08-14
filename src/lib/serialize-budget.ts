import { ClubBudgetTransaction, BudgetTransactionType } from "@prisma/client";

export type BudgetTransactionDTO = {
  id: string;
  amount: string;
  balanceAfter: string;
  type: BudgetTransactionType;
  description: string | null;
  transferId: string | null;
  playerId: string | null;
  playerName: string | null;
  createdAt: string;
};

export function serializeBudgetTransaction(
  txn: ClubBudgetTransaction & { player?: { fullName: string } | null }
): BudgetTransactionDTO {
  return {
    id: txn.id,
    // .toFixed(2) on a Prisma.Decimal, not Number(...) - avoids any
    // float round-trip for a value that's about to be shown as money.
    amount: txn.amount.toFixed(2),
    balanceAfter: txn.balanceAfter.toFixed(2),
    type: txn.type,
    description: txn.description,
    transferId: txn.transferId,
    playerId: txn.playerId,
    playerName: txn.player?.fullName ?? null,
    createdAt: txn.createdAt.toISOString(),
  };
}
