import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UltrasMatchdayService } from "@/lib/services/ultras-matchday-service";

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

    const briefing = await UltrasMatchdayService.generateMatchdayBriefing(targetClubId);

    return NextResponse.json(briefing);
  } catch (error: any) {
    console.error("[UltrasMatchdayRoute Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to generate matchday briefing" }, { status: 500 });
  }
}
