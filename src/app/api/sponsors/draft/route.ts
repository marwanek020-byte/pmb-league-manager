import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSponsorDraftState, makeDraftPick } from "@/lib/services/sponsor-service";
import { isAnyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const state = await getSponsorDraftState();

    return NextResponse.json({
      ...state,
      userClubId: session?.user?.clubId ?? null,
      isAdmin: Boolean(session?.user && isAnyAdmin(session.user)),
    });
  } catch (error: any) {
    console.error("Error fetching sponsor draft state:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load sponsor draft" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = isAnyAdmin(session.user);

  try {
    const body = await req.json();
    const { clubId, sponsorId } = body;

    if (!sponsorId) {
      return NextResponse.json({ error: "sponsorId is required" }, { status: 400 });
    }

    const effectiveClubId = isAdmin ? clubId || session.user.clubId : session.user.clubId;

    if (!effectiveClubId) {
      return NextResponse.json(
        { error: "No club specified for this pick" },
        { status: 400 }
      );
    }

    const result = await makeDraftPick({
      clubId: effectiveClubId,
      sponsorId,
      actorUserId: session.user.id,
      isAdmin,
    });

    const updatedState = await getSponsorDraftState();

    return NextResponse.json({
      ...result,
      state: updatedState,
    });
  } catch (error: any) {
    console.error("Error making sponsor draft pick:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit sponsor draft pick" },
      { status: 400 }
    );
  }
}
