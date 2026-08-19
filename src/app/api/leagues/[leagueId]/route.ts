import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leagues/[leagueId]
// Public — no auth required
// Returns league details with clubs and active competition season if any
export async function GET(
  _req: Request,
  { params }: { params: { leagueId: string } }
) {
  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    include: {
      clubs: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, logo: true },
      },
    },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found." }, { status: 404 });
  }

  // Find the most relevant season (ACTIVE first, then most recent DRAFT, then latest FINISHED)
  const activeSeason = await prisma.season.findFirst({
    where: { leagueId: params.leagueId, status: "ACTIVE" },
    include: {
      competitionSeason: { select: { id: true, name: true, status: true, format: true } },
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestSeason =
    activeSeason ??
    (await prisma.season.findFirst({
      where: { leagueId: params.leagueId },
      include: {
        competitionSeason: { select: { id: true, name: true, status: true, format: true } },
        _count: { select: { matches: true } },
      },
      orderBy: { createdAt: "desc" },
    }));

  return NextResponse.json({
    league: {
      id: league.id,
      name: league.name,
      country: league.country,
      logo: league.logo,
      clubCount: league.clubs.length,
      clubs: league.clubs,
    },
    currentSeason: latestSeason
      ? {
          id: latestSeason.id,
          name: latestSeason.name,
          status: latestSeason.status,
          matchCount: latestSeason._count.matches,
          competitionSeason: latestSeason.competitionSeason,
        }
      : null,
  });
}
