import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasMatchdayService } from "@/lib/services/ultras-matchday-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const briefing = await UltrasMatchdayService.generateMatchdayBriefing(session.user.clubId);

    return NextResponse.json(briefing);
  } catch (error: any) {
    console.error("[UltrasMatchdayRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to generate matchday briefing" }, { status: 500 });
  }
}
