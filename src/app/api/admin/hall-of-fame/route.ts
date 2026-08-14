import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    return null;
  }

  return session;
}

export async function GET() {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    /*
     * ---------------------------------------------------------
     * FINISHED SEASONS
     * ---------------------------------------------------------
     */
    const finishedSeasons = await prisma.season.findMany({
      where: {
        status: "FINISHED",
      },
      orderBy: [
        {
          endDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        league: {
          select: {
            id: true,
            name: true,
            country: true,
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
          include: {
            club: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    /*
     * ---------------------------------------------------------
     * CLUB POWER RATINGS
     * ---------------------------------------------------------
     */
    const ratings = await prisma.clubPowerRating.findMany({
      orderBy: [
        {
          rating: "desc",
        },
        {
          titles: "desc",
        },
      ],
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    /*
     * ---------------------------------------------------------
     * CLUB SEASON HISTORY
     * ---------------------------------------------------------
     */
    const allClassifications =
      await prisma.seasonClassification.findMany({
        where: {
          season: {
            status: "FINISHED",
          },
        },
        orderBy: {
          season: {
            createdAt: "desc",
          },
        },
        include: {
          season: {
            select: {
              id: true,
              name: true,
              league: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

    /*
     * Group classifications by club.
     */
    const historyByClub = new Map<
      string,
      {
        seasonId: string;
        seasonName: string;
        leagueName: string;
        position: number;
      }[]
    >();

    for (const classification of allClassifications) {
      const existing =
        historyByClub.get(classification.clubId) ?? [];

      existing.push({
        seasonId: classification.seasonId,
        seasonName: classification.season.name,
        leagueName: classification.season.league.name,
        position: classification.position,
      });

      historyByClub.set(
        classification.clubId,
        existing
      );
    }

    /*
     * ---------------------------------------------------------
     * HALL OF FAME CLUBS
     * ---------------------------------------------------------
     */
    const hallOfFame = ratings.map((rating) => {
      const seasons =
        historyByClub.get(rating.clubId) ?? [];

      const bestPosition =
        seasons.length > 0
          ? Math.min(
              ...seasons.map(
                (season) => season.position
              )
            )
          : 0;

      return {
        clubId: rating.clubId,
        clubName: rating.club.name,
        clubLogo: rating.club.logo,

        titles: rating.titles,
        topThree: rating.topThree,
        topFive: rating.topFive,
        seasonsPlayed: rating.seasonsPlayed,

        bestPosition,

        powerRating: rating.rating,

        seasons,
      };
    });

    /*
     * ---------------------------------------------------------
     * HISTORICAL SEASON TABLE
     * ---------------------------------------------------------
     */
    const historicalSeasons = finishedSeasons.map(
      (season) => {
        const first = season.classifications.find(
          (item) => item.position === 1
        );

        const second = season.classifications.find(
          (item) => item.position === 2
        );

        const third = season.classifications.find(
          (item) => item.position === 3
        );

        return {
          seasonId: season.id,
          seasonName: season.name,

          leagueId: season.league.id,
          leagueName: season.league.name,
          country: season.league.country,

          champion: first
            ? {
                clubId: first.club.id,
                clubName: first.club.name,
                clubLogo: first.club.logo,
              }
            : null,

          runnerUp: second
            ? {
                clubId: second.club.id,
                clubName: second.club.name,
                clubLogo: second.club.logo,
              }
            : null,

          thirdPlace: third
            ? {
                clubId: third.club.id,
                clubName: third.club.name,
                clubLogo: third.club.logo,
              }
            : null,

          startDate: season.startDate
            ? season.startDate.toISOString()
            : null,

          endDate: season.endDate
            ? season.endDate.toISOString()
            : null,

          createdAt: season.createdAt.toISOString(),
        };
      }
    );

    return NextResponse.json({
      hallOfFame,
      historicalSeasons,
      totalFinishedSeasons: finishedSeasons.length,
    });
  } catch (error) {
    console.error(
      "Load Hall of Fame failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Could not load Hall of Fame.",
      },
      {
        status: 500,
      }
    );
  }
}