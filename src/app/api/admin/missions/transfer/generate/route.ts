import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAnyAdmin } from "@/lib/admin-auth";
import { generateTransferMissions } from "@/lib/services/mission-service";

export const dynamic = "force-dynamic";

// POST /api/admin/missions/transfer/generate
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !isAnyAdmin(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const seasonId = body?.seasonId;
    const leagueId = body?.leagueId;

    const result = await generateTransferMissions({
      seasonId,
      leagueId,
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${result.count} transfer window missions.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/missions/transfer/generate error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate transfer missions." },
      { status: 500 }
    );
  }
}

