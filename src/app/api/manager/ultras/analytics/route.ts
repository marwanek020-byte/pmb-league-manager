import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasAnalyticsService } from "@/lib/services/ultras-analytics-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const analytics = await UltrasAnalyticsService.getMatchdayAnalyticsPrediction(session.user.clubId);
    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error("[UltrasAnalyticsRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to generate analytics prediction" }, { status: 500 });
  }
}
