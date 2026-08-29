import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  removePlayerFromClub,
  isPlayerRegistrationError,
} from "@/lib/player-registration";
import { serializePlayer } from "@/lib/serialize-player";

type RemovePlayerBody = {
  playerId?: string;
};

export async function POST(req: Request) {
  const session = await auth();

  if (
    !session ||
    session.user.role !== "CLUB_MANAGER" ||
    !session.user.clubId
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
    | RemovePlayerBody
    | null;

  const playerId = body?.playerId?.trim();

  if (!playerId) {
    return NextResponse.json(
      {
        error: "Player ID is required.",
        code: "NOT_FOUND",
      },
      { status: 400 }
    );
  }

  try {
    const player = await removePlayerFromClub(
      playerId,
      session.user.clubId
    );

    return NextResponse.json({
      player,
    });
  } catch (error: any) {
    if (isPlayerRegistrationError(error)) {
      const status =
        error.code === "FORBIDDEN" || error.code === "LOCKED"
          ? 403
          : error.code === "NOT_FOUND"
          ? 404
          : error.code === "ALREADY_REGISTERED"
          ? 409
          : 409;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status }
      );
    }

    console.error("Remove player failed:", error);

    return NextResponse.json(
      {
        error: error?.message || "Something went wrong while removing the player.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}