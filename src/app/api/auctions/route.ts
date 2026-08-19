import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLiveAuctions } from "@/lib/services/auction-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getLiveAuctions();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/auctions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load auctions" },
      { status: 500 }
    );
  }
}
