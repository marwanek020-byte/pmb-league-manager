import { Prisma, BudgetTransactionType } from "@prisma/client";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

type TxClient = Prisma.TransactionClient;

export const TOTW_PLAYER_REWARD = new Prisma.Decimal("500000"); // 500k EUR per TOTW player
export const POTW_PRIZE_REWARD  = new Prisma.Decimal("2000000"); // 2M EUR for Player of the Week

export type TotwRewardPlayerInput = {
  playerId: string;
  clubId: string;
  isMotm?: boolean;
};

/**
 * Apply competition budget rewards when Team of the Week is published:
 * 1. Reverse any previous TOTW rewards for this matchday (if re-publishing).
 * 2. Grant €500,000 to each player's club.
 * 3. Grant €2,000,000 bonus to the Player of the Week (POTW / MOTM) winning club.
 */
export async function applyTotwRewards(
  tx: TxClient,
  matchday: number,
  players: TotwRewardPlayerInput[],
  leagueId?: string,
  leagueName?: string
): Promise<void> {
  const leagueTag = leagueName ? `[${leagueName}] ` : "";
  const descPrefix = `${leagueTag}TOTW MD${matchday}:`;
  const legacyPrefix = `TOTW MD${matchday}:`;

  // ── Step 1: Find and reverse previous TOTW rewards for this matchday in THIS LEAGUE ONLY ───────
  // CRITICAL: We only reverse rewards for clubs in this league (club: { leagueId }),
  // ensuring Serie A never touches Botola Pro, La Liga, Premier League, etc.!
  const previousTxns = await tx.clubBudgetTransaction.findMany({
    where: {
      type: BudgetTransactionType.COMPETITION_REWARD,
      ...(leagueId ? { club: { leagueId } } : {}),
      OR: [
        { description: { startsWith: descPrefix } },
        { description: { startsWith: legacyPrefix } },
        { description: { contains: `TOTW MD${matchday}:` } },
      ],
    },
    select: { id: true, clubId: true, amount: true, description: true },
  });

  // Calculate NET balance paid to each club for this matchday
  // Summing positive rewards and past reversals prevents compounding negative deductions
  const netPaidByClub = new Map<string, Prisma.Decimal>();
  for (const prev of previousTxns) {
    const current = netPaidByClub.get(prev.clubId) ?? new Prisma.Decimal("0");
    netPaidByClub.set(prev.clubId, current.plus(prev.amount));
  }

  const reversalClubIds = [...netPaidByClub.keys()].sort();
  for (const clubId of reversalClubIds) {
    const netPaid = netPaidByClub.get(clubId)!;
    // If net balance paid is zero or negative, no money should be clawed back
    if (netPaid.lte(0)) continue;

    const reversalAmount = netPaid.negated();

    const currentBudget = await lockClubBudget(tx, clubId);
    await applyBudgetTransaction(tx, {
      clubId,
      amount: reversalAmount,
      currentBudget,
      type: BudgetTransactionType.COMPETITION_REWARD,
      description: `Reversed: ${descPrefix} Previous TOTW reward adjustment`,
    });
  }

  // ── Step 2: Identify Player of the Week (POTW) ────────────────────────────
  // Player marked as isMotm, or highest performer / first player in list
  const potw = players.find((p) => p.isMotm) || players[0];

  // ── Step 3: Apply new TOTW rewards to clubs in deterministic order ─────────
  const clubIds = [...new Set(players.map((p) => p.clubId))].sort();

  for (const clubId of clubIds) {
    const clubPlayers = players.filter((p) => p.clubId === clubId);

    for (const p of clubPlayers) {
      const isPotw = potw && potw.playerId === p.playerId;

      // Reward €500,000 for TOTW selection
      let currentBudget = await lockClubBudget(tx, clubId);
      currentBudget = await applyBudgetTransaction(tx, {
        clubId,
        amount: TOTW_PLAYER_REWARD,
        currentBudget,
        type: BudgetTransactionType.COMPETITION_REWARD,
        description: `${descPrefix} Selection Reward (€500k)`,
        playerId: p.playerId,
      });

      // Reward €2,000,000 for Player of the Week
      if (isPotw) {
        currentBudget = await lockClubBudget(tx, clubId);
        await applyBudgetTransaction(tx, {
          clubId,
          amount: POTW_PRIZE_REWARD,
          currentBudget,
          type: BudgetTransactionType.COMPETITION_REWARD,
          description: `${descPrefix} Player of the Week Prize (€2,000,000)`,
          playerId: p.playerId,
        });
      }
    }
  }
}
