import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const nameQuery = searchParams.get("name")?.trim();

  if (!nameQuery) {
    return NextResponse.json({ matches: [], total: 0 });
  }

  try {
    const players = await prisma.player.findMany({
      where: {
        fullName: {
          contains: nameQuery,
          mode: "insensitive",
        },
      },
      include: {
        pmbClub: {
          select: {
            id: true,
            name: true,
            logo: true,
            league: { select: { name: true } },
            manager: { select: { username: true } },
          },
        },
      },
      take: 8,
      orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
    });

    const matches = players.map((p) => {
      const isRegisteredToClub = p.pmbClubId !== null && p.status === "REGISTERED";
      const clubName = p.pmbClub?.name ?? null;

      return {
        id: p.id,
        fullName: p.fullName || "Unknown Player",
        position: (p.position || "CF").toUpperCase(),
        overallRating: p.overallRating ?? 75,
        nationality: p.nationality || "Morocco",
        realClub: p.realClub || "Free Agent",
        marketValue: Number(p.marketValue ?? 0),
        photo: p.photo,
        status: p.status,
        hasClub: isRegisteredToClub,
        pmbClub: p.pmbClub
          ? {
              id: p.pmbClub.id,
              name: p.pmbClub.name,
              logo: p.pmbClub.logo,
              leagueName: p.pmbClub.league?.name,
              managerUsername: p.pmbClub.manager?.username,
            }
          : null,
        canAuction: !isRegisteredToClub,
        statusReason: isRegisteredToClub
          ? `Impossible — ${p.fullName} is currently registered to ${clubName}. Players under active club contracts cannot be placed on auction.`
          : `Available — ${p.fullName} is an unattached free agent.`,
      };
    });

    return NextResponse.json({
      query: nameQuery,
      matches,
      total: matches.length,
    });
  } catch (error: any) {
    console.error("GET /api/admin/auctions/check-player error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check player" },
      { status: 500 }
    );
  }
}
