import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { placeBid } from "@/lib/services/auction-service";

export async function POST(
  req: Request,
  { params }: { params: { auctionId: string } }
) {
  const session = await auth();

  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Only club managers can place bids." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const amount = Number(body.amount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid bid amount." }, { status: 400 });
    }

    const result = await placeBid({
      auctionId: params.auctionId,
      userId: session.user.id,
      clubId: session.user.clubId,
      amount,
    });

    return NextResponse.json({
      success: true,
      bid: result.bid,
      auction: result.auction,
    });
  } catch (error) {
    console.error("POST /api/auctions/[auctionId]/bid error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to place bid." },
      { status: 400 }
    );
  }
}
