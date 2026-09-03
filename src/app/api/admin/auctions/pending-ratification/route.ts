import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const auctions = await prisma.auction.findMany({
    where: {
      status: "COMPLETED",
      personalTermsAgreed: true,
      adminApproved: false,
    },
    include: {
      player: {
        select: {
          id: true,
          fullName: true,
          position: true,
          overallRating: true,
          photo: true,
          nationality: true,
        },
      },
      currentWinnerClub: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serialized = auctions.map((a) => ({
    id: a.id,
    playerId: a.playerId,
    playerName: a.player.fullName,
    position: a.player.position,
    overallRating: a.player.overallRating,
    photo: a.player.photo,
    nationality: a.player.nationality,
    clubName: a.currentWinnerClub?.name || "Unknown Club",
    clubId: a.currentWinnerClubId,
    bidFee: Number(a.currentBid),
    salary: Number(a.agreedSalary || 0),
    prime: Number(a.agreedPrime || 0),
    seasons: a.agreedSeasons || 1,
    role: a.agreedRole || "IMPORTANT",
    releaseClause: a.agreedReleaseClause ? Number(a.agreedReleaseClause) : null,
    updatedAt: a.updatedAt.toISOString(),
  }));

  return NextResponse.json({ auctions: serialized });
}
