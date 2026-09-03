import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";
import { getClubForeignPlayerCount, BOTOLA_MAX_FOREIGN_PLAYERS } from "@/lib/services/botola-contract-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "CLUB_MANAGER" && session.user.role !== "ADMINISTRATOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;

  try {
    const clubId = session.user.clubId;
    const [players, club, foreignPlayerCount] = await Promise.all([
      ExpiredContractsService.getFreeAgentMarketPlayers(search, clubId || undefined),
      clubId
        ? prisma.club.findUnique({
            where: { id: clubId },
            select: { id: true, name: true, budget: true },
          })
        : null,
      clubId ? getClubForeignPlayerCount(clubId) : 0,
    ]);

    return NextResponse.json({
      players,
      club: club
        ? {
            id: club.id,
            name: club.name,
            budget: Number(club.budget ?? 0),
            foreignPlayerCount,
            maxForeignPlayers: BOTOLA_MAX_FOREIGN_PLAYERS,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/manager/free-agents error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch free agent market" },
      { status: 500 }
    );
  }
}
