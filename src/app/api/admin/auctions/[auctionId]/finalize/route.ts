import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { finalizeAuction, cancelAuction } from "@/lib/services/auction-service";

export async function POST(
  req: Request,
  { params }: { params: { auctionId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "FINALIZE";

    if (action === "CANCEL") {
      const auction = await cancelAuction(session.user.id, params.auctionId);
      return NextResponse.json({ success: true, auction });
    }

    const auction = await finalizeAuction(params.auctionId);
    return NextResponse.json({ success: true, auction });
  } catch (error) {
    console.error("POST /api/admin/auctions/[auctionId]/finalize error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 400 }
    );
  }
}
