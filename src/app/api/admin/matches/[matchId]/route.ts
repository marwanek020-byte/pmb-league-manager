import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

type RouteContext = { params: { matchId: string } };

// GET /api/admin/matches/[matchId]
export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      homeClub: { select: { id: true, name: true, logo: true } },
      awayClub: { select: { id: true, name: true, logo: true } },
      league: { select: { id: true, name: true } },
      season: { select: { id: true, name: true, status: true } },
      competitionSeason: { select: { id: true, name: true, status: true } },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  return NextResponse.json({ match });
}

// PATCH /api/admin/matches/[matchId]
// Enter or correct a match result
export async function PATCH(
  req: Request,
  { params }: RouteContext
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  // Validate scores
  const homeGoals = body?.homeGoals;
  const awayGoals = body?.awayGoals;

  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0 ||
    homeGoals > 99 ||
    awayGoals > 99
  ) {
    return NextResponse.json(
      { error: "homeGoals and awayGoals must be integers between 0 and 99." },
      { status: 400 }
    );
  }

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      season: { select: { status: true } },
      competitionSeason: { select: { status: true } },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  if (match.competitionSeason.status === "FINISHED") {
    return NextResponse.json(
      { error: "Cannot edit results — competition season is finished." },
      { status: 409 }
    );
  }

  // Allow result entry/correction — standings are always derived from all Match records,
  // so correcting a result is just updating the score; no extra recalculation needed.
  const updated = await prisma.match.update({
    where: { id: params.matchId },
    data: {
      homeGoals,
      awayGoals,
      status: "COMPLETED",
      playedAt: match.status === "UPCOMING" ? new Date() : match.playedAt,
    },
    include: {
      homeClub: { select: { id: true, name: true, logo: true } },
      awayClub: { select: { id: true, name: true, logo: true } },
    },
  });

  return NextResponse.json({ success: true, match: updated });
}
