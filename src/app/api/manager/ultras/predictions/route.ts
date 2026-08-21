import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasGamificationService } from "@/lib/services/ultras-gamification-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const predictions = UltrasGamificationService.getUserPredictions(session.user.id);
    return NextResponse.json(predictions);
  } catch (error: any) {
    console.error("[PredictionsRoute GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch predictions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { matchId, homeGoals, awayGoals, firstScorer } = body;

    if (!matchId || homeGoals === undefined || awayGoals === undefined) {
      return NextResponse.json({ error: "Missing required prediction fields" }, { status: 400 });
    }

    const result = UltrasGamificationService.submitPrediction(session.user.id, {
      matchId,
      homeGoals: Number(homeGoals),
      awayGoals: Number(awayGoals),
      firstScorer,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[PredictionsRoute POST Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to submit prediction" }, { status: 500 });
  }
}
