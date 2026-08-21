import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasInteractionService } from "@/lib/services/ultras-interaction-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const data = await UltrasInteractionService.getCapoPredictionDetail(session.user.clubId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CapoPredictorRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch prediction detail" }, { status: 500 });
  }
}
