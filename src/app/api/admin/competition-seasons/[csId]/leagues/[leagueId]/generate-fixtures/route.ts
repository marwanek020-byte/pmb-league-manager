import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateFixtures } from "@/lib/services/fixture-generator";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

type RouteContext = { params: { csId: string; leagueId: string } };

// POST /api/admin/competition-seasons/[csId]/leagues/[leagueId]/generate-fixtures
export async function POST(
  _req: Request,
  { params }: RouteContext
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { csId, leagueId } = params;

  // Load the competition season
  const competitionSeason = await prisma.competitionSeason.findUnique({
    where: { id: csId },
  });

  if (!competitionSeason) {
    return NextResponse.json(
      { error: "Competition season not found." },
      { status: 404 }
    );
  }

  if (competitionSeason.status === "FINISHED") {
    return NextResponse.json(
      { error: "Cannot generate fixtures for a finished competition season." },
      { status: 409 }
    );
  }

  // Load the league
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      clubs: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found." }, { status: 404 });
  }

  if (league.clubs.length < 2) {
    return NextResponse.json(
      { error: "At least 2 clubs are required to generate fixtures." },
      { status: 400 }
    );
  }

  // Find or create the per-league Season record linked to this CompetitionSeason
  let season = await prisma.season.findFirst({
    where: {
      leagueId,
      competitionSeasonId: csId,
    },
  });

  if (!season) {
    season = await prisma.season.create({
      data: {
        name: competitionSeason.name,
        leagueId,
        competitionSeasonId: csId,
        status: competitionSeason.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
      },
    });
  }

  // Prevent duplicate fixture generation for this season
  const existingCount = await prisma.match.count({
    where: { seasonId: season.id },
  });

  if (existingCount > 0) {
    return NextResponse.json(
      {
        error: `Fixtures already generated for ${league.name} in this competition season (${existingCount} matches). Delete them first if you need to regenerate.`,
      },
      { status: 409 }
    );
  }

  // Generate fixtures using Berger algorithm
  const clubIds = league.clubs.map((c) => c.id);
  const isDouble = competitionSeason.format === "DOUBLE_ROUND_ROBIN";

  let fixtures: { matchday: number; homeClubId: string; awayClubId: string }[];
  try {
    fixtures = generateFixtures(clubIds, isDouble);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Fixture generation failed." },
      { status: 500 }
    );
  }

  // Insert all fixtures in a single transaction
  await prisma.$transaction(async (tx) => {
    await tx.match.createMany({
      data: fixtures.map((f) => ({
        competitionSeasonId: csId,
        seasonId: season!.id,
        leagueId,
        matchday: f.matchday,
        homeClubId: f.homeClubId,
        awayClubId: f.awayClubId,
        status: "UPCOMING",
      })),
    });
  });

  const matchdays = fixtures.length > 0
    ? Math.max(...fixtures.map((f) => f.matchday))
    : 0;

  return NextResponse.json(
    {
      success: true,
      seasonId: season.id,
      leagueName: league.name,
      clubCount: clubIds.length,
      matchdays,
      matchesCreated: fixtures.length,
    },
    { status: 201 }
  );
}

// DELETE /api/admin/competition-seasons/[csId]/leagues/[leagueId]/generate-fixtures
// Allows resetting fixtures for a league (only if no completed matches exist)
export async function DELETE(
  _req: Request,
  { params }: RouteContext
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { csId, leagueId } = params;

  const season = await prisma.season.findFirst({
    where: { leagueId, competitionSeasonId: csId },
    include: { _count: { select: { matches: true } } },
  });

  if (!season) {
    return NextResponse.json({ error: "No season found for this league." }, { status: 404 });
  }

  // Block deletion if any result has been entered
  const completedCount = await prisma.match.count({
    where: { seasonId: season.id, status: "COMPLETED" },
  });

  if (completedCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete fixtures — ${completedCount} match(es) have already been completed. Deleting results would corrupt the competition.`,
      },
      { status: 409 }
    );
  }

  await prisma.match.deleteMany({ where: { seasonId: season.id } });

  return NextResponse.json({ success: true, deleted: season._count.matches });
}
