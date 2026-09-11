import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { processManagerMatchSubmission } from "@/lib/services/manager-submission-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.clubId) {
      return NextResponse.json(
        { error: "Unauthorized. You must be logged in as a club manager." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { images, apiKey } = body;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Please upload at least one screenshot (Full Time stats and Goal/Assist cards)." },
        { status: 400 }
      );
    }

    const result = await processManagerMatchSubmission({
      matchId: params.matchId,
      submittingClubId: session.user.clubId,
      submittingUserId: session.user.id,
      images,
      apiKey,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process match submission." },
      { status: 400 }
    );
  }
}
