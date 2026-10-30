import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/manager/missions
// Fetches missions for the signed-in club manager
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CLUB_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clubId = session.user.clubId;
    if (!clubId) {
      return NextResponse.json({ error: "No club associated with manager" }, { status: 404 });
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true, logo: true, leagueId: true, budget: true },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const missions = await prisma.clubMission.findMany({
      where: { clubId },
      include: {
        match: {
          select: {
            id: true,
            matchday: true,
            status: true,
            homeGoals: true,
            awayGoals: true,
            homeClub: { select: { id: true, name: true, logo: true } },
            awayClub: { select: { id: true, name: true, logo: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    // If there is a paired mission, fetch opponent mission preview
    const pairedMissionIds = missions
      .map((m) => m.pairedMissionId)
      .filter((id): id is string => Boolean(id));

    const pairedMissions = pairedMissionIds.length > 0
      ? await prisma.clubMission.findMany({
          where: { id: { in: pairedMissionIds } },
          include: {
            club: { select: { name: true, logo: true } },
          },
        })
      : [];

    const pairedMap = new Map(pairedMissions.map((p) => [p.id, p]));

    const enrichedMissions = missions.map((m) => {
      const opponentMission = m.pairedMissionId ? pairedMap.get(m.pairedMissionId) : null;
      return {
        ...m,
        opponentMission: opponentMission
          ? {
              clubName: opponentMission.club.name,
              clubLogo: opponentMission.club.logo,
              title: opponentMission.title,
              description: opponentMission.description,
              status: opponentMission.status,
            }
          : null,
      };
    });

    const activeMissions = enrichedMissions.filter((m) => m.status === "ACTIVE");
    const completedMissions = enrichedMissions.filter((m) => m.status === "COMPLETED");
    const failedMissions = enrichedMissions.filter((m) => m.status === "FAILED");

    let totalEarned = 0;
    for (const m of completedMissions) {
      totalEarned += Number(m.rewardAmount ?? 0);
    }

    let totalLost = 0;
    for (const m of failedMissions) {
      totalLost += Number(m.penaltyAmount ?? 0);
    }

    const netProfit = totalEarned - totalLost;

    return NextResponse.json({
      club,
      stats: {
        totalEarned,
        totalLost,
        netProfit,
        activeCount: activeMissions.length,
        completedCount: completedMissions.length,
        failedCount: failedMissions.length,
      },
      activeMissions,
      completedMissions,
      failedMissions,
    });
  } catch (error: any) {
    console.error("GET /api/manager/missions error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load manager missions." },
      { status: 500 }
    );
  }
}

