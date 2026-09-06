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

    // ── 6. CHECK FOR ACTIVE / APPROVED STADIUM RENTAL ─────────────────────────
    let overrideStadiumName: string | null = nextHomeMatch.overrideStadiumName ?? null;
    let rentedFromClubName: string | null = null;
    let venueCapacity: number | null = null;

    const BOTOLA_STADIUMS: Record<string, { stadium: string; capacity: number }> = {
      "Raja Casablanca":       { stadium: "Stade Mohammed V",            capacity: 45_891 },
      "Wydad AC":              { stadium: "Stade Mohammed V",            capacity: 45_891 },
      "FAR Rabat":             { stadium: "Complexe Sportif Prince Moulay Abdellah", capacity: 53_000 },
      "FUS Rabat":             { stadium: "Stade Moulay Hassan",         capacity: 22_000 },
      "Maghreb Fez":           { stadium: "Grand Stade de Fès",          capacity: 45_000 },
      "Berkane":               { stadium: "Stade Municipal de Berkane",  capacity: 15_000 },
      "IR Tanger":             { stadium: "Grand Stade de Tanger",       capacity: 65_000 },
      "Hassania Agadir":       { stadium: "Grand Stade d'Agadir",        capacity: 45_480 },
      "Olympique Safi":        { stadium: "Stade El Massira",            capacity: 15_000 },
      "Difaa El Jadidi":       { stadium: "Stade El Abdi",               capacity: 15_000 },
      "Kawkab Marrakech":      { stadium: "Grand Stade de Marrakech",    capacity: 45_240 },
      "COD Meknes":            { stadium: "Stade d'Honneur de Meknès",   capacity: 20_000 },
      "Renaissance Zemamra":   { stadium: "Stade Ahmed Choukri",         capacity: 12_000 },
      "Union Touarga":         { stadium: "Stade Al Madina",            capacity: 18_500 },
      "Dcheira":               { stadium: "Stade Ahmed Fana",            capacity: 12_000 },
      "Yacoub El Mansour":     { stadium: "Stade Municipal de rabat",    capacity: 18_000 },
    };

    // Check if there is an accepted & admin-approved rental offer for this club & matchday
    const approvedRental = await prisma.stadiumRentalOffer.findFirst({
      where: {
        fromClubId: club.id,
        matchday: nextHomeMatch.matchday,
        status: "ACCEPTED",
        adminApproved: true,
      },
      include: {
        toClub: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (approvedRental) {
      rentedFromClubName = approvedRental.toClub.name;
      const reg = BOTOLA_STADIUMS[approvedRental.toClub.name];
      const resolvedVenue = reg?.stadium ?? `Stade de ${approvedRental.toClub.name}`;
      overrideStadiumName = overrideStadiumName || resolvedVenue;
      venueCapacity = reg?.capacity ?? 45_000;

      // Ensure match in DB has overrideStadiumName populated
      if (!nextHomeMatch.overrideStadiumName) {
        await prisma.match.update({
          where: { id: nextHomeMatch.id },
          data: {
            overrideStadiumName: resolvedVenue,
            overrideHostClubId: approvedRental.toClubId,
          },
        }).catch(() => {});
      }
    } else if (overrideStadiumName) {
      if (nextHomeMatch.overrideHostClubId) {
        const hostClub = await prisma.club.findUnique({
          where: { id: nextHomeMatch.overrideHostClubId },
          select: { name: true },
        });
        if (hostClub) {
          rentedFromClubName = hostClub.name;
          const reg = BOTOLA_STADIUMS[hostClub.name];
          if (reg) venueCapacity = reg.capacity;
        }
      }
    }

    // ── 7. RESPOND ────────────────────────────────────────────────────────────
    return NextResponse.json({
      fixture: {
        id:                  nextHomeMatch.id,
        matchday:            nextHomeMatch.matchday,
        homeClub:            { id: nextHomeMatch.homeClub.id,  name: nextHomeMatch.homeClub.name,  logo: nextHomeMatch.homeClub.logo },
        awayClub:            { id: nextHomeMatch.awayClub.id,  name: nextHomeMatch.awayClub.name,  logo: nextHomeMatch.awayClub.logo },
        tier,
        seasonName:          latestSeason.name,
        overrideStadiumName: overrideStadiumName ?? null,
        isRelocated:         Boolean(overrideStadiumName),
        rentedFromClubName:  rentedFromClubName ?? null,
        venueCapacity:       venueCapacity ?? null,
      },
    });
  } catch (err) {
    console.error("[next-home-match] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
