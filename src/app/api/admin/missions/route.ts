import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAnyAdmin } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/admin/missions
// List all missions with flexible filters
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !isAnyAdmin(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    const leagueId = searchParams.get("leagueId");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const clubId = searchParams.get("clubId");
    const matchday = searchParams.get("matchday");

    const where: Prisma.ClubMissionWhereInput = {
      ...(seasonId ? { seasonId } : {}),
      ...(leagueId ? { leagueId } : {}),
      ...(category ? { category: category as any } : {}),
      ...(status ? { status: status as any } : {}),
      ...(clubId ? { clubId } : {}),
      ...(matchday ? { startMatchday: parseInt(matchday, 10) } : {}),
    };

    const missions = await prisma.clubMission.findMany({
      where,
      include: {
        club: { select: { id: true, name: true, logo: true } },
        match: {
          select: {
            id: true,
            matchday: true,
            homeGoals: true,
            awayGoals: true,
            status: true,
            homeClub: { select: { name: true, logo: true } },
            awayClub: { select: { name: true, logo: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json({ missions });
  } catch (error: any) {
    console.error("GET /api/admin/missions error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load missions." },
      { status: 500 }
    );
  }
}

// POST /api/admin/missions
// Admin creates a custom mission
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !isAnyAdmin(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.clubId || !body?.title || !body?.conditionType) {
      return NextResponse.json(
        { error: "clubId, title, and conditionType are required." },
        { status: 400 }
      );
    }

    const mission = await prisma.clubMission.create({
      data: {
        clubId: body.clubId,
        category: body.category || "MATCHDAY",
        title: body.title,
        description: body.description || "",
        conditionType: body.conditionType,
        targetValue: body.targetValue ? parseInt(body.targetValue, 10) : null,
        rewardAmount: new Prisma.Decimal(body.rewardAmount || 1_000_000),
        penaltyAmount: new Prisma.Decimal(body.penaltyAmount || 500_000),
        status: "ACTIVE",
        startMatchday: body.startMatchday ? parseInt(body.startMatchday, 10) : null,
        endMatchday: body.endMatchday ? parseInt(body.endMatchday, 10) : null,
        matchId: body.matchId || null,
        seasonId: body.seasonId || null,
        leagueId: body.leagueId || null,
      },
    });

    return NextResponse.json({ success: true, mission });
  } catch (error: any) {
    console.error("POST /api/admin/missions error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create mission." },
      { status: 500 }
    );
  }
}

