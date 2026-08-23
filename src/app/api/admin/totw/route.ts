import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

type Candidate = {
  playerId: string;
  fullName: string;
  photo: string | null;
  position: string;
  normalizedGroup: "GK" | "DEF" | "MID" | "FWD";
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

function normalizePosition(rawPos: string | null | undefined): {
  normalizedGroup: "GK" | "DEF" | "MID" | "FWD";
  normalizedPos: string;
} {
  const pos = (rawPos || "CMF").toUpperCase().trim();
  if (pos === "GK" || pos === "GOALKEEPER") {
    return { normalizedGroup: "GK", normalizedPos: "GK" };
  }
  if (["CB", "LB", "RB", "DF", "LWB", "RWB", "SW", "DEFENDER"].includes(pos)) {
    const p = ["LB", "RB", "CB"].includes(pos) ? pos : "CB";
    return { normalizedGroup: "DEF", normalizedPos: p };
  }
  if (["DMF", "CMF", "AMF", "LMF", "RMF", "MF", "MIDFIELDER", "DM", "CM", "AM", "LM", "RM"].includes(pos)) {
    const p = ["DMF", "CMF", "AMF", "LMF", "RMF"].includes(pos) ? pos : "CMF";
    return { normalizedGroup: "MID", normalizedPos: p };
  }
  return {
    normalizedGroup: "FWD",
    normalizedPos: ["CF", "SS", "LWF", "RWF"].includes(pos) ? pos : "CF",
  };
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

    const candidateMap = new Map<string, Candidate>();

    function getOrCreateCandidate(
      p: { id: string; fullName: string; photo: string | null; position: string; overallRating: number | null },
      club: { id: string; name: string; logo: string | null }
    ): Candidate {
      let cand = candidateMap.get(p.id);
      if (!cand) {
        const { normalizedGroup, normalizedPos } = normalizePosition(p.position);
        cand = {
          playerId: p.id,
          fullName: p.fullName,
          photo: p.photo,
          position: normalizedPos,
          normalizedGroup,
          overallRating: p.overallRating || 76,
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

    // 1. Process all completed matches and register participating club players
    for (const match of matches) {
      const homeGoals = match.homeGoals ?? 0;
      const awayGoals = match.awayGoals ?? 0;
      const homeCleanSheet = awayGoals === 0;
      const awayCleanSheet = homeGoals === 0;
      const homeWon = homeGoals > awayGoals;
      const awayWon = awayGoals > homeGoals;
      const isDraw = homeGoals === awayGoals;

      // Include all players from Home Club
      if (match.homeClub?.players) {
        for (const p of match.homeClub.players) {
          const cand = getOrCreateCandidate(p, match.homeClub);
          if (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF") {
            if (homeCleanSheet) cand.cleanSheet = true;
          }
          // Match result points
          if (homeWon) cand.score += 2.5;
          else if (isDraw) cand.score += 1.0;

          if (homeCleanSheet && (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF")) {
            cand.score += 5.0;
          } else if (awayGoals === 1 && (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF")) {
            cand.score += 2.0;
          }
        }
      }

      // Include all players from Away Club
      if (match.awayClub?.players) {
        for (const p of match.awayClub.players) {
          const cand = getOrCreateCandidate(p, match.awayClub);
          if (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF") {
            if (awayCleanSheet) cand.cleanSheet = true;
          }
          // Match result points
          if (awayWon) cand.score += 2.5;
          else if (isDraw) cand.score += 1.0;

          if (awayCleanSheet && (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF")) {
            cand.score += 5.0;
          } else if (homeGoals === 1 && (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF")) {
            cand.score += 2.0;
          }
        }
      }

      // 2. Mark Man of the Match
      if (match.manOfTheMatch) {
        const club =
          match.manOfTheMatch.pmbClubId === match.homeClubId
            ? match.homeClub
            : match.awayClub;
        const cand = getOrCreateCandidate(match.manOfTheMatch, club);
        cand.isMotm = true;
        cand.score += 6.0;
      }

      // 3. Process Events (Goals & Assists)
      for (const ev of match.events) {
        if (ev.type === "GOAL" && ev.player) {
          const club = ev.clubId === match.homeClubId ? match.homeClub : match.awayClub;
          const cand = getOrCreateCandidate(ev.player, club);
          cand.goals += 1;
          cand.score += cand.normalizedGroup === "DEF" ? 6.0 : 4.5;
        }
        if (ev.assistPlayer) {
          const club = ev.clubId === match.homeClubId ? match.homeClub : match.awayClub;
          const cand = getOrCreateCandidate(ev.assistPlayer, club);
          cand.assists += 1;
          cand.score += cand.normalizedGroup === "DEF" ? 4.5 : 3.5;
        }
      }
    }

    // 4. Finalize candidate score with player overall rating
    const candidates = Array.from(candidateMap.values()).map((c) => ({
      ...c,
      score:
        c.score +
        ((c.overallRating || 76) - 65) * 0.35 +
        (c.goals * 4) +
        (c.assists * 3) +
        (c.isMotm ? 5 : 0) +
        (c.cleanSheet ? 3 : 0),
    }));

    candidates.sort((a, b) => b.score - a.score);

    // 5. Generate guaranteed 11 unique players for standard 4-3-3 formation
    const gks = candidates.filter((c) => c.normalizedGroup === "GK");
    const defs = candidates.filter((c) => c.normalizedGroup === "DEF");
    const mids = candidates.filter((c) => c.normalizedGroup === "MID");
    const fwds = candidates.filter((c) => c.normalizedGroup === "FWD");

    const lbs = defs.filter((c) => c.position === "LB");
    const cbs = defs.filter((c) => c.position === "CB");
    const rbs = defs.filter((c) => c.position === "RB");

    const dmfs = mids.filter((c) => c.position === "DMF");
    const cmfs = mids.filter((c) => c.position === "CMF");
    const amfs = mids.filter((c) => c.position === "AMF");

    const lwfs = fwds.filter((c) => c.position === "LWF");
    const cfs = fwds.filter((c) => c.position === "CF" || c.position === "SS");
    const rwfs = fwds.filter((c) => c.position === "RWF");

    const usedPlayerIds = new Set<string>();

    function pickCandidate(
      preferred: Candidate[],
      fallbacks: Candidate[][] = []
    ): Candidate | null {
      // 1. Try preferred pool
      for (const cand of preferred) {
        if (!usedPlayerIds.has(cand.playerId)) {
          usedPlayerIds.add(cand.playerId);
          return cand;
        }
      }
      // 2. Try fallbacks in order
      for (const fallback of fallbacks) {
        for (const cand of fallback) {
          if (!usedPlayerIds.has(cand.playerId)) {
            usedPlayerIds.add(cand.playerId);
            return cand;
          }
        }
      }
      return null;
    }

    const lineupSlots = [
      { key: "GK", player: pickCandidate(gks, [candidates]) },
      { key: "LB", player: pickCandidate(lbs, [defs, mids, candidates]) },
      { key: "CB1", player: pickCandidate(cbs, [defs, mids, candidates]) },
      { key: "CB2", player: pickCandidate(cbs, [defs, mids, candidates]) },
      { key: "RB", player: pickCandidate(rbs, [defs, mids, candidates]) },
      { key: "DMF", player: pickCandidate(dmfs, [mids, defs, candidates]) },
      { key: "CMF", player: pickCandidate(cmfs, [mids, candidates]) },
      { key: "AMF", player: pickCandidate(amfs, [mids, fwds, candidates]) },
      { key: "LWF", player: pickCandidate(lwfs, [fwds, mids, candidates]) },
      { key: "CF", player: pickCandidate(cfs, [fwds, candidates]) },
      { key: "RWF", player: pickCandidate(rwfs, [fwds, mids, candidates]) },
    ];

    const suggestedLineup = lineupSlots
      .filter((s) => s.player !== null)
      .map((s) => ({
        key: s.key,
        player: s.player!,
      }));

    return NextResponse.json({
      season,
      matchday,
      existingTotw,
      candidates,
      suggestedLineup,
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

    // Deduplicate players check
    const seenIds = new Set<string>();
    for (const p of players) {
      if (seenIds.has(p.playerId)) {
        return NextResponse.json(
          { error: `Duplicate player detected in TOTW lineup (${p.playerId}). Each player must be unique.` },
          { status: 400 }
        );
      }
      seenIds.add(p.playerId);
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
