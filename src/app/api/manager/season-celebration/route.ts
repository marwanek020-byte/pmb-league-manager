import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ hasCelebration: false });
  }

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    include: { league: true },
  });

  if (!club) {
    return NextResponse.json({ hasCelebration: false });
  }

  // Find the latest finished season in this club's league
  const finishedSeason = await prisma.season.findFirst({
    where: {
      leagueId: club.leagueId,
      status: "FINISHED",
    },
    include: {
      competitionSeason: true,
      classifications: {
        where: { clubId: club.id },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!finishedSeason || finishedSeason.classifications.length === 0) {
    return NextResponse.json({ hasCelebration: false });
  }

  const classification = finishedSeason.classifications[0];
  const isChampion = classification.position === 1;

  // Fetch recent competition rewards for this club
  const rewardTransactions = await prisma.clubBudgetTransaction.findMany({
    where: {
      clubId: club.id,
      type: "COMPETITION_REWARD",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Filter rewards matching this season
  const seasonRewards = rewardTransactions.filter((tx) =>
    tx.description?.includes(finishedSeason.name)
  );

  const totalPrize = seasonRewards.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0
  );

  const standingReward = seasonRewards.find((tx) =>
    tx.description?.includes("Standing Prize")
  );

  const individualRewards = seasonRewards
    .filter((tx) => tx.description?.includes("Award:"))
    .map((tx) => ({
      description: tx.description ?? "Individual Award",
      amount: Number(tx.amount),
    }));

  return NextResponse.json({
    hasCelebration: true,
    seasonId: finishedSeason.id,
    seasonName: finishedSeason.competitionSeason?.name ?? finishedSeason.name,
    leagueName: club.league.name,
    isChampion,
    clubName: club.name,
    clubLogo: club.logo,
    position: classification.position,
    points: classification.points,
    standingsPrize: standingReward ? Number(standingReward.amount) : 0,
    individualAwards: individualRewards,
    totalPrize: totalPrize > 0 ? totalPrize : (isChampion ? 150_000_000 : 0),
    currentBudget: Number(club.budget),
  });
}
