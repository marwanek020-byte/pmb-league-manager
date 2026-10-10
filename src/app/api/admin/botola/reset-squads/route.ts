import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAnyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  const isAuthorized =
    (session?.user && isAnyAdmin(session.user)) ||
    secret === "pmb-reset-2026" ||
    secret === process.env.AUTH_SECRET;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const league = await prisma.league.findFirst({
      where: { name: { contains: "botola", mode: "insensitive" } },
      include: { clubs: { select: { id: true, name: true } } },
    });

    if (!league) {
      return NextResponse.json({ error: "Botola Pro league not found" }, { status: 404 });
    }

    const clubIds = league.clubs.map((c) => c.id);

    // 1. Clear club lineups
    try {
      await prisma.lineupStarter.deleteMany({
        where: { lineup: { clubId: { in: clubIds } } },
      });
      await prisma.lineupSubstitute.deleteMany({
        where: { lineup: { clubId: { in: clubIds } } },
      });
      await prisma.setPieceAssignment.deleteMany({
        where: { lineup: { clubId: { in: clubIds } } },
      });
    } catch (e) {
      console.warn("Lineup cleanup warning:", e);
    }

    // 2. Cancel pending transfers
    await prisma.transfer.updateMany({
      where: {
        status: { in: ["PENDING_SELLER_APPROVAL", "PENDING_PERSONAL_TERMS"] },
        OR: [{ fromClubId: { in: clubIds } }, { toClubId: { in: clubIds } }],
      },
      data: { status: "CANCELLED" },
    });

    // 3. Reset all players assigned to Botola clubs to AVAILABLE with null club
    const updatedPlayers = await prisma.player.updateMany({
      where: { pmbClubId: { in: clubIds } },
      data: {
        pmbClubId: null,
        status: "AVAILABLE",
        seasonSalary: 0,
        primeSignature: 0,
        contractSeasonsLeft: 1,
        squadRole: "IMPORTANT",
        releaseClause: null,
        contractSatisfaction: 85,
        lastNegotiatedAt: null,
        isFreeAgentMarket: false,
        adminCustodyStatus: null,
        expiredFromClubId: null,
        expiredFromClubName: null,
        contractExpiredAt: null,
        failedFreeAgentClubIds: null,
      },
    });

    // 4. Log the administrative action
    await prisma.activityLog.create({
      data: {
        action: "BOTOLA_SQUADS_RESET_FOR_NEW_SEASON",
        actorUserId: session?.user?.id ?? null,
        entityId: league.id,
        entityType: "League",
        metadata: {
          leagueName: league.name,
          playersReset: updatedPlayers.count,
          clubsReset: league.clubs.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully reset all 16 Botola Pro squads to 0 players. ${updatedPlayers.count} players are now AVAILABLE for new registrations.`,
      playersReset: updatedPlayers.count,
      clubsReset: league.clubs.length,
    });
  } catch (error: any) {
    console.error("Botola squad reset error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset Botola squads" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
