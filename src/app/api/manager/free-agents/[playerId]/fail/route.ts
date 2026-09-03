import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";

export const dynamic = "force-dynamic";

// POST /api/manager/free-agents/[playerId]/fail
// Records that this club exhausted its single chance to sign this free agent
export async function POST(
  _req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ExpiredContractsService.recordFailedFreeAgentNegotiation(
      params.playerId,
      session.user.clubId
    );

    return NextResponse.json({
      success: true,
      message: "تم تسجيل استنفاد الفرصة الوحيدة للتفاوض مع هذا اللاعب.",
    });
  } catch (error) {
    console.error("POST /api/manager/free-agents/[playerId]/fail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record negotiation breakdown." },
      { status: 500 }
    );
  }
}
