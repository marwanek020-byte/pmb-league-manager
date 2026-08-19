import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeStandings, computeClassificationSnapshot } from "@/lib/services/standings-service";
import { updateClubPowerRatingsForSeason } from "@/lib/services/club-power-rating-service";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

type RouteContext = { params: { csId: string } };

// GET /api/admin/competition-seasons/[csId]
export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cs = await prisma.competitionSeason.findUnique({
    where: { id: params.csId },
    include: {
      seasons: {
        include: {
          league: {
            include: {
              clubs: { select: { id: true, name: true, logo: true } },
            },
          },
          _count: { select: { matches: true, classifications: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { matches: true } },
    },
  });

  if (!cs) {
    return NextResponse.json({ error: "Competition season not found." }, { status: 404 });
  }

  return NextResponse.json({ competitionSeason: cs });
}

// PATCH /api/admin/competition-seasons/[csId]
export async function PATCH(
  req: Request,
  { params }: RouteContext
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const newStatus = body?.status;

  if (
    newStatus !== undefined &&
    !["DRAFT", "ACTIVE", "FINISHED"].includes(newStatus)
  ) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const cs = await prisma.competitionSeason.findUnique({
    where: { id: params.csId },
    include: {
      seasons: {
        select: { id: true, leagueId: true, status: true },
      },
    },
  });

  if (!cs) {
    return NextResponse.json({ error: "Competition season not found." }, { status: 404 });
  }

  try {
    const updated = await prisma.competitionSeason.update({
      where: { id: params.csId },
      data: { status: newStatus },
    });

    // When finishing: snapshot standings into SeasonClassification for each league season
    // and update club power ratings
    if (newStatus === "FINISHED") {
      for (const season of cs.seasons) {
        const matches = await prisma.match.findMany({
          where: { seasonId: season.id },
        });

        const clubs = await prisma.club.findMany({
          where: { leagueId: season.leagueId },
          select: { id: true, name: true, logo: true },
        });

        const standings = computeStandings(matches, clubs);
        const snapshot = computeClassificationSnapshot(standings, season.id);

        // Upsert the classification snapshot
        await prisma.$transaction(async (tx) => {
          await tx.seasonClassification.deleteMany({
            where: { seasonId: season.id },
          });
          if (snapshot.length > 0) {
            await tx.seasonClassification.createMany({ data: snapshot });
          }
          // Mark the per-league season as FINISHED too
          await tx.season.update({
            where: { id: season.id },
            data: { status: "FINISHED" },
          });
        });

        // Update power ratings
        try {
          await updateClubPowerRatingsForSeason(season.id);
        } catch (err) {
          console.error(`Power rating update failed for season ${season.id}:`, err);
        }
      }
    }

    // When activating: mark all per-league seasons as ACTIVE
    if (newStatus === "ACTIVE") {
      await prisma.season.updateMany({
        where: { competitionSeasonId: params.csId },
        data: { status: "ACTIVE" },
      });
    }

    return NextResponse.json({ success: true, competitionSeason: updated });
  } catch (error) {
    console.error("Update competition season failed:", error);
    return NextResponse.json(
      { error: "Could not update competition season." },
      { status: 500 }
    );
  }
}
