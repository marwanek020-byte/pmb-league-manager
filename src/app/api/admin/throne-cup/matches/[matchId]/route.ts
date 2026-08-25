import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ThroneCupService, SaveCupMatchResultInput } from "@/lib/services/throne-cup-service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    matchId: string;
  };
};

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

// PATCH /api/admin/throne-cup/matches/[matchId]
export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SaveCupMatchResultInput;
    const updatedMatch = await ThroneCupService.saveMatchResult(params.matchId, body);

    return NextResponse.json({
      success: true,
      message: "Throne Cup match result saved and progressive prize awarded.",
      match: updatedMatch,
    });
  } catch (error: any) {
    console.error("Failed to save Throne Cup match result:", error);
    return NextResponse.json({ error: error.message || "Failed to save match result." }, { status: 400 });
  }
}

// DELETE /api/admin/throne-cup/matches/[matchId]
export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resetMatch = await ThroneCupService.cancelMatchResult(params.matchId);

    return NextResponse.json({
      success: true,
      message: "Throne Cup match result cancelled, prize money reversed, and next round bracket reset.",
      match: resetMatch,
    });
  } catch (error: any) {
    console.error("Failed to cancel Throne Cup match result:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel match result." }, { status: 400 });
  }
}
