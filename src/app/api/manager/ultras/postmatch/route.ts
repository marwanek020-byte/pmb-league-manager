import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasPostMatchService } from "@/lib/services/ultras-postmatch-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized or no club assigned" }, { status: 401 });
    }

    const postmatch = await UltrasPostMatchService.generatePostMatchExperience(session.user.clubId);

    return NextResponse.json(postmatch);
  } catch (error: any) {
    console.error("[UltrasPostMatchRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to generate post-match experience" }, { status: 500 });
  }
}
