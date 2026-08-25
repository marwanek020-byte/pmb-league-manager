import { NextResponse } from "next/server";
import { ThroneCupService } from "@/lib/services/throne-cup-service";

export const dynamic = "force-dynamic";

// GET /api/throne-cup
export async function GET() {
  try {
    const cup = await ThroneCupService.getOrInitializeCup(false);
    return NextResponse.json({ success: true, cup });
  } catch (error: any) {
    console.error("Failed to fetch Throne Cup:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch Throne Cup." }, { status: 500 });
  }
}
