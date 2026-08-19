import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/services/standings-service";

// GET /api/seasons/[seasonId]/standings
// Public — no auth required
// Returns live standings computed from match results
export async function GET(
  _req: Request,
  { params }: { params: { seasonId: string } }
) {
  const season = await prisma.season.findUnique({
    where: { id: params.seasonId },
    include: {
      league: {
        include: {
          clubs: { select: { id: true, name: true, logo: true } },
        },
      },
    },
  });

  if (!season) {
    return NextResponse.json({ error: "Season not found." }, { status: 404 });
  }

  const matches = await prisma.match.findMany({
    where: { seasonId: params.seasonId },
    select: {
      id: true,
      status: true,
      homeClubId: true,
      awayClubId: true,
      homeGoals: true,
      awayGoals: true,
      matchday: true,
      playedAt: true,
    },
  });

  const standings = computeStandings(matches, season.league.clubs);

  return NextResponse.json({
    seasonId: season.id,
    seasonName: season.name,
    leagueId: season.leagueId,
    leagueName: season.league.name,
    standings,
  });
}
