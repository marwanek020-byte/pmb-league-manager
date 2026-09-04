import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { calculatePlayerDemands } from "@/lib/services/botola-contract-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId;

    if (!clubId) {
      const farRabat = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
      });
      clubId = farRabat?.id || (await prisma.club.findFirst())?.id;
    }

    if (!clubId) {
      return NextResponse.json({ error: "No club found" }, { status: 404 });
    }

    const player = await prisma.player.findUnique({
      where: { id: params.playerId },
      select: {
        id: true,
        fullName: true,
        overallRating: true,
        position: true,
        photo: true,
        nationality: true,
        realClub: true,
        marketValue: true,
        primeSignature: true,
        seasonSalary: true,
        contractSeasonsLeft: true,
        squadRole: true,
        releaseClause: true,
        isFreeAgentMarket: true,
        expiredFromClubName: true,
        failedFreeAgentClubIds: true,
      },
    });

    if (!player || !player.isFreeAgentMarket) {
      return NextResponse.json({ error: "Free agent player not found on market." }, { status: 404 });
    }

    const failedClubs = (player.failedFreeAgentClubIds || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (failedClubs.includes(clubId)) {
      return NextResponse.json(
        {
          error: "⛔ Your club has already exhausted its single negotiation attempt with this free agent.",
        },
        { status: 403 }
      );
    }

    const demands = await calculatePlayerDemands(params.playerId);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { budget: true },
    });

    return NextResponse.json({
      player,
      demands,
      clubBudget: Number(club?.budget ?? 0),
    });
  } catch (error) {
    console.error("GET /api/app/free-agents/[playerId]/contract error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare contract negotiation" },
      { status: 500 }
    );
  }
}
