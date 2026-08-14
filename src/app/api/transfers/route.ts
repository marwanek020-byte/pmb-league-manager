import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createTransferRequest,
  TransferServiceError,
} from "@/lib/services/transfer-service";
import { serializeTransfer } from "@/lib/serialize-transfer";

type CreateTransferBody = {
  playerId?: string;
  swapPlayerName?: string;
  toClubId?: string;
  season?: string;
  type?: "PERMANENT" | "LOAN" | "SWAP" | "FREE_TRANSFER";
  fee?: number;
  currency?: string;
  notes?: string;
  durationDays?: number;
};

export async function POST(req: Request) {
  const session = await auth();

  if (
    !session ||
    session.user.role !== "CLUB_MANAGER" ||
    !session.user.clubId ||
    !session.user.id
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "FORBIDDEN",
      },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | CreateTransferBody
    | null;

  if (!body) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        code: "INVALID_VALUE",
      },
      { status: 400 }
    );
  }

  const playerId = body.playerId?.trim();
  const toClubId = body.toClubId?.trim();
  const season = body.season?.trim();

  if (!playerId) {
    return NextResponse.json(
      {
        error: "Player is required.",
        code: "PLAYER_NOT_FOUND",
      },
      { status: 400 }
    );
  }

  if (!toClubId) {
    return NextResponse.json(
      {
        error: "Destination club is required.",
        code: "CLUB_NOT_FOUND",
      },
      { status: 400 }
    );
  }

  if (!season) {
    return NextResponse.json(
      {
        error: "Season is required.",
        code: "INVALID_VALUE",
      },
      { status: 400 }
    );
  }

  try {
    const transfer = await createTransferRequest(session.user.id, {
      playerId,
      toClubId,
      season,
      type: body.type,
      fee: body.fee,
      currency: body.currency,
      notes: body.notes,
      durationDays: body.durationDays,
      swapPlayerName: body.swapPlayerName?.trim(),
    });

    return NextResponse.json(
      {
        transfer: serializeTransfer(transfer),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof TransferServiceError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "PLAYER_NOT_FOUND" ||
            error.code === "CLUB_NOT_FOUND"
          ? 404
          : error.code === "DUPLICATE_TRANSFER" ||
            error.code === "SELF_TRANSFER" ||
            error.code === "OWNERSHIP_CONFLICT"
          ? 409
          : 400;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status }
      );
    }

    console.error("Create transfer request failed:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while creating the transfer request.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}