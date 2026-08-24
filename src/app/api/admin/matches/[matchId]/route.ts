import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyMatchRewards, reverseMatchRewards } from "@/lib/services/match-reward-service";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";
import { MatchEventType } from "@prisma/client";

export const dynamic = "force-dynamic";

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
      homeClub: {
        select: {
          id: true,
          name: true,
          logo: true,
          players: {
            select: { id: true, fullName: true, position: true, overallRating: true, photo: true },
            orderBy: { overallRating: "desc" },
          },
        },
      },
      awayClub: {
        select: {
          id: true,
          name: true,
          logo: true,
          players: {
            select: { id: true, fullName: true, position: true, overallRating: true, photo: true },
            orderBy: { overallRating: "desc" },
          },
        },
      },
      league: { select: { id: true, name: true } },
      season: { select: { id: true, name: true, status: true } },
      competitionSeason: { select: { id: true, name: true, status: true } },
      manOfTheMatch: { select: { id: true, fullName: true, position: true, photo: true } },
      events: {
        include: {
          player: { select: { id: true, fullName: true, position: true } },
          assistPlayer: { select: { id: true, fullName: true } },
          club: { select: { id: true, name: true } },
        },
        orderBy: { minute: "asc" },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  return NextResponse.json({ match });
}

// PATCH /api/admin/matches/[matchId]
// Enter or correct a match result with goals, assists, and MOTM
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
  const manOfTheMatchId = body?.manOfTheMatchId || null;
  const events = Array.isArray(body?.events) ? body.events : null;

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

  // Wrap match update + budget rewards + match events in a single atomic transaction.
  const updated = await prisma.$transaction(async (tx) => {
    const updatedMatch = await tx.match.update({
      where: { id: params.matchId },
      data: {
        homeGoals,
        awayGoals,
        manOfTheMatchId,
        status: "COMPLETED",
        playedAt: match.status === "UPCOMING" ? new Date() : match.playedAt,
      },
      include: {
        homeClub: { select: { id: true, name: true, logo: true } },
        awayClub: { select: { id: true, name: true, logo: true } },
        manOfTheMatch: { select: { id: true, fullName: true, position: true, photo: true } },
      },
    });

    // If events array is provided, replace match events
    if (events !== null) {
      await tx.matchEvent.deleteMany({
        where: { matchId: params.matchId },
      });

      if (events.length > 0) {
        const eventsData = events.map((ev: {
          clubId: string;
          playerId: string;
          assistPlayerId?: string | null;
          type?: MatchEventType;
          minute?: number | null;
        }) => ({
          matchId: params.matchId,
          clubId: ev.clubId,
          playerId: ev.playerId,
          assistPlayerId: ev.assistPlayerId || null,
          type: ev.type ?? MatchEventType.GOAL,
          minute: typeof ev.minute === "number" ? ev.minute : null,
        }));

        await tx.matchEvent.createMany({
          data: eventsData,
        });
      }
    }

    // Apply (or re-apply) budget rewards
    await applyMatchRewards(
      tx,
      params.matchId,
      match.homeClubId,
      match.awayClubId,
      homeGoals,
      awayGoals,
    );

    return updatedMatch;
  });

  // Automatically generate breaking post-match report, Ultras comments & manager inbox direct messages
  UltrasSocialService.publishPostMatchReport(params.matchId).catch((err) => {
    console.error("[MatchdayAdmin] Failed to trigger Ultras post-match report:", err);
  });

  return NextResponse.json({ success: true, match: updated });
}

// DELETE /api/admin/matches/[matchId]
// Completely CANCEL and RESET a match result back to UPCOMING (as if it never happened)
export async function DELETE(
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
      competitionSeason: { select: { status: true } },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  if (match.competitionSeason.status === "FINISHED") {
    return NextResponse.json(
      { error: "Cannot cancel results — competition season is finished." },
      { status: 409 }
    );
  }

  // Atomically reverse financial rewards, clear match events, and reset match to UPCOMING
  const resetMatch = await prisma.$transaction(async (tx) => {
    // 1. Reverse all budget rewards for this match
    await reverseMatchRewards(tx, params.matchId);

    // 2. Delete all match events (goals, assists, cards, etc.)
    await tx.matchEvent.deleteMany({
      where: { matchId: params.matchId },
    });

    // 3. Reset match properties back to UPCOMING
    const updated = await tx.match.update({
      where: { id: params.matchId },
      data: {
        homeGoals: null,
        awayGoals: null,
        manOfTheMatchId: null,
        status: "UPCOMING",
        playedAt: null,
      },
      include: {
        homeClub: { select: { id: true, name: true, logo: true } },
        awayClub: { select: { id: true, name: true, logo: true } },
      },
    });

    return updated;
  });

  return NextResponse.json({
    success: true,
    message: "Match result successfully cancelled and reset to UPCOMING.",
    match: resetMatch,
  });
}
