import { PrismaClient, BudgetTransactionType, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function lockClubBudget(tx: Prisma.TransactionClient, clubId: string): Promise<Prisma.Decimal> {
  const rows = (await tx.$queryRaw(
    Prisma.sql`SELECT "budget" FROM "Club" WHERE "id" = ${clubId} FOR UPDATE`
  )) as { budget: string }[];
  const row = rows[0];
  if (!row) throw new Error("Club not found.");
  return new Prisma.Decimal(row.budget);
}

async function applyBudgetTransaction(tx: any, input: any) {
  const newBalance = input.currentBudget.plus(input.amount);
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
      playerId: input.playerId,
    },
  });
  return newBalance;
}

const TOTW_PLAYER_REWARD = new Prisma.Decimal("500000");
const POTW_PRIZE_REWARD = new Prisma.Decimal("2000000");

async function main() {
  const totws = await prisma.teamOfTheWeek.findMany({
    include: {
      season: { include: { league: true } },
      players: {
        include: {
          player: true,
          club: true,
        },
      },
    },
    orderBy: { matchday: "asc" },
  });

  console.log(`Found ${totws.length} TOTW records.`);

  for (const totw of totws) {
    const leagueName = totw.season?.league?.name || "";
    const leagueId = totw.leagueId || totw.season?.leagueId;
    const leagueTag = leagueName ? `[${leagueName}] ` : "";
    console.log(`\n=== Processing ${leagueTag}TOTW Matchday ${totw.matchday} ===`);

    await prisma.$transaction(
      async (tx) => {
        const descPrefix = `${leagueTag}TOTW MD${totw.matchday}:`;
        const legacyPrefix = `TOTW MD${totw.matchday}:`;

        // 1. Reverse previous TOTW rewards for this matchday in THIS LEAGUE ONLY
        const previousTxns = await tx.clubBudgetTransaction.findMany({
          where: {
            type: BudgetTransactionType.COMPETITION_REWARD,
            ...(leagueId ? { club: { leagueId } } : {}),
            OR: [
              { description: { startsWith: descPrefix } },
              { description: { startsWith: legacyPrefix } },
              { description: { contains: `TOTW MD${totw.matchday}:` } },
            ],
          },
          select: { id: true, clubId: true, amount: true, description: true },
        });

        const netPaidByClub = new Map<string, Prisma.Decimal>();
        for (const prev of previousTxns) {
          const current = netPaidByClub.get(prev.clubId) ?? new Prisma.Decimal("0");
          netPaidByClub.set(prev.clubId, current.plus(prev.amount));
        }

        const reversalClubIds = [...netPaidByClub.keys()].sort();
        for (const clubId of reversalClubIds) {
          const netPaid = netPaidByClub.get(clubId)!;
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

        // 2. Identify Player of the Week
        const potw = totw.players.find((p) => p.isMotm) || totw.players[0];
        console.log(`POTW for MD ${totw.matchday}:`, potw ? `${potw.player.fullName} (${potw.club.name})` : "None");

        // 3. Apply rewards
        const clubIds = [...new Set(totw.players.map((p) => p.clubId))].sort();

        for (const clubId of clubIds) {
          const clubPlayers = totw.players.filter((p) => p.clubId === clubId);
          const clubName = clubPlayers[0].club.name;
          console.log(`- Rewarding ${clubName} (${clubPlayers.length} players):`);

          for (const p of clubPlayers) {
            const isPotw = potw && potw.playerId === p.playerId;

            let currentBudget = await lockClubBudget(tx, clubId);
            currentBudget = await applyBudgetTransaction(tx, {
              clubId,
              amount: TOTW_PLAYER_REWARD,
              currentBudget,
              type: BudgetTransactionType.COMPETITION_REWARD,
              description: `${descPrefix} Selection Reward (€500k)`,
              playerId: p.playerId,
            });
            console.log(`  + €500k for ${p.player.fullName}`);

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
              console.log(`  + €2,000,000 POTW BONUS for ${p.player.fullName}`);
            }
          }
        }
      },
      { maxWait: 15000, timeout: 30000 }
    );
  }

  console.log("\n✅ ALL TOTW PRIZES HAVE BEEN APPLIED TO THE DATABASE!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
