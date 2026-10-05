import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";
import { isAnyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || !isAnyAdmin(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await ExpiredContractsService.adminReleaseToFreeAgentMarket(
      session.user.id,
      params.playerId
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Release to free agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to release player to Free Agent Market" },
      { status: 500 }
    );
  }
}
