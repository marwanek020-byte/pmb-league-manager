import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAnyAdmin } from "@/lib/admin-auth";
import { generateLongTermMissions } from "@/lib/services/mission-service";

export const dynamic = "force-dynamic";

// POST /api/admin/missions/long-term/generate
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !isAnyAdmin(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const seasonId = body?.seasonId;
    const leagueId = body?.leagueId;
    const startMatchday = body?.startMatchday ? parseInt(body.startMatchday, 10) : 1;
    const clubIds = Array.isArray(body?.clubIds) ? body.clubIds : undefined;

    if (!seasonId || !leagueId) {
      return NextResponse.json(
        { error: "seasonId and leagueId are required." },
        { status: 400 }
      );
    }

    const result = await generateLongTermMissions({
      seasonId,
      leagueId,
      startMatchday,
      clubIds,
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${result.count} long-term missions starting at matchday ${startMatchday}.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/missions/long-term/generate error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate long-term missions." },
      { status: 500 }
    );
  }
}

