import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { WhatIfSimulatorService } from "@/lib/services/what-if-simulator-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetPlayerId, sellPlayerId } = await request.json();

    if (!targetPlayerId) {
      return NextResponse.json({ error: "Target player ID is required" }, { status: 400 });
    }

    const simulation = await WhatIfSimulatorService.simulateTransfer({
      clubId: session.user.clubId,
      targetPlayerId,
      sellPlayerId: sellPlayerId || null,
    });

    return NextResponse.json(simulation);
  } catch (error: any) {
    console.error("Failed to simulate transfer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to simulate transfer consequence" },
      { status: 500 }
    );
  }
}
