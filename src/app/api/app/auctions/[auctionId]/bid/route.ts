import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { placeBid } from "@/lib/services/auction-service";

export async function POST(
  req: Request,
  { params }: { params: { auctionId: string } }
) {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId;
    let userId = session?.user?.id;

    if (!clubId) {
      const farRabat = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
      });
      clubId = farRabat?.id || (await prisma.club.findFirst())?.id;
    }

    if (!userId) {
      const user = await prisma.user.findFirst({
        where: { role: { in: ["CLUB_MANAGER", "ADMINISTRATOR"] } },
      });
      userId = user?.id || "u1";
    }

    if (!clubId) {
      return NextResponse.json({ error: "No club identified for bidding." }, { status: 400 });
    }

    const body = await req.json();
    const amount = Number(body.amount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid bid amount." }, { status: 400 });
    }

    const result = await placeBid({
      auctionId: params.auctionId,
      userId,
      clubId,
      amount,
    });

    return NextResponse.json({
      success: true,
      bid: result.bid,
      auction: result.auction,
    });
  } catch (error) {
    console.error("POST /api/app/auctions/[auctionId]/bid error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to place bid." },
      { status: 400 }
    );
  }
}
