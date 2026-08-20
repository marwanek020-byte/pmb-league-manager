import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

// GET /api/admin/totw?seasonId=xxx&matchday=N
// Returns candidates & existing TOTW for that matchday
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const matchdayParam = searchParams.get("matchday");
  const matchday = matchdayParam ? parseInt(matchdayParam, 10) : 1;

  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }

  try {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        league: { select: { id: true, name: true, logo: true } },
        competitionSeason: { select: { id: true } },
      },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // Existing TOTW for this matchday
    const existingTotw = await prisma.teamOfTheWeek.findFirst({
      where: {
        seasonId,
        matchday,
      },
      include: {
        players: {
          include: {
            player: true,
            club: true,
          },
        },
      },
    });

    // Fetch matchday completed matches with events and MOTM
    const matches = await prisma.match.findMany({
      where: {
        seasonId,
        matchday,
        status: "COMPLETED",
      },
      include: {
        manOfTheMatch: true,
        homeClub: {
          include: {
            players: true,
          },
        },
        awayClub: {
          include: {
            players: true,
          },
        },
        events: {
          include: {
            player: true,
            assistPlayer: true,
          },
        },
      },
    });

    // Compute candidate performers for this matchday
    type Candidate = {
      playerId: string;
      fullName: string;
      photo: string | null;
      position: string;
      overallRating: number | null;
      clubId: string;
      clubName: string;
      clubLogo: string | null;
      goals: number;
      assists: number;
      isMotm: boolean;
      cleanSheet: boolean;
      score: number;
    };

    const candidateMap = new Map<string, Candidate>();

    function getOrCreateCandidate(
      p: { id: string; fullName: string; photo: string | null; position: string; overallRating: number | null },
      club: { id: string; name: string; logo: string | null }
    ): Candidate {
      let cand = candidateMap.get(p.id);
      if (!cand) {
        cand = {
          playerId: p.id,
          fullName: p.fullName,
          photo: p.photo,
          position: p.position,
          overallRating: p.overallRating,
          clubId: club.id,
          clubName: club.name,
          clubLogo: club.logo,
          goals: 0,
          assists: 0,
          isMotm: false,
          cleanSheet: false,
          score: 0,
        };
        candidateMap.set(p.id, cand);
      }
      return cand;
    }

    for (const match of matches) {
      if (match.manOfTheMatch) {
        const club =
          match.manOfTheMatch.pmbClubId === match.homeClubId
            ? match.homeClub
            : match.awayClub;
        const cand = getOrCreateCandidate(match.manOfTheMatch, club);
        cand.isMotm = true;
      }

      for (const ev of match.events) {
        if (ev.type === "GOAL" && ev.player) {
          const club = ev.clubId === match.homeClubId ? match.homeClub : match.awayClub;
          const cand = getOrCreateCandidate(ev.player, club);
          cand.goals += 1;
        }
        if (ev.assistPlayer) {
          const club = ev.clubId === match.homeClubId ? match.homeClub : match.awayClub;
          const cand = getOrCreateCandidate(ev.assistPlayer, club);
          cand.assists += 1;
        }
      }

      if (match.homeGoals === 0 && match.awayClub.players) {
        const gk = match.awayClub.players.find((p) => p.position === "GK");
        if (gk) {
          const cand = getOrCreateCandidate(gk, match.awayClub);
          cand.cleanSheet = true;
        }
      }

      if (match.awayGoals === 0 && match.homeClub.players) {
        const gk = match.homeClub.players.find((p) => p.position === "GK");
        if (gk) {
          const cand = getOrCreateCandidate(gk, match.homeClub);
          cand.cleanSheet = true;
        }
      }
    }

    // Calculate score
    const candidates = Array.from(candidateMap.values()).map((c) => ({
      ...c,
      score:
        c.goals * 4 +
        c.assists * 3 +
        (c.cleanSheet ? 3 : 0) +
        (c.isMotm ? 5 : 0) +
        (c.overallRating || 75) * 0.05,
    }));

    candidates.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      season,
      matchday,
      existingTotw,
      candidates,
    });
  } catch (error) {
    console.error("Error fetching admin TOTW:", error);
    return NextResponse.json({ error: "Failed to fetch admin TOTW" }, { status: 500 });
  }
}

// POST /api/admin/totw
// Publish or update TOTW
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      competitionSeasonId,
      seasonId,
      leagueId,
      matchday,
      formation = "4-3-3",
      players, // Array of 11: { playerId, clubId, position, ratingBoost, goalsInMatchday, assistsInMatchday, isMotm }
    } = body;

    if (!seasonId || !matchday || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const compSeasonId =
      competitionSeasonId ||
      (await prisma.season.findUnique({ where: { id: seasonId } }))?.competitionSeasonId;

    if (!compSeasonId) {
      return NextResponse.json({ error: "Competition season ID not found" }, { status: 400 });
    }

    // Upsert TeamOfTheWeek
    const totw = await prisma.$transaction(async (tx) => {
      // Delete existing for this matchday if any
      const existing = await tx.teamOfTheWeek.findFirst({
        where: {
          seasonId,
          matchday,
        },
      });

      if (existing) {
        await tx.totwPlayer.deleteMany({ where: { totwId: existing.id } });
        await tx.teamOfTheWeek.delete({ where: { id: existing.id } });
      }

      const created = await tx.teamOfTheWeek.create({
        data: {
          competitionSeasonId: compSeasonId,
          seasonId,
          leagueId,
          matchday,
          formation,
          isPublished: true,
          players: {
            create: players.map((p: any) => ({
              playerId: p.playerId,
              clubId: p.clubId,
              position: p.position,
              ratingBoost: p.ratingBoost || 2,
              goalsInMatchday: p.goalsInMatchday || 0,
              assistsInMatchday: p.assistsInMatchday || 0,
              isMotm: p.isMotm || false,
            })),
          },
        },
        include: {
          players: {
            include: {
              player: true,
              club: true,
            },
          },
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, totw });
  } catch (error) {
    console.error("Error saving TOTW:", error);
    return NextResponse.json({ error: "Failed to save TOTW" }, { status: 500 });
  }
}
