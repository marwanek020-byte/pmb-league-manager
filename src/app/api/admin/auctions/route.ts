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
    return NextResponse.json({ error: "Unauthorized. Administrator access required." }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const { playerId, newPlayer, startingPrice, minIncrement, durationMinutes } = body;

    const priceNum = Number(startingPrice);
    const durNum = Number(durationMinutes);

    if ((!playerId && !newPlayer?.fullName?.trim()) || isNaN(priceNum) || priceNum <= 0 || isNaN(durNum) || durNum <= 0) {
      return NextResponse.json(
        { error: "Missing required fields: specify a player, positive startingPrice, and durationMinutes." },
        { status: 400 }
      );
    }

    const adminUserId = session.user.id;

    const auction = await createAuctionWithPlayer(adminUserId, {
      playerId: playerId ? String(playerId) : undefined,
      newPlayer: newPlayer
        ? {
            fullName: String(newPlayer.fullName).trim(),
            position: newPlayer.position ? String(newPlayer.position).trim().toUpperCase() : "CF",
            overallRating: Number(newPlayer.overallRating) || 75,
            nationality: newPlayer.nationality ? String(newPlayer.nationality).trim() : "Morocco",
            realClub: newPlayer.realClub ? String(newPlayer.realClub).trim() : "Free Agent",
            photo: newPlayer.photo ? String(newPlayer.photo).trim() : null,
          }
        : undefined,
      startingPrice: priceNum,
      minIncrement: minIncrement && Number(minIncrement) > 0 ? Number(minIncrement) : undefined,
      durationMinutes: durNum,
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
