import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/services/standings-service";

export const dynamic = "force-dynamic";

/**
 * Known city-based derby pairs (canonical club names → shared city key).
 * Any two clubs sharing the same city key are considered rivals for "derby" classification.
 */
const CITY_MAP: Record<string, string> = {
  "Raja Casablanca": "casablanca",
  "Wydad AC":        "casablanca",
  "FAR Rabat":       "rabat",
  "FUS Rabat":       "rabat",
  "Union Touarga":   "rabat",
  "Yacoub El Mansour": "rabat",
};

/**
 * Computes the economic importance tier for a match.
 *
 * Rules (in priority order):
 *  1. "derby"   — both clubs share the same city in CITY_MAP
 *  2. "decider" — the opponent is ranked in the top 3 of the current standings
 *  3. "regular" — all other matches
 */
function computeMatchTier(
  homeClubName: string,
  awayClubName: string,
  standings: { clubName: string; position: number }[]
): "regular" | "decider" | "derby" {
  // Derby check — shared city
  const homeCity = CITY_MAP[homeClubName];
  const awayCity = CITY_MAP[awayClubName];
  if (homeCity && awayCity && homeCity === awayCity) {
    return "derby";
  }

  // Top-3 opponent check
  const opponentRow = standings.find(
    (s) => s.clubName.toLowerCase() === awayClubName.toLowerCase()
  );
  if (opponentRow && opponentRow.position <= 3) {
    return "decider";
  }

  return "regular";
}

/**
 * GET /api/manager/next-home-match
 *
 * Returns the next upcoming home fixture for the authenticated manager's club,
 * along with the computed match importance tier (regular / decider / derby).
 *
 * Falls back to "FAR Rabat" if session has no clubId (dev/preview mode).
 */
export async function GET() {
  const session = await auth();

  try {
    // ── 1. RESOLVE CLUB ───────────────────────────────────────────────────────
    let clubId = session?.user?.clubId ?? null;
    let club = clubId
      ? await prisma.club.findUnique({
          where: { id: clubId },
          include: { league: { select: { id: true, name: true } } },
        })
      : null;

    // Dev/preview fallback — use FAR Rabat if no session club
    if (!club) {
      club =
        (await prisma.club.findFirst({
          where: { name: { contains: "FAR Rabat" } },
          include: { league: { select: { id: true, name: true } } },
        })) ??
        (await prisma.club.findFirst({
          include: { league: { select: { id: true, name: true } } },
        }));
    }

    if (!club) {
      return NextResponse.json({ error: "No club found" }, { status: 404 });
    }

    // ── 2. RESOLVE SEASON ─────────────────────────────────────────────────────
    const activeSeason = await prisma.season.findFirst({
      where: { leagueId: club.leagueId, status: "ACTIVE" },
      include: { _count: { select: { matches: true } } },
      orderBy: { createdAt: "desc" },
    });
    const latestSeason =
      activeSeason ??
      (await prisma.season.findFirst({
        where: { leagueId: club.leagueId },
        include: { _count: { select: { matches: true } } },
        orderBy: { createdAt: "desc" },
      }));

    if (!latestSeason || latestSeason._count.matches === 0) {
      return NextResponse.json({ fixture: null, reason: "no_season" });
    }

    // ── 3. FIND NEXT HOME MATCH ───────────────────────────────────────────────
    // "Next home match" = lowest matchday UPCOMING fixture where homeClubId = club.id
    const nextHomeMatch = await prisma.match.findFirst({
      where: {
        seasonId:   latestSeason.id,
        homeClubId: club.id,
        status:     "UPCOMING",
      },
      orderBy: { matchday: "asc" },
      include: {
        homeClub: { select: { id: true, name: true, logo: true } },
        awayClub: { select: { id: true, name: true, logo: true } },
      },
    });

    if (!nextHomeMatch) {
      return NextResponse.json({ fixture: null, reason: "no_upcoming_home_match" });
    }

    // ── 4. COMPUTE STANDINGS FOR IMPORTANCE TIER ──────────────────────────────
    const allMatches = await prisma.match.findMany({
      where: { seasonId: latestSeason.id },
      select: {
        id: true, status: true, homeClubId: true, awayClubId: true,
        homeGoals: true, awayGoals: true, matchday: true, playedAt: true,
      },
    });
    const leagueClubs = await prisma.club.findMany({
      where: { leagueId: club.leagueId },
      select: { id: true, name: true, logo: true },
    });

    const standings = computeStandings(allMatches, leagueClubs);

    // ── 5. DETERMINE TIER ─────────────────────────────────────────────────────
    const tier = computeMatchTier(
      nextHomeMatch.homeClub.name,
      nextHomeMatch.awayClub.name,
      standings.map((s) => ({ clubName: s.clubName, position: s.position }))
    );

    // ── 6. RESPOND ────────────────────────────────────────────────────────────
    return NextResponse.json({
      fixture: {
        matchday:  nextHomeMatch.matchday,
        homeClub:  { id: nextHomeMatch.homeClub.id,  name: nextHomeMatch.homeClub.name,  logo: nextHomeMatch.homeClub.logo },
        awayClub:  { id: nextHomeMatch.awayClub.id,  name: nextHomeMatch.awayClub.name,  logo: nextHomeMatch.awayClub.logo },
        tier,
        seasonName: latestSeason.name,
      },
    });
  } catch (err) {
    console.error("[next-home-match] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
