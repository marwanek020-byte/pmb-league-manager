import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UltrasStudioService } from "@/lib/services/ultras-studio-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      select: { name: true },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const category = body.category || "MATCHDAY_BATTLE";
    const opponentName = body.opponentName || undefined;
    const playerName = body.playerName || undefined;
    const preferredLanguage = body.preferredLanguage || undefined;

    const chant = await UltrasStudioService.generateOriginalChant({
      clubName: club.name,
      category,
      opponentName,
      playerName,
      preferredLanguage,
    });

    return NextResponse.json(chant);
  } catch (error: any) {
    console.error("[UltrasChantRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to generate chant" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      select: { name: true },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const chant = await UltrasStudioService.generateOriginalChant({
      clubName: club.name,
      category: "MATCHDAY_BATTLE",
    });

    return NextResponse.json(chant);
  } catch (error: any) {
    console.error("[UltrasChantRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch default chant" }, { status: 500 });
  }
}
