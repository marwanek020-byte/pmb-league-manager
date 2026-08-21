import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuctionWithPlayer, getLiveAuctions } from "@/lib/services/auction-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await getLiveAuctions();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load auctions" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { playerId, newPlayer, startingPrice, minIncrement, durationMinutes } = body;

    if ((!playerId && !newPlayer?.fullName) || !startingPrice || !durationMinutes) {
      return NextResponse.json(
        { error: "Missing required fields (player identification, startingPrice, durationMinutes)." },
        { status: 400 }
      );
    }

    const auction = await createAuctionWithPlayer(session.user.id, {
      playerId,
      newPlayer,
      startingPrice: Number(startingPrice),
      minIncrement: minIncrement ? Number(minIncrement) : undefined,
      durationMinutes: Number(durationMinutes),
    });

    return NextResponse.json({ success: true, auction }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/auctions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create auction" },
      { status: 400 }
    );
  }
}
