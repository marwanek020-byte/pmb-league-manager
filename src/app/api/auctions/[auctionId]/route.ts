import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuctionDetails } from "@/lib/services/auction-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { auctionId: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const auction = await getAuctionDetails(params.auctionId);
    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }
    return NextResponse.json({ auction });
  } catch (error) {
    console.error("GET /api/auctions/[auctionId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load auction" },
      { status: 500 }
    );
  }
}
