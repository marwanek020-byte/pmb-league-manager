import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leagues = await prisma.league.findMany({
      orderBy: { name: "asc" },
      include: {
        clubs: {
          orderBy: { name: "asc" },
          include: {
            manager: {
              select: {
                id: true,
                username: true,
              },
            },
            players: {
              where: { status: "REGISTERED" },
              select: { id: true },
            },
          },
        },
      },
    });

    const formattedLeagues = leagues.map((league) => ({
      id: league.id,
      name: league.name,
      country: league.country,
      clubs: league.clubs.map((club) => ({
        id: club.id,
        name: club.name,
        logo: club.logo,
        managerId: club.manager?.id ?? null,
        managerUsername: club.manager?.username ?? null,
        registeredPlayerCount: club.players.length,
        budget: Number(club.budget),
        aiScoutEnabled: club.aiScoutEnabled,
        aiScoutTier: club.aiScoutTier,
      })),
    }));

    let totalClubs = 0;
    let enabledClubs = 0;

    for (const league of formattedLeagues) {
      for (const club of league.clubs) {
        totalClubs++;
        if (club.aiScoutEnabled) {
          enabledClubs++;
        }
      }
    }

    return NextResponse.json({
      leagues: formattedLeagues,
      stats: {
        totalLeagues: leagues.length,
        totalClubs,
        enabledClubs,
        disabledClubs: totalClubs - enabledClubs,
      },
    });
  } catch (error) {
    console.error("Failed to fetch AI scout club settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI scout club settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clubId, leagueId, aiScoutEnabled, aiScoutTier } = body;

    if (typeof aiScoutEnabled !== "boolean" && !aiScoutTier) {
      return NextResponse.json(
        { error: "Invalid payload. aiScoutEnabled or aiScoutTier is required." },
        { status: 400 }
      );
    }

    // Bulk update by league
    if (leagueId) {
      const updateData: { aiScoutEnabled?: boolean; aiScoutTier?: string } = {};
      if (typeof aiScoutEnabled === "boolean") updateData.aiScoutEnabled = aiScoutEnabled;
      if (aiScoutTier) updateData.aiScoutTier = aiScoutTier;

      await prisma.club.updateMany({
        where: { leagueId },
        data: updateData,
      });

      const league = await prisma.league.findUnique({ where: { id: leagueId } });

      await prisma.activityLog.create({
        data: {
          action: "AI_SCOUT_BULK_UPDATE",
          actorUserId: session.user.id,
          entityType: "LEAGUE",
          entityId: leagueId,
          metadata: {
            leagueName: league?.name,
            aiScoutEnabled,
            aiScoutTier: aiScoutTier ?? "PRO",
          },
        },
      });

      return NextResponse.json({ success: true, message: `Updated all clubs in ${league?.name ?? "league"}` });
    }

    // Single club update
    if (clubId) {
      const updateData: { aiScoutEnabled?: boolean; aiScoutTier?: string } = {};
      if (typeof aiScoutEnabled === "boolean") updateData.aiScoutEnabled = aiScoutEnabled;
      if (aiScoutTier) updateData.aiScoutTier = aiScoutTier;

      const updatedClub = await prisma.club.update({
        where: { id: clubId },
        data: updateData,
        include: { manager: true },
      });

      // Send notification to manager if enabled
      if (updatedClub.managerId && typeof aiScoutEnabled === "boolean") {
        await prisma.notification.create({
          data: {
            userId: updatedClub.managerId,
            message: aiScoutEnabled
              ? "🌟 Congratulations! PMB Headquarters has activated Chief Scout AI (Pro VIP) for your club. Head to the AI Scout tab to run your first squad audit."
              : "ℹ️ Your club's Chief Scout AI VIP subscription has been deactivated by PMB Headquarters.",
            type: "TRANSFER_ACCEPTED", // Generic notification enum
          },
        });
      }

      await prisma.activityLog.create({
        data: {
          action: "AI_SCOUT_CLUB_UPDATE",
          actorUserId: session.user.id,
          entityType: "CLUB",
          entityId: clubId,
          metadata: {
            clubName: updatedClub.name,
            aiScoutEnabled,
            aiScoutTier: updatedClub.aiScoutTier,
          },
        },
      });

      return NextResponse.json({
        success: true,
        club: {
          id: updatedClub.id,
          name: updatedClub.name,
          aiScoutEnabled: updatedClub.aiScoutEnabled,
          aiScoutTier: updatedClub.aiScoutTier,
        },
      });
    }

    return NextResponse.json({ error: "clubId or leagueId is required" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update AI scout settings:", error);
    return NextResponse.json(
      { error: "Failed to update AI scout settings" },
      { status: 500 }
    );
  }
}
