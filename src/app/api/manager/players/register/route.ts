import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  registerPlayerToClub,
  PlayerRegistrationError,
} from "@/lib/player-registration";

type RegisterPlayerBody = {
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
    | RegisterPlayerBody
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
    const player = await registerPlayerToClub(
      playerId,
      session.user.clubId
    );

    return NextResponse.json({
      player,
    });
  } catch (error) {
    if (error instanceof PlayerRegistrationError) {
      const status =
        error.code === "FORBIDDEN" || error.code === "LOCKED"
          ? 403
          : error.code === "NOT_FOUND"
          ? 404
          : 409;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status }
      );
    }

    console.error("Register player failed:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while registering the player.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
