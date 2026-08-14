import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateClubPowerRatingsForSeason } from "@/lib/services/club-power-rating-service";

async function requireAdmin() {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    return null;
  }

  return session;
}

// GET /api/admin/seasons/[seasonId]
export async function GET(
  _req: Request,
  { params }: { params: { seasonId: string } }
) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const season = await prisma.season.findUnique({
    where: {
      id: params.seasonId,
    },
    include: {
      league: {
        include: {
          clubs: {
            orderBy: {
              name: "asc",
            },
          },
        },
      },
      classifications: {
        include: {
          club: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (!season) {
    return NextResponse.json(
      { error: "Season not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    season,
  });
}

// PATCH /api/admin/seasons/[seasonId]
export async function PATCH(
  req: Request,
  { params }: { params: { seasonId: string } }
) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  const status = body?.status;

  if (
    status !== undefined &&
    !["DRAFT", "ACTIVE", "FINISHED"].includes(status)
  ) {
    return NextResponse.json(
      { error: "Invalid season status." },
      { status: 400 }
    );
  }

  const season = await prisma.season.findUnique({
    where: {
      id: params.seasonId,
    },
    include: {
      classifications: {
        select: {
          clubId: true,
          position: true,
        },
      },
      league: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!season) {
    return NextResponse.json(
      { error: "Season not found." },
      { status: 404 }
    );
  }

  // Validate final classification before finishing.
  if (status === "FINISHED") {
    const clubCount = await prisma.club.count({
      where: {
        leagueId: season.league.id,
      },
    });

    if (season.classifications.length !== clubCount) {
      return NextResponse.json(
        {
          error:
            "Every club in the league must have a final classification before finishing the season.",
        },
        { status: 400 }
      );
    }

    const positions = season.classifications.map(
      (classification) => classification.position
    );

    const uniquePositions = new Set(positions);

    if (uniquePositions.size !== positions.length) {
      return NextResponse.json(
        {
          error:
            "Every club must have a unique classification position.",
        },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await prisma.season.update({
      where: {
        id: params.seasonId,
      },
      data: {
        status,
      },
    });

    // Update Club Power Ratings when the season is finished.
    if (status === "FINISHED") {
      const powerRatingResult =
        await updateClubPowerRatingsForSeason(season.id);

      return NextResponse.json({
        success: true,
        season: updated,
        powerRatings: powerRatingResult.updatedRatings,
      });
    }

    return NextResponse.json({
      success: true,
      season: updated,
    });
  } catch (error) {
    console.error("Update season failed:", error);

    return NextResponse.json(
      {
        error: "Could not update season.",
      },
      { status: 500 }
    );
  }
}