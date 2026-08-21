import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UltrasStudioService } from "@/lib/services/ultras-studio-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      select: { id: true, name: true },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Find next upcoming match for opponent
    const nextMatch = await prisma.match.findFirst({
      where: {
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
        status: "UPCOMING",
      },
      include: { homeClub: true, awayClub: true },
    });

    const isHome = nextMatch?.homeClubId === club.id;
    const oppName = nextMatch ? (isHome ? nextMatch.awayClub.name : nextMatch.homeClub.name) : "Rival FC";

    const tifo = UltrasStudioService.generateTifoConcept({
      clubName: club.name,
      opponentName: oppName,
      isDerby: true,
      fixtureTitle: nextMatch ? `Matchday ${nextMatch.matchday} Clash` : "Championship Battle",
    });

    return NextResponse.json(tifo);
  } catch (error: any) {
    console.error("[UltrasTifoRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to generate TIFO concept" }, { status: 500 });
  }
}
