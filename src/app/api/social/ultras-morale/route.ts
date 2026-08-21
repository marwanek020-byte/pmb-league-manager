import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const moraleData = await UltrasSocialService.calculateUltrasMorale(session.user.clubId);
    return NextResponse.json(moraleData);
  } catch (error: any) {
    console.error("Failed to fetch ultras morale:", error);
    return NextResponse.json({ error: "Failed to calculate ultras morale" }, { status: 500 });
  }
}
