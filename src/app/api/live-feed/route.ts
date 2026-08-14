import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [transfers, finishedSeasons, transferWindow] =
      await Promise.all([
        prisma.transfer.findMany({
          where: {
            status: "COMPLETED",
          },
          orderBy: {
            completedAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            playerName: true,
            fromClubName: true,
            toClubName: true,
            fee: true,
            currency: true,
            completedAt: true,
            type: true,
          },
        }),

        prisma.season.findMany({
          where: {
            status: "FINISHED",
          },
          orderBy: {
            endDate: "desc",
          },
          take: 5,
          select: {
            id: true,
            name: true,
            endDate: true,
            league: {
              select: {
                name: true,
              },
            },
            classifications: {
              where: {
                position: {
                  lte: 3,
                },
              },
              orderBy: {
                position: "asc",
              },
              select: {
                position: true,
                points: true,
                club: {
                  select: {
                    name: true,
                    logo: true,
                  },
                },
              },
            },
          },
        }),

        prisma.transferWindow.findUnique({
          where: {
            id: "singleton",
          },
          select: {
            isOpen: true,
          },
        }),
      ]);

    return NextResponse.json({
      transfers: transfers.map((transfer) => ({
        id: transfer.id,
        playerName: transfer.playerName,
        fromClubName: transfer.fromClubName,
        toClubName: transfer.toClubName,
        fee: transfer.fee ? Number(transfer.fee) : null,
        currency: transfer.currency,
        completedAt: transfer.completedAt,
        type: transfer.type,
      })),

      seasons: finishedSeasons.map((season) => ({
        id: season.id,
        name: season.name,
        leagueName: season.league.name,
        endDate: season.endDate,
        podium: season.classifications.map((classification) => ({
          position: classification.position,
          points: classification.points,
          clubName: classification.club.name,
          clubLogo: classification.club.logo,
        })),
      })),

      transferWindowOpen: transferWindow?.isOpen ?? false,
    });
  } catch (error) {
    console.error("Live feed error:", error);

    return NextResponse.json(
      {
        error: "Unable to load live feed",
      },
      {
        status: 500,
      },
    );
  }
}