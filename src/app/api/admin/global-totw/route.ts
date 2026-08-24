import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  detectLatestLeagueRounds,
  getGlobalTotwCandidates,
  generateGlobalSuggestedLineup,
  applyGlobalTotwRewards,
  MAX_PLAYERS_PER_LEAGUE,
  MAX_PLAYERS_PER_CLUB,
} from "@/lib/services/global-totw-service";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

// GET /api/admin/global-totw?edition=N&rounds=...
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const editionParam = searchParams.get("edition");
  const customRoundsParam = searchParams.get("rounds");

  try {
    // 1. Fetch all existing Global TOTW editions
    const existingEditions = await prisma.globalTeamOfTheWeek.findMany({
      orderBy: { edition: "desc" },
      include: {
        players: {
          include: {
            player: true,
            club: true,
            league: true,
          },
        },
      },
    });

    const nextEditionNumber = existingEditions.length > 0 ? existingEditions[0].edition + 1 : 1;
    const activeEditionNumber = editionParam ? parseInt(editionParam, 10) : nextEditionNumber;

    const currentEditionData = existingEditions.find((e) => e.edition === activeEditionNumber) || null;

    // 2. Auto-detect latest completed round for each league
    const detectedLeagueRounds = await detectLatestLeagueRounds();

    // 3. Resolve which rounds to pull candidates from
    let roundsToUse: { leagueId: string; matchday: number }[] = [];

    if (customRoundsParam) {
      try {
        roundsToUse = JSON.parse(customRoundsParam);
      } catch (err) {
        console.error("Invalid custom rounds JSON:", err);
      }
    } else if (currentEditionData?.leagueRounds) {
      roundsToUse = currentEditionData.leagueRounds as { leagueId: string; matchday: number }[];
    } else {
      roundsToUse = detectedLeagueRounds
        .filter((d) => d.isIncluded && d.latestCompletedMatchday !== null)
        .map((d) => ({
          leagueId: d.leagueId,
          matchday: d.latestCompletedMatchday!,
        }));
    }

    // 4. Fetch candidates and generate suggested 11 + Podium
    const candidates = await getGlobalTotwCandidates(roundsToUse);
    const { suggestedLineup, podium } = generateGlobalSuggestedLineup(candidates);

    return NextResponse.json({
      activeEdition: activeEditionNumber,
      nextEdition: nextEditionNumber,
      existingEditions,
      currentEditionData,
      detectedLeagueRounds,
      selectedRounds: roundsToUse,
      candidates,
      suggestedLineup,
      podium,
      maxPerLeague: MAX_PLAYERS_PER_LEAGUE,
      maxPerClub: MAX_PLAYERS_PER_CLUB,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/global-totw:", error);
    return NextResponse.json({ error: "Failed to load Global TOTW admin data" }, { status: 500 });
  }
}

// POST /api/admin/global-totw
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      edition,
      title = "Global All-Stars",
      formation = "4-3-3",
      leagueRounds,
      players, // Array of 11
    } = body;

    if (!edition || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: "Missing required fields (edition, players)" }, { status: 400 });
    }

    // Deduplication check & League/Club Cap enforcement
    const seenIds = new Set<string>();
    const leagueCounts = new Map<string, number>();
    const clubCounts = new Map<string, number>();

    for (const p of players) {
      if (seenIds.has(p.playerId)) {
        return NextResponse.json(
          { error: `Duplicate player detected in Global TOTW (${p.playerId}). Each player must be unique.` },
          { status: 400 }
        );
      }
      seenIds.add(p.playerId);

      if (p.leagueId) {
        const lCount = (leagueCounts.get(p.leagueId) || 0) + 1;
        if (lCount > MAX_PLAYERS_PER_LEAGUE) {
          return NextResponse.json(
            { error: `League limit exceeded: Maximum ${MAX_PLAYERS_PER_LEAGUE} players allowed from the same league.` },
            { status: 400 }
          );
        }
        leagueCounts.set(p.leagueId, lCount);
      }

      if (p.clubId) {
        const cCount = (clubCounts.get(p.clubId) || 0) + 1;
        if (cCount > MAX_PLAYERS_PER_CLUB) {
          return NextResponse.json(
            { error: `Club limit exceeded: Maximum ${MAX_PLAYERS_PER_CLUB} players allowed from the same club.` },
            { status: 400 }
          );
        }
        clubCounts.set(p.clubId, cCount);
      }
    }

    // Find top 3 podium IDs from payload
    const firstPlace = players.find((p: any) => p.podiumRank === 1);
    const secondPlace = players.find((p: any) => p.podiumRank === 2);
    const thirdPlace = players.find((p: any) => p.podiumRank === 3);

    // Save and Distribute Rewards within Prisma transaction
    const globalTotw = await prisma.$transaction(
      async (tx) => {
        // Delete previous record for this edition if re-publishing
        const existing = await tx.globalTeamOfTheWeek.findUnique({
          where: { edition },
        });

        if (existing) {
          await tx.globalTotwPlayer.deleteMany({ where: { globalTotwId: existing.id } });
          await tx.globalTeamOfTheWeek.delete({ where: { id: existing.id } });
        }

        const created = await tx.globalTeamOfTheWeek.create({
          data: {
            edition,
            title,
            formation,
            leagueRounds: leagueRounds || [],
            isPublished: true,
            firstPlacePlayerId: firstPlace?.playerId || null,
            secondPlacePlayerId: secondPlace?.playerId || null,
            thirdPlacePlayerId: thirdPlace?.playerId || null,
            players: {
              create: players.map((p: any) => ({
                playerId: p.playerId,
                clubId: p.clubId,
                leagueId: p.leagueId || null,
                position: p.position,
                ratingBoost: p.ratingBoost || 3,
                goalsInMatchday: p.goalsInMatchday || 0,
                assistsInMatchday: p.assistsInMatchday || 0,
                isMotm: p.isMotm || false,
                podiumRank: p.podiumRank || null,
              })),
            },
          },
          include: {
            players: {
              include: {
                player: true,
                club: true,
                league: true,
              },
            },
          },
        });

        // Apply financial rewards (+1M per player, +3M 1st, +1.75M 2nd, +1.5M 3rd)
        await applyGlobalTotwRewards(tx, edition, players);

        return created;
      },
      { maxWait: 15000, timeout: 30000 }
    );

    return NextResponse.json({ success: true, globalTotw });
  } catch (error) {
    console.error("Error saving Global TOTW:", error);
    return NextResponse.json({ error: "Failed to save Global TOTW" }, { status: 500 });
  }
}
