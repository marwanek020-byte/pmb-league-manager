import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  removePlayerFromClub,
  PlayerRegistrationError,
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
  } catch (error) {
    if (error instanceof PlayerRegistrationError) {
      const status =
        error.code === "FORBIDDEN"
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
        error: "Something went wrong while removing the player.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}