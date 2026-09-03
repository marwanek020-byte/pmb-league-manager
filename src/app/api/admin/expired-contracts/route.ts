import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const players = await ExpiredContractsService.getAdminExpiredCustodyPlayers();
    return NextResponse.json({ players });
  } catch (error) {
    console.error("GET /api/admin/expired-contracts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load expired custody players" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await ExpiredContractsService.checkAndTransferExpiredContracts();
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/expired-contracts scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan expired contracts" },
      { status: 500 }
    );
  }
}
