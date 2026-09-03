import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const agreedTerms = body.agreedTerms;

    if (!agreedTerms) {
      return NextResponse.json({ error: "Agreed terms are required." }, { status: 400 });
    }

    const result = await ExpiredContractsService.signFreeAgentDirect(
      session.user.clubId,
      params.playerId,
      agreedTerms
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sign free agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sign free agent." },
      { status: 400 }
    );
  }
}
