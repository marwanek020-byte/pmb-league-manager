import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { collapseAndRefundDeal } from "@/lib/services/botola-contract-service";

// POST /api/manager/players/[playerId]/contract/collapse
// Cancels a pending contract deal, collapses the transfer/auction, and refunds 100% of money
export async function POST(
  _req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await collapseAndRefundDeal(params.playerId, session.user.clubId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Deal collapse error:", err);
    const message = err instanceof Error ? err.message : "Failed to collapse deal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
