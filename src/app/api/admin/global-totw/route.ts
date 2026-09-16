import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  detectLatestLeagueRounds,
  detectBotolaMonthRounds,
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
    // 1. Fetch all existing Botola TOTM / Global TOTW editions
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

    // 2. Fetch Botola Pro Month rounds
    const { botolaLeague, availableMatchdays, defaultMonthMatchdays } = await detectBotolaMonthRounds(activeEditionNumber);
    const detectedLeagueRounds = await detectLatestLeagueRounds();

    // 3. Resolve which rounds to pull candidates from
    let roundsToUse: { leagueId: string; matchday: number }[] = [];

    if (customRoundsParam) {
      try {
        roundsToUse = JSON.parse(customRoundsParam);
      } catch (err) {
        console.error("Invalid custom rounds JSON:", err);
      }
    } else if (currentEditionData?.leagueRounds && (currentEditionData.leagueRounds as any[]).length > 0) {
      roundsToUse = currentEditionData.leagueRounds as { leagueId: string; matchday: number }[];
    } else if (botolaLeague) {
      roundsToUse = defaultMonthMatchdays.map((md) => ({
        leagueId: botolaLeague.id,
        matchday: md,
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
      botolaLeague,
      availableMatchdays,
      defaultMonthMatchdays,
      selectedRounds: roundsToUse,
      candidates,
      suggestedLineup,
      podium,
      maxPerLeague: MAX_PLAYERS_PER_LEAGUE,
      maxPerClub: MAX_PLAYERS_PER_CLUB,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/global-totw:", error);
    return NextResponse.json({ error: "Failed to load Botola TOTM admin data" }, { status: 500 });
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
      title = `Botola Pro Team of the Month (Month #${edition})`,
      formation = "4-3-3",
      leagueRounds,
      players, // Array of 11
    } = body;

    if (!edition || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: "Missing required fields (edition, players)" }, { status: 400 });
    }

    // Deduplication check & Club Cap enforcement
    const seenIds = new Set<string>();
    const clubCounts = new Map<string, number>();

    for (const p of players) {
      if (seenIds.has(p.playerId)) {
        return NextResponse.json(
          { error: `Duplicate player detected in Botola TOTM (${p.playerId}). Each player must be unique.` },
          { status: 400 }
        );
      }
      seenIds.add(p.playerId);

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

    const playersData = players.map((p: any) => ({
      playerId: p.playerId,
      clubId: p.clubId,
      leagueId: p.leagueId || null,
      position: p.position,
      ratingBoost: p.ratingBoost || 3,
      goalsInMatchday: p.goalsInMatchday || 0,
      assistsInMatchday: p.assistsInMatchday || 0,
      isMotm: p.isMotm || false,
      podiumRank: p.podiumRank || null,
    }));

    // Save and Distribute Rewards within Prisma transaction
    const globalTotw = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.globalTeamOfTheWeek.findUnique({
          where: { edition },
        });

        let savedTotw;
        if (existing) {
          // Clear old players first
          await tx.globalTotwPlayer.deleteMany({ where: { globalTotwId: existing.id } });

          savedTotw = await tx.globalTeamOfTheWeek.update({
            where: { id: existing.id },
            data: {
              title,
              formation,
              leagueRounds: leagueRounds || [],
              isPublished: true,
              firstPlacePlayerId: firstPlace?.playerId || null,
              secondPlacePlayerId: secondPlace?.playerId || null,
              thirdPlacePlayerId: thirdPlace?.playerId || null,
              players: {
                create: playersData,
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
        } else {
          savedTotw = await tx.globalTeamOfTheWeek.create({
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
                create: playersData,
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
        }

        // Apply financial rewards (+1M per player, +3M 1st, +1.75M 2nd, +1.5M 3rd)
        await applyGlobalTotwRewards(tx, edition, players);

        return savedTotw;
      },
      { maxWait: 15000, timeout: 30000 }
    );

    return NextResponse.json({ success: true, globalTotw });
  } catch (error: any) {
    console.error("Error saving Botola TOTM:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save Botola Pro TOTM" },
      { status: 500 }
    );
  }
}
