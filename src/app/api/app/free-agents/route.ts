import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";
import { getClubForeignPlayerCount, BOTOLA_MAX_FOREIGN_PLAYERS } from "@/lib/services/botola-contract-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId;

    if (!clubId) {
      const farRabat = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
      });
      clubId = farRabat?.id || (await prisma.club.findFirst())?.id;
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const [players, club, foreignPlayerCount] = await Promise.all([
      ExpiredContractsService.getFreeAgentMarketPlayers(search, clubId || undefined),
      clubId
        ? prisma.club.findUnique({
            where: { id: clubId },
            select: {
              id: true,
              name: true,
              logo: true,
              budget: true,
              league: {
                select: { name: true, country: true },
              },
            },
          })
        : null,
      clubId ? getClubForeignPlayerCount(clubId) : 0,
    ]);

    const isBotola =
      club?.league?.name?.toUpperCase().includes("BOTOLA") ||
      club?.league?.country?.toLowerCase() === "morocco";

    return NextResponse.json({
      players,
      club: {
        id: club?.id || clubId || "c1",
        name: club?.name || "Your Club",
        logo: club?.logo || null,
        budget: Number(club?.budget ?? 0),
        foreignPlayerCount,
        maxForeignPlayers: isBotola ? BOTOLA_MAX_FOREIGN_PLAYERS : 5,
      },
    });
  } catch (error) {
    console.error("GET /api/app/free-agents error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch free agent market" },
      { status: 500 }
    );
  }
}
