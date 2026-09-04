import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLiveAuctions } from "@/lib/services/auction-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId;

    if (!clubId) {
      const farRabat = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
      });
      clubId = farRabat?.id || (await prisma.club.findFirst())?.id;
    }

    const [auctionsData, club] = await Promise.all([
      getLiveAuctions(),
      clubId
        ? prisma.club.findUnique({
            where: { id: clubId },
            select: { id: true, name: true, logo: true, budget: true },
          })
        : null,
    ]);

    return NextResponse.json({
      activeAuctions: auctionsData.activeAuctions,
      recentAuctions: auctionsData.recentAuctions,
      myClub: {
        id: club?.id || clubId || "c1",
        name: club?.name || "Your Club",
        logo: club?.logo || null,
        budget: Number(club?.budget || 0),
      },
    });
  } catch (error) {
    console.error("GET /api/app/auctions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load auctions" },
      { status: 500 }
    );
  }
}
