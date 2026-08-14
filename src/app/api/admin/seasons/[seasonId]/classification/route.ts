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

type ClassificationInput = {
  clubId: string;
  position: number;
  points?: number;
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalDifference?: number;
  goalsFor?: number;
  goalsAgainst?: number;
};

export async function PUT(
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

  if (!Array.isArray(body?.classifications)) {
    return NextResponse.json(
      { error: "Classifications must be an array." },
      { status: 400 }
    );
  }

  const classifications =
    body.classifications as ClassificationInput[];

  const season = await prisma.season.findUnique({
    where: { id: params.seasonId },
    include: {
      league: {
        include: {
          clubs: {
            select: {
              id: true,
            },
          },
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

  if (season.status === "FINISHED") {
    return NextResponse.json(
      {
        error:
          "This season is finished. Its classification can no longer be changed.",
      },
      { status: 409 }
    );
  }

  const leagueClubIds = new Set(
    season.league.clubs.map((club) => club.id)
  );

  const positions = new Set<number>();

  for (const row of classifications) {
    if (!row.clubId || !leagueClubIds.has(row.clubId)) {
      return NextResponse.json(
        {
          error:
            "Every classification club must belong to the season's league.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(row.position) ||
      row.position < 1 ||
      row.position > season.league.clubs.length
    ) {
      return NextResponse.json(
        { error: `Invalid position for club ${row.clubId}.` },
        { status: 400 }
      );
    }

    if (positions.has(row.position)) {
      return NextResponse.json(
        { error: "Two clubs cannot have the same position." },
        { status: 400 }
      );
    }

    positions.add(row.position);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.seasonClassification.deleteMany({
        where: {
          seasonId: params.seasonId,
        },
      });

      if (classifications.length > 0) {
        await tx.seasonClassification.createMany({
          data: classifications.map((row) => ({
            seasonId: params.seasonId,
            clubId: row.clubId,
            position: row.position,
            points: row.points ?? null,
            played: row.played ?? null,
            wins: row.wins ?? null,
            draws: row.draws ?? null,
            losses: row.losses ?? null,
            goalDifference: row.goalDifference ?? null,
            goalsFor: row.goalsFor ?? null,
            goalsAgainst: row.goalsAgainst ?? null,
          })),
        });
      }
    });

    return NextResponse.json({
      success: true,
      count: classifications.length,
    });
  } catch (error) {
    console.error("Save classification failed:", error);

    return NextResponse.json(
      { error: "Could not save classification." },
      { status: 500 }
    );
  }
}