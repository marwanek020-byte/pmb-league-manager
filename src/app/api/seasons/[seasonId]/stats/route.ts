import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { seasonId: string } }
) {
  try {
    const season = await prisma.season.findUnique({
      where: { id: params.seasonId },
      include: {
        league: { select: { id: true, name: true, logo: true, country: true } },
      },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // Fetch all completed matches with events, MOTMs, clubs, and rosters
    const matches = await prisma.match.findMany({
      where: {
        seasonId: params.seasonId,
        status: "COMPLETED",
      },
      include: {
        manOfTheMatch: {
          select: {
            id: true,
            fullName: true,
            photo: true,
            position: true,
            overallRating: true,
            pmbClubId: true,
          },
        },
        homeClub: {
          select: {
            id: true,
            name: true,
            logo: true,
            players: {
              select: { id: true, fullName: true, position: true, photo: true, overallRating: true },
            },
          },
        },
        awayClub: {
          select: {
            id: true,
            name: true,
            logo: true,
            players: {
              select: { id: true, fullName: true, position: true, photo: true, overallRating: true },
            },
          },
        },
        events: {
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                photo: true,
                position: true,
                overallRating: true,
                pmbClubId: true,
              },
            },
            assistPlayer: {
              select: {
                id: true,
                fullName: true,
                photo: true,
                position: true,
                overallRating: true,
                pmbClubId: true,
              },
            },
            club: {
              select: { id: true, name: true, logo: true },
            },
          },
        },
      },
    });

    // Club map for quick lookups
    const clubMap = new Map<string, { id: string; name: string; logo: string | null }>();
    matches.forEach((m) => {
      if (m.homeClub) clubMap.set(m.homeClub.id, { id: m.homeClub.id, name: m.homeClub.name, logo: m.homeClub.logo });
      if (m.awayClub) clubMap.set(m.awayClub.id, { id: m.awayClub.id, name: m.awayClub.name, logo: m.awayClub.logo });
    });

    // Aggregation maps
    type PlayerStat = {
      id: string;
      fullName: string;
      photo: string | null;
      position: string;
      overallRating: number | null;
      clubId: string | null;
      clubName: string;
      clubLogo: string | null;
      goals: number;
      assists: number;
      cleanSheets: number;
      motmCount: number;
      ballonDorPoints: number;
    };

    const playerStatsMap = new Map<string, PlayerStat>();

    function getOrCreatePlayer(
      p: { id: string; fullName: string; photo: string | null; position: string; overallRating: number | null; pmbClubId?: string | null },
      clubId?: string | null
    ): PlayerStat {
      let stat = playerStatsMap.get(p.id);
      if (!stat) {
        const cId = clubId || p.pmbClubId || null;
        const cInfo = cId ? clubMap.get(cId) : null;
        stat = {
          id: p.id,
          fullName: p.fullName,
          photo: p.photo,
          position: p.position,
          overallRating: p.overallRating,
          clubId: cId,
          clubName: cInfo?.name || "PMB Club",
          clubLogo: cInfo?.logo || null,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          motmCount: 0,
          ballonDorPoints: 0,
        };
        playerStatsMap.set(p.id, stat);
      }
      return stat;
    }

    // Process Match Events & Clean Sheets
    for (const match of matches) {
      // MOTM
      if (match.manOfTheMatch) {
        const motmStat = getOrCreatePlayer(match.manOfTheMatch, match.manOfTheMatch.pmbClubId);
        motmStat.motmCount += 1;
      }

      // Goals & Assists from events
      for (const ev of match.events) {
        if (ev.type === "GOAL" && ev.player) {
          const pStat = getOrCreatePlayer(ev.player, ev.clubId);
          pStat.goals += 1;
        }
        if (ev.assistPlayer) {
          const aStat = getOrCreatePlayer(ev.assistPlayer, ev.clubId);
          aStat.assists += 1;
        }
      }

      // Clean sheets for goalkeepers
      if (match.homeGoals === 0 && match.awayClub?.players) {
        const gk = match.awayClub.players.find((p) => p.position === "GK");
        if (gk) {
          const gkStat = getOrCreatePlayer(gk, match.awayClub.id);
          gkStat.cleanSheets += 1;
        }
      }
      if (match.awayGoals === 0 && match.homeClub?.players) {
        const gk = match.homeClub.players.find((p) => p.position === "GK");
        if (gk) {
          const gkStat = getOrCreatePlayer(gk, match.homeClub.id);
          gkStat.cleanSheets += 1;
        }
      }
    }

    // Calculate Ballon d'Or Points
    const allPlayerStats = Array.from(playerStatsMap.values()).map((p) => {
      const ovrBonus = (p.overallRating || 75) * 0.1;
      const points =
        p.goals * 4 +
        p.assists * 3 +
        p.cleanSheets * 4 +
        p.motmCount * 6 +
        ovrBonus;
      return {
        ...p,
        ballonDorPoints: Math.round(points * 10) / 10,
      };
    });

    // Top Goalscorers (min 1 goal)
    const topScorers = [...allPlayerStats]
      .filter((p) => p.goals > 0)
      .sort((a, b) => b.goals - a.goals || (b.overallRating || 0) - (a.overallRating || 0))
      .slice(0, 15);

    // Top Assists (min 1 assist)
    const topAssists = [...allPlayerStats]
      .filter((p) => p.assists > 0)
      .sort((a, b) => b.assists - a.assists || (b.overallRating || 0) - (a.overallRating || 0))
      .slice(0, 15);

    // Top Goalkeepers (Clean Sheets)
    const goldenGlove = [...allPlayerStats]
      .filter((p) => p.position === "GK" && p.cleanSheets > 0)
      .sort((a, b) => b.cleanSheets - a.cleanSheets || (b.overallRating || 0) - (a.overallRating || 0))
      .slice(0, 10);

    // Top MOTMs (min 1 MOTM)
    const topMotm = [...allPlayerStats]
      .filter((p) => p.motmCount > 0)
      .sort((a, b) => b.motmCount - a.motmCount || (b.overallRating || 0) - (a.overallRating || 0))
      .slice(0, 10);

    // Ballon d'Or Top 10
    const ballonDorRankings = [...allPlayerStats]
      .filter((p) => p.goals > 0 || p.assists > 0 || p.cleanSheets > 0 || p.motmCount > 0)
      .sort((a, b) => b.ballonDorPoints - a.ballonDorPoints)
      .slice(0, 10);

    return NextResponse.json({
      season,
      totalMatchesPlayed: matches.length,
      topScorers,
      topAssists,
      goldenGlove,
      topMotm,
      ballonDorRankings,
    });
  } catch (error) {
    console.error("Error computing season stats:", error);
    return NextResponse.json({ error: "Failed to compute season stats" }, { status: 500 });
  }
}
