import { Prisma, BudgetTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient;

export type BudgetServiceErrorCode = "CLUB_NOT_FOUND" | "INSUFFICIENT_BUDGET" | "INVALID_AMOUNT" | "FORBIDDEN";

export class BudgetServiceError extends Error {
  code: BudgetServiceErrorCode;

  constructor(code: BudgetServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "BudgetServiceError";
  }
}

/**
 * Reads a club's current budget. Plain read, no transaction needed - for
 * money-moving operations, see applyBudgetTransaction() below instead,
 * which locks the row.
 */
export async function getClubBudget(clubId: string): Promise<Prisma.Decimal> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { budget: true } });
  if (!club) throw new BudgetServiceError("CLUB_NOT_FOUND", "Club not found.");
  return club.budget;
}

export type BudgetHistoryPage = {
  transactions: Awaited<ReturnType<typeof prisma.clubBudgetTransaction.findMany>>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getBudgetHistory(clubId: string, page: number, pageSize: number): Promise<BudgetHistoryPage> {
  const [total, transactions] = await Promise.all([
    prisma.clubBudgetTransaction.count({ where: { clubId } }),
    prisma.clubBudgetTransaction.findMany({
      where: { clubId },
      include: {
        player: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    transactions,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Locks a club row FOR UPDATE and returns its current budget as a real
 * Decimal (never a JS number - raw SQL returns NUMERIC columns as
 * strings, which this wraps in Prisma.Decimal for safe arithmetic).
 * Exported so transfer-service.ts can lock buyer and seller together in a
 * caller-chosen, deadlock-safe order alongside its own Transfer/Player
 * locks, all in one transaction.
 */
export async function lockClubBudget(tx: TxClient, clubId: string): Promise<Prisma.Decimal> {
  const rows = await tx.$queryRaw<{ budget: string }[]>(
    Prisma.sql`SELECT "budget" FROM "Club" WHERE "id" = ${clubId} FOR UPDATE`
  );
  const row = rows[0];
  if (!row) throw new BudgetServiceError("CLUB_NOT_FOUND", "Club not found.");
  return new Prisma.Decimal(row.budget);
}

export type ApplyBudgetTransactionInput = {
  clubId: string;
  /** Positive = credit (money in), negative = debit (money out). Never zero. */
  amount: Prisma.Decimal;
  currentBudget: Prisma.Decimal;
  type: BudgetTransactionType;
  description?: string;
  transferId?: string;
  playerId?: string;
};

/**
 * Writes the new Club.budget AND the corresponding ClubBudgetTransaction
 * row together. Caller must already hold a row lock on the club (via
 * lockClubBudget, in the same `tx`) and pass that locked value in as
 * `currentBudget` - this function does not re-read or re-lock, so it can
 * be composed cleanly into a larger transaction (like completeTransfer's)
 * that already did the locking for its own reasons.
 *
 * Refuses to let a debit push the budget below zero.
 */
export async function applyBudgetTransaction(tx: TxClient, input: ApplyBudgetTransactionInput) {
  if (input.amount.isZero()) {
    throw new BudgetServiceError("INVALID_AMOUNT", "Budget transaction amount cannot be zero.");
  }

  const newBalance = input.currentBudget.plus(input.amount);

  if (newBalance.isNegative()) {
    throw new BudgetServiceError("INSUFFICIENT_BUDGET", "This club does not have enough budget for this transaction.");
  }

  await tx.club.update({
    where: { id: input.clubId },
    data: { budget: newBalance },
  });

  await tx.clubBudgetTransaction.create({
    data: {
      clubId: input.clubId,
      amount: input.amount,
      balanceAfter: newBalance,
      type: input.type,
      description: input.description,
      transferId: input.transferId,
      playerId: input.playerId,
    },
  });

  return newBalance;
}
export type AdminBudgetAction = "INITIAL" | "ADD" | "DECREASE";

export type AdjustClubBudgetInput = {
  clubId: string;
  action: AdminBudgetAction;
  amount: Prisma.Decimal;
  reason: string;
};

export async function adjustClubBudget(input: AdjustClubBudgetInput) {
  return prisma.$transaction(async (tx) => {
    if (
      !input.amount.isFinite() ||
      input.amount.isNegative() ||
      input.amount.isZero()
    ) {
      throw new BudgetServiceError(
        "INVALID_AMOUNT",
        "Budget amount must be greater than zero."
      );
    }

    const reason = input.reason.trim();

    if (!reason) {
      throw new BudgetServiceError(
        "INVALID_AMOUNT",
        "A reason is required for this budget adjustment."
      );
    }

    const currentBudget = await lockClubBudget(tx, input.clubId);

    if (input.action === "INITIAL") {
      const existingInitialAdjustment =
        await tx.clubBudgetTransaction.findFirst({
          where: {
            clubId: input.clubId,
            type: BudgetTransactionType.ADMIN_ADJUSTMENT,
            description: { startsWith: "Initial budget" },
          },
          select: { id: true },
        });

      if (existingInitialAdjustment) {
        throw new BudgetServiceError(
          "INVALID_AMOUNT",
          "This club's initial budget has already been set."
        );
      }

      const difference = input.amount.minus(currentBudget);

      if (difference.isZero()) {
        throw new BudgetServiceError(
          "INVALID_AMOUNT",
          "The initial budget is already set to this amount."
        );
      }

      return applyBudgetTransaction(tx, {
        clubId: input.clubId,
        amount: difference,
        currentBudget,
        type: BudgetTransactionType.ADMIN_ADJUSTMENT,
        description: `Initial budget: ${reason}`,
      });
    }

    const adjustment =
      input.action === "ADD"
        ? input.amount
        : input.amount.negated();

    return applyBudgetTransaction(tx, {
      clubId: input.clubId,
      amount: adjustment,
      currentBudget,
      type: BudgetTransactionType.ADMIN_ADJUSTMENT,
      description: reason,
    });
  });
}