import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasPostMatchService } from "@/lib/services/ultras-postmatch-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let targetClubId: string | undefined = session.user.clubId || undefined;
    if (!targetClubId) {
      const { prisma } = await import("@/lib/prisma");
      const defaultClub = (await prisma.club.findFirst({
        where: { name: { contains: "FAR" } },
      })) || (await prisma.club.findFirst());
      targetClubId = defaultClub?.id;
    }

    if (!targetClubId) {
      return NextResponse.json({ error: "No club found" }, { status: 404 });
    }

    const postmatch = await UltrasPostMatchService.generatePostMatchExperience(targetClubId);

    return NextResponse.json(postmatch);
  } catch (error: any) {
    console.error("[UltrasPostMatchRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to generate post-match experience" }, { status: 500 });
  }
}
