import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── GET /api/lineups/match/[fixtureId] ────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: { fixtureId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const match = await prisma.match.findUnique({
      where: { id: params.fixtureId },
      include: {
        homeClub: { select: { id: true, name: true, logo: true } },
        awayClub: { select: { id: true, name: true, logo: true } },
        matchLineups: {
          include: {
            starters: {
              include: {
                player: true,
              },
            },
            substitutes: {
              include: {
                player: true,
              },
              orderBy: { order: "asc" },
            },
            setPieces: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const homeLineup = match.matchLineups.find((l) => l.clubId === match.homeClubId) || null;
    const awayLineup = match.matchLineups.find((l) => l.clubId === match.awayClubId) || null;

    return NextResponse.json({
      matchId: match.id,
      matchday: match.matchday,
      status: match.status,
      homeClub: match.homeClub,
      awayClub: match.awayClub,
      homeLineup,
      awayLineup,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch match lineups" },
      { status: 500 }
    );
  }
}

// ── POST /api/lineups/match/[fixtureId] ───────────────────────────────
// Freezes a club's active ClubLineup into the MatchLineup
export async function POST(
  req: Request,
  { params }: { params: { fixtureId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const clubId = body.clubId || session.user.clubId;

    if (!clubId) {
      return NextResponse.json({ error: "clubId is required" }, { status: 400 });
    }

    if (
      session.user.role !== "ADMINISTRATOR" &&
      session.user.clubId !== clubId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const match = await prisma.match.findUnique({
      where: { id: params.fixtureId },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.homeClubId !== clubId && match.awayClubId !== clubId) {
      return NextResponse.json(
        { error: "Club is not participating in this match" },
        { status: 400 }
      );
    }

    // Check if existing match lineup is already locked
    const existingMatchLineup = await prisma.matchLineup.findUnique({
      where: { matchId_clubId: { matchId: match.id, clubId } },
    });

    if (existingMatchLineup?.lockedAt || match.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Match lineup is locked and immutable." },
        { status: 400 }
      );
    }

    // Fetch active ClubLineup template
    const clubLineup = await prisma.clubLineup.findUnique({
      where: { clubId },
      include: {
        starters: true,
        substitutes: true,
        setPieces: true,
      },
    });

    if (!clubLineup || clubLineup.starters.length < 11) {
      return NextResponse.json(
        { error: "Active club lineup is incomplete. Please set 11 starters first." },
        { status: 400 }
      );
    }

    // Freeze into MatchLineup
    const frozen = await prisma.$transaction(async (tx) => {
      // Upsert MatchLineup
      const ml = await tx.matchLineup.upsert({
        where: { matchId_clubId: { matchId: match.id, clubId } },
        create: {
          matchId: match.id,
          clubId,
          formation: clubLineup.formation,
          status: "CONFIRMED",
        },
        update: {
          formation: clubLineup.formation,
          status: "CONFIRMED",
        },
      });

      // Clear previous match starters/subs
      await tx.matchStarter.deleteMany({ where: { matchLineupId: ml.id } });
      await tx.matchSubstitute.deleteMany({ where: { matchLineupId: ml.id } });
      await tx.matchSetPiece.deleteMany({ where: { matchLineupId: ml.id } });

      // Insert frozen starters
      await tx.matchStarter.createMany({
        data: clubLineup.starters.map((s) => ({
          matchLineupId: ml.id,
          playerId: s.playerId,
          slotKey: s.slotKey,
          slotRole: s.slotRole,
          positionX: s.positionX,
          positionY: s.positionY,
          positionAffinity: s.positionAffinity,
        })),
      });

      // Insert frozen substitutes
      if (clubLineup.substitutes.length > 0) {
        await tx.matchSubstitute.createMany({
          data: clubLineup.substitutes.map((sub) => ({
            matchLineupId: ml.id,
            playerId: sub.playerId,
            order: sub.order,
          })),
        });
      }

      // Insert frozen set pieces
      if (clubLineup.setPieces.length > 0) {
        await tx.matchSetPiece.createMany({
          data: clubLineup.setPieces.map((sp) => ({
            matchLineupId: ml.id,
            playerId: sp.playerId,
            type: sp.type,
          })),
        });
      }

      return tx.matchLineup.findUnique({
        where: { id: ml.id },
        include: {
          starters: { include: { player: true } },
          substitutes: { include: { player: true } },
          setPieces: { include: { player: true } },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Match sheet lineup frozen successfully.",
      matchLineup: frozen,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to freeze match lineup" },
      { status: 500 }
    );
  }
}
