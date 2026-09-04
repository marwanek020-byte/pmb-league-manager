import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  try {
    let club = null;
    let nextMatch = null;

    if (session?.user?.clubId) {
      club = await prisma.club.findUnique({
        where: { id: session.user.clubId },
        select: {
          id: true,
          name: true,
          logo: true,
          budget: true,
        },
      });

      if (club) {
        nextMatch = await prisma.match.findFirst({
          where: {
            OR: [
              { homeClubId: club.id },
              { awayClubId: club.id },
            ],
            status: "UPCOMING",
          },
          include: {
            homeClub: { select: { id: true, name: true, logo: true } },
            awayClub: { select: { id: true, name: true, logo: true } },
          },
          orderBy: { matchday: "asc" },
        });
      }
    }

    // If no specific club match, pick any upcoming match or fallback
    if (!nextMatch) {
      nextMatch = await prisma.match.findFirst({
        where: { status: "UPCOMING" },
        include: {
          homeClub: { select: { id: true, name: true, logo: true } },
          awayClub: { select: { id: true, name: true, logo: true } },
        },
        orderBy: { matchday: "asc" },
      });
    }

    // Latest completed transfers (top 10 for the animated rotating mercato card)
    const recentTransfers = await prisma.transfer.findMany({
      where: { status: "COMPLETED" },
      include: {
        fromClub: { select: { id: true, name: true, logo: true } },
        toClub: { select: { id: true, name: true, logo: true } },
        player: { select: { id: true, fullName: true, position: true, photo: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const formattedTransfers = recentTransfers.map((t) => ({
      id: t.id,
      playerName: t.player?.fullName || "PLAYER",
      playerPhoto: t.player?.photo || null,
      position: t.player?.position || "FW",
      fromClub: t.fromClub,
      toClub: t.toClub,
      fee: Number(t.fee || 0),
    }));

    return NextResponse.json({
      user: session?.user || null,
      club: club
        ? {
            id: club.id,
            name: club.name,
            logo: club.logo,
            budget: Number(club.budget),
          }
        : {
            id: "default-far",
            name: "FAR RABAT",
            logo: null,
            budget: 9356790,
          },
      nextMatch: nextMatch
        ? {
            id: nextMatch.id,
            homeClub: nextMatch.homeClub,
            awayClub: nextMatch.awayClub,
            matchday: nextMatch.matchday,
            date: "25 MAY 2027",
            time: "20:00",
            stadium: "Grand Stadium de Rabat",
          }
        : {
            id: "default-match",
            homeClub: { id: "c1", name: "PMB FC", logo: null },
            awayClub: { id: "c2", name: "RABAT UNITED", logo: null },
            matchday: 1,
            date: "25 MAY 2027",
            time: "20:00",
            stadium: "Grand Stadium",
          },
      latestTransfer: formattedTransfers[0] || {
        id: "default-transfer",
        playerName: "CRYSENCIO SUMMERVILLE",
        playerPhoto: null,
        position: "WINGER",
        fromClub: { id: "t1", name: "TEAM A", logo: null },
        toClub: { id: "t2", name: "TEAM B", logo: null },
        fee: 45000000,
      },
      latestTransfers: formattedTransfers.length > 0 ? formattedTransfers : [
        {
          id: "default-transfer-1",
          playerName: "CRYSENCIO SUMMERVILLE",
          playerPhoto: null,
          position: "WINGER",
          fromClub: { id: "t1", name: "TEAM A", logo: null },
          toClub: { id: "t2", name: "TEAM B", logo: null },
          fee: 45000000,
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching app dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
