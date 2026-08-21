import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasAlertsService } from "@/lib/services/ultras-alerts-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const alerts = await UltrasAlertsService.getProactiveAlertsForClub(session.user.clubId);
    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error("[UltrasAlertsRoute GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch proactive alerts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const body = await req.json();
    const { alertType, customNote } = body;

    const success = await UltrasAlertsService.dispatchProactiveAlertDirectMessage(
      session.user.clubId,
      alertType || "MATCHDAY_ALERT",
      customNote
    );

    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("[UltrasAlertsRoute POST Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to dispatch alert DM" }, { status: 500 });
  }
}
