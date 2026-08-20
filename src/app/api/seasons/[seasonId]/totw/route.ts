import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/seasons/[seasonId]/totw?matchday=N
export async function GET(
  req: Request,
  { params }: { params: { seasonId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const matchdayParam = searchParams.get("matchday");
    const matchday = matchdayParam ? parseInt(matchdayParam, 10) : null;

    const season = await prisma.season.findUnique({
      where: { id: params.seasonId },
      include: {
        league: { select: { id: true, name: true, logo: true } },
      },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // Find all published TOTWs for this season
    const totws = await prisma.teamOfTheWeek.findMany({
      where: {
        seasonId: params.seasonId,
        ...(matchday ? { matchday } : {}),
      },
      include: {
        players: {
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                photo: true,
                position: true,
                overallRating: true,
              },
            },
            club: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
      orderBy: { matchday: "desc" },
    });

    // Also get all distinct matchdays that have completed matches to allow navigation
    const completedMatches = await prisma.match.findMany({
      where: {
        seasonId: params.seasonId,
        status: "COMPLETED",
      },
      select: { matchday: true },
      distinct: ["matchday"],
      orderBy: { matchday: "asc" },
    });

    const availableMatchdays = completedMatches.map((m) => m.matchday);

    return NextResponse.json({
      season,
      totws,
      currentTotw: totws.length > 0 ? totws[0] : null,
      availableMatchdays,
    });
  } catch (error) {
    console.error("Error fetching TOTW:", error);
    return NextResponse.json({ error: "Failed to fetch TOTW" }, { status: 500 });
  }
}
