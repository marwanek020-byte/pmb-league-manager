import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/services/standings-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId;
    let club = null;

    if (clubId) {
      club = await prisma.club.findUnique({
        where: { id: clubId },
        include: {
          league: { select: { id: true, name: true } },
        },
      });
    }

    // Fallback if not logged in or no club assigned
    if (!club) {
      club =
        (await prisma.club.findFirst({
          where: { name: { contains: "FAR Rabat" } },
          include: {
            league: { select: { id: true, name: true } },
          },
        })) ||
        (await prisma.club.findFirst({
          include: {
            league: { select: { id: true, name: true } },
          },
        }));
    }

    if (!club) {
      return NextResponse.json({ error: "No club or league found" }, { status: 404 });
    }

    // Find the most recent active (or latest) season for this club's league
    const activeSeason = await prisma.season.findFirst({
      where: { leagueId: club.leagueId, status: "ACTIVE" },
      include: {
        competitionSeason: true,
        _count: { select: { matches: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const latestSeason =
      activeSeason ??
      (await prisma.season.findFirst({
        where: { leagueId: club.leagueId },
        include: {
          competitionSeason: true,
          _count: { select: { matches: true } },
        },
        orderBy: { createdAt: "desc" },
      }));

    if (!latestSeason || latestSeason._count.matches === 0) {
      return NextResponse.json({
        hasActiveSeason: false,
        myClub: { id: club.id, name: club.name, logo: club.logo },
        leagueName: club.league?.name ?? "PMB League",
        seasonName: "No Active Season",
        standings: [],
        allMatches: [],
        totalMatchdays: 0,
      });
    }

    // Load all matches for this season
    const allMatchesRaw = await prisma.match.findMany({
      where: { seasonId: latestSeason.id },
      orderBy: [{ matchday: "asc" }, { createdAt: "asc" }],
      include: {
        homeClub: { select: { id: true, name: true, logo: true } },
        awayClub: { select: { id: true, name: true, logo: true } },
      },
    });

    // Load clubs for standings
    const leagueClubs = await prisma.club.findMany({
      where: { leagueId: club.leagueId },
      select: { id: true, name: true, logo: true },
      orderBy: { name: "asc" },
    });

    // Compute live standings
    const standings = computeStandings(allMatchesRaw, leagueClubs);

    const maxMatchday = allMatchesRaw.reduce(
      (max, m) => Math.max(max, m.matchday),
      0
    );

    const seasonName =
      latestSeason.competitionSeason?.name ?? latestSeason.name;

    const allMatches = allMatchesRaw.map((m) => ({
      id: m.id,
      matchday: m.matchday,
      homeClub: m.homeClub,
      awayClub: m.awayClub,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      status: m.status as "UPCOMING" | "COMPLETED",
    }));

    return NextResponse.json({
      hasActiveSeason: true,
      seasonId: latestSeason.id,
      myClub: {
        id: club.id,
        name: club.name,
        logo: club.logo,
      },
      leagueName: club.league?.name ?? "PMB League",
      seasonName,
      totalMatchdays: maxMatchday,
      standings,
      allMatches,
    });
  } catch (error) {
    console.error("Error fetching app competition data:", error);
    return NextResponse.json({ error: "Failed to load competition data" }, { status: 500 });
  }
}
