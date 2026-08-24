import { Prisma, BudgetTransactionType } from "@prisma/client";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

type TxClient = Prisma.TransactionClient;

const WIN_REWARD  = new Prisma.Decimal("3000000");
const DRAW_REWARD = new Prisma.Decimal("500000");

/**
 * Apply (or re-apply after a result correction) the competition budget
 * rewards for a single match.
 *
 * Must be called inside an existing Prisma interactive transaction (`tx`).
 *
 * Steps:
 *  1. Find any existing COMPETITION_REWARD transactions linked to this match.
 *  2. Reverse each one (negate the amount) so the club budget is restored.
 *  3. Calculate the new rewards based on the updated score.
 *  4. Apply non-zero rewards as new budget transactions.
 *
 * Locking order: clubs are locked in ascending ID order to avoid deadlocks.
 */
/**
 * Completely reverse all budget rewards associated with a match.
 */
export async function reverseMatchRewards(
  tx: TxClient,
  matchId: string
): Promise<void> {
  const previousTxns = await tx.clubBudgetTransaction.findMany({
    where: { matchId, type: BudgetTransactionType.COMPETITION_REWARD },
    select: { id: true, clubId: true, amount: true },
  });

  const reversalByClub = new Map<string, Prisma.Decimal>();

  for (const prev of previousTxns) {
    const negated = new Prisma.Decimal(prev.amount.toString()).negated();
    const current = reversalByClub.get(prev.clubId) ?? new Prisma.Decimal("0");
    reversalByClub.set(prev.clubId, current.plus(negated));
  }

  const reversalClubIds = [...reversalByClub.keys()].sort();

  for (const clubId of reversalClubIds) {
    const reversalAmount = reversalByClub.get(clubId)!;
    if (reversalAmount.isZero()) continue;

    const currentBudget = await lockClubBudget(tx, clubId);
    await applyBudgetTransaction(tx, {
      clubId,
      amount: reversalAmount,
      currentBudget,
      type: BudgetTransactionType.COMPETITION_REWARD,
      description: "Reversed: Competition reward (match cancelled/reset)",
      matchId,
    });
  }
}

export async function applyMatchRewards(
  tx: TxClient,
  matchId: string,
  homeClubId: string,
  awayClubId: string,
  homeGoals: number,
  awayGoals: number,
): Promise<void> {
  // ── Step 1 & 2: reverse previous rewards ──────────────────────────────
  await reverseMatchRewards(tx, matchId);

  // ── Step 3: determine new rewards ─────────────────────────────────────
  let homeReward = new Prisma.Decimal("0");
  let awayReward = new Prisma.Decimal("0");

  if (homeGoals > awayGoals) {
    homeReward = WIN_REWARD;
  } else if (homeGoals === awayGoals) {
    homeReward = DRAW_REWARD;
    awayReward = DRAW_REWARD;
  } else {
    awayReward = WIN_REWARD;
  }

  // ── Step 4: apply new rewards ─────────────────────────────────────────
  // Lock in ascending club-ID order to prevent deadlocks.
  const rewardsToApply: { clubId: string; amount: Prisma.Decimal; label: string }[] = [];

  if (!homeReward.isZero()) {
    rewardsToApply.push({
      clubId: homeClubId,
      amount: homeReward,
      label: homeGoals > awayGoals ? "Competition reward: Win" : "Competition reward: Draw",
    });
  }

  if (!awayReward.isZero()) {
    rewardsToApply.push({
      clubId: awayClubId,
      amount: awayReward,
      label: awayGoals > homeGoals ? "Competition reward: Win" : "Competition reward: Draw",
    });
  }

  // Sort by club ID for consistent locking order.
  rewardsToApply.sort((a, b) => a.clubId.localeCompare(b.clubId));

  for (const reward of rewardsToApply) {
    const currentBudget = await lockClubBudget(tx, reward.clubId);
    await applyBudgetTransaction(tx, {
      clubId: reward.clubId,
      amount: reward.amount,
      currentBudget,
      type: BudgetTransactionType.COMPETITION_REWARD,
      description: reward.label,
      matchId,
    });
  }
}
