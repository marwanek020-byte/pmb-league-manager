import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAvailableFreeAgents } from "@/lib/services/auction-service";
import { isAnyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !isAnyAdmin(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;

  try {
    const players = await getAvailableFreeAgents(search);
    return NextResponse.json({ players });
  } catch (error) {
    console.error("GET /api/admin/auctions/available-players error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load players" },
      { status: 500 }
    );
  }
}
