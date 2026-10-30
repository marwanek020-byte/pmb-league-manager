import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAnyAdmin } from "@/lib/admin-auth";
import { generateMatchdayMissions } from "@/lib/services/mission-service";

export const dynamic = "force-dynamic";

// POST /api/admin/missions/generate
// Auto-generates complementary/relative missions for all matches in a matchday
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !isAnyAdmin(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const seasonId = body?.seasonId;
    const matchday = body?.matchday ? parseInt(body.matchday, 10) : null;
    const leagueId = body?.leagueId;

    if (!seasonId || !matchday) {
      return NextResponse.json(
        { error: "seasonId and matchday are required." },
        { status: 400 }
      );
    }

    const result = await generateMatchdayMissions({
      seasonId,
      matchday,
      leagueId,
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${result.missionsCreated} missions for ${result.totalMatches} matches in matchday ${matchday}.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/missions/generate error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate matchday missions." },
      { status: 500 }
    );
  }
}

