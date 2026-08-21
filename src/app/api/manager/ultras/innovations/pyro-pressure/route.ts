import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasInnovationsService } from "@/lib/services/ultras-innovations-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const data = await UltrasInnovationsService.getPyroPressureMetrics(session.user.clubId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[PyroPressureRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch pyro pressure" }, { status: 500 });
  }
}
