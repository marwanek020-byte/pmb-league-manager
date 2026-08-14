import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createPlayerForClub, PlayerRegistrationError } from "@/lib/player-registration";
import { serializePlayer } from "@/lib/serialize-player";

type CreatePlayerBody = {
  firstName?: string;
  lastName?: string;
  position?: string;
  nationality?: string;
  overallRating?: number;
  marketValue?: number;
};

// Creates a brand-new player directly under the caller's own club - this
// is NOT the same operation as /api/manager/players/register, which
// requires an existing Available player id from the global pool. This
// endpoint creates the Player row itself.
export async function POST(req: Request) {
  const session = await auth();

  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CreatePlayerBody | null;

  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim();
  const position = body?.position?.trim();
  const nationality = body?.nationality?.trim();

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First name and last name are required." },
      { status: 400 }
    );
  }
  if (!position) {
    return NextResponse.json({ error: "Position is required." }, { status: 400 });
  }
  if (!nationality) {
    return NextResponse.json({ error: "Nationality is required." }, { status: 400 });
  }
  if (
    body?.overallRating != null &&
    (typeof body.overallRating !== "number" || body.overallRating < 0 || body.overallRating > 99)
  ) {
    return NextResponse.json(
      { error: "Overall rating must be a number between 0 and 99." },
      { status: 400 }
    );
  }
  if (body?.marketValue != null && (typeof body.marketValue !== "number" || body.marketValue < 0)) {
    return NextResponse.json({ error: "Market value cannot be negative." }, { status: 400 });
  }

  try {
    // clubId always comes from the verified session, never from the
    // request body - same rule as every other player/transfer mutation
    // in this app.
    const player = await createPlayerForClub(session.user.clubId, {
      fullName: `${firstName} ${lastName}`,
      position,
      nationality,
      overallRating: body?.overallRating ?? null,
      marketValue: body?.marketValue ?? null,
    });

    return NextResponse.json({ player: serializePlayer(player) }, { status: 201 });
  } catch (err) {
    if (err instanceof PlayerRegistrationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "NOT_FOUND" ? 404 : 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
