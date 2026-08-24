import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/global-totw?edition=N
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const editionParam = searchParams.get("edition");

  try {
    const allEditions = await prisma.globalTeamOfTheWeek.findMany({
      where: { isPublished: true },
      orderBy: { edition: "desc" },
      select: {
        id: true,
        edition: true,
        title: true,
        formation: true,
        leagueRounds: true,
        firstPlacePlayerId: true,
        secondPlacePlayerId: true,
        thirdPlacePlayerId: true,
        createdAt: true,
      },
    });

    const availableEditions = allEditions.map((e) => e.edition);
    const targetEdition = editionParam ? parseInt(editionParam, 10) : availableEditions[0] || 1;

    const currentGlobalTotw = await prisma.globalTeamOfTheWeek.findUnique({
      where: { edition: targetEdition },
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

    return NextResponse.json({
      currentGlobalTotw,
      availableEditions,
      allEditions,
      targetEdition,
    });
  } catch (error) {
    console.error("Error fetching Global TOTW:", error);
    return NextResponse.json({ error: "Failed to fetch Global TOTW" }, { status: 500 });
  }
}
