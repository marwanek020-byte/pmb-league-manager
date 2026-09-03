import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getContractTerminationDetails,
  terminateContractWithSeverance,
} from "@/lib/services/botola-contract-service";

// GET /api/manager/players/[playerId]/contract/release
// Returns contract termination settlement details, player stats, and agent requested severance
export async function GET(
  _req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const details = await getContractTerminationDetails(params.playerId, session.user.clubId);
    return NextResponse.json({ success: true, details });
  } catch (err: unknown) {
    console.error("Get termination details error:", err);
    const message = err instanceof Error ? err.message : "Failed to load termination details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// POST /api/manager/players/[playerId]/contract/release
// Executes mutual contract termination, pays severance, releases player as Free Agent
export async function POST(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const severanceAmount = Number(body.severanceAmount || 0);

    const result = await terminateContractWithSeverance(
      params.playerId,
      session.user.clubId,
      severanceAmount
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Execute contract termination error:", err);
    const message = err instanceof Error ? err.message : "Failed to terminate contract.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
