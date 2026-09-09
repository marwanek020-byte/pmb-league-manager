import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FormationName, PlayerSlotRole, SetPieceType } from "@prisma/client";
import { FORMATIONS, FormationKey, calculatePositionAffinity } from "@/lib/formations";
import { isMoroccanNationality } from "@/lib/services/botola-contract-service";
import { serializePlayer } from "@/lib/serialize-player";

export const dynamic = "force-dynamic";

interface StarterPayload {
  playerId: string;
  slotKey: string;
  slotRole: string;
  positionX: number;
  positionY: number;
}

interface SubstitutePayload {
  playerId: string;
  order: number;
}

interface SetPiecePayload {
  playerId: string;
  type: string; // PENALTY, FREE_KICK_SHORT, FREE_KICK_LONG, CORNER_LEFT, CORNER_RIGHT, CAPTAIN, VICE_CAPTAIN
}

// ── GET /api/lineups/club/[clubId] ────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: { clubId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const club = await prisma.club.findUnique({
      where: { id: params.clubId },
      include: {
        players: {
          where: { status: "REGISTERED" },
          orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
        },
        lineup: {
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

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Check permission: Club manager can view their club, Admin can view any
    if (
      session.user.role !== "ADMINISTRATOR" &&
      session.user.clubId !== club.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serializedSquad = club.players.map(serializePlayer);

    return NextResponse.json({
      clubId: club.id,
      clubName: club.name,
      lineup: club.lineup,
      squad: serializedSquad,
    });
  } catch (err: any) {
    console.error("GET club lineup error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch lineup" },
      { status: 500 }
    );
  }
}

// ── POST / PUT /api/lineups/club/[clubId] ──────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: { clubId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== "ADMINISTRATOR" &&
      session.user.clubId !== params.clubId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      formation = "F433",
      starters = [],
      substitutes = [],
      setPieces = [],
    }: {
      formation: FormationKey;
      starters: StarterPayload[];
      substitutes: SubstitutePayload[];
      setPieces: SetPiecePayload[];
    } = body;

    // 1. Validation: Formation exists
    if (!FORMATIONS[formation]) {
      return NextResponse.json(
        { error: `Invalid formation: ${formation}` },
        { status: 400 }
      );
    }

    // 2. Validation: Exactly 11 starters
    if (!Array.isArray(starters) || starters.length !== 11) {
      return NextResponse.json(
        { error: `Lineup must contain exactly 11 starting players (received ${starters.length}).` },
        { status: 400 }
      );
    }

    // 3. Validation: Unique starter players
    const starterPlayerIds = starters.map((s) => s.playerId);
    const uniqueStarterIds = new Set(starterPlayerIds);
    if (uniqueStarterIds.size !== 11) {
      return NextResponse.json(
        { error: "Duplicate players detected in starting XI." },
        { status: 400 }
      );
    }

    // 4. Validation: Verify all players belong to this club and are REGISTERED
    const allPlayerIds = [
      ...starterPlayerIds,
      ...substitutes.map((s) => s.playerId),
    ];
    const registeredPlayers = await prisma.player.findMany({
      where: {
        id: { in: allPlayerIds },
        pmbClubId: params.clubId,
        status: "REGISTERED",
      },
      select: {
        id: true,
        fullName: true,
        position: true,
        nationality: true,
        overallRating: true,
      },
    });

    const registeredMap = new Map(registeredPlayers.map((p) => [p.id, p]));
    if (registeredMap.size !== allPlayerIds.length) {
      return NextResponse.json(
        { error: "One or more selected players are not registered to this club." },
        { status: 400 }
      );
    }

    // 5. Validation: Goalkeeper in GK slot
    const gkSlot = starters.find(
      (s) => s.slotRole === "GK" || s.slotKey.toLowerCase() === "gk"
    );
    if (!gkSlot) {
      return NextResponse.json(
        { error: "Starting XI must include a Goalkeeper (GK)." },
        { status: 400 }
      );
    }

    // 6. Calculate position affinities and build starters data
    const startersData = starters.map((s) => {
      const p = registeredMap.get(s.playerId)!;
      const affinity = calculatePositionAffinity(p.position, s.slotRole as any);
      return {
        playerId: s.playerId,
        slotKey: s.slotKey,
        slotRole: s.slotRole as PlayerSlotRole,
        positionX: Number(s.positionX),
        positionY: Number(s.positionY),
        positionAffinity: affinity,
      };
    });

    // 7. Validate Foreign Quota (Botola Pro allows max 5 foreign players in matchday sheet)
    const foreignStarters = starters.filter((s) => {
      const p = registeredMap.get(s.playerId);
      return p && !isMoroccanNationality(p.nationality);
    });

    if (foreignStarters.length > 5) {
      return NextResponse.json(
        {
          error: `Foreign player quota exceeded! Maximum 5 foreign players allowed in Starting XI (fielded ${foreignStarters.length}).`,
        },
        { status: 400 }
      );
    }

    // 8. Execute transactional save
    const savedLineup = await prisma.$transaction(async (tx) => {
      // Find or create ClubLineup
      const existing = await tx.clubLineup.findUnique({
        where: { clubId: params.clubId },
      });

      let lineupId = existing?.id;

      if (!existing) {
        const created = await tx.clubLineup.create({
          data: {
            clubId: params.clubId,
            formation: formation as FormationName,
            status: "CONFIRMED",
          },
        });
        lineupId = created.id;
      } else {
        await tx.clubLineup.update({
          where: { id: lineupId },
          data: {
            formation: formation as FormationName,
            status: "CONFIRMED",
          },
        });
        // Clear previous relations
        await tx.lineupStarter.deleteMany({ where: { lineupId } });
        await tx.lineupSubstitute.deleteMany({ where: { lineupId } });
        await tx.setPieceAssignment.deleteMany({ where: { lineupId } });
      }

      // Insert starters
      await tx.lineupStarter.createMany({
        data: startersData.map((s) => ({
          lineupId: lineupId!,
          ...s,
        })),
      });

      // Insert substitutes (up to 12)
      const validSubs = substitutes.slice(0, 12).map((sub, idx) => ({
        lineupId: lineupId!,
        playerId: sub.playerId,
        order: idx,
      }));

      if (validSubs.length > 0) {
        await tx.lineupSubstitute.createMany({
          data: validSubs,
        });
      }

      // Insert set piece assignments
      const validSetPieces = setPieces
        .filter((sp) =>
          ["PENALTY", "FREE_KICK_SHORT", "FREE_KICK_LONG", "CORNER_LEFT", "CORNER_RIGHT", "CAPTAIN", "VICE_CAPTAIN"].includes(
            sp.type
          )
        )
        .map((sp) => ({
          lineupId: lineupId!,
          playerId: sp.playerId,
          type: sp.type as SetPieceType,
        }));

      if (validSetPieces.length > 0) {
        await tx.setPieceAssignment.createMany({
          data: validSetPieces,
        });
      }

      return tx.clubLineup.findUnique({
        where: { id: lineupId },
        include: {
          starters: { include: { player: true } },
          substitutes: { include: { player: true }, orderBy: { order: "asc" } },
          setPieces: { include: { player: true } },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Tactical Lineup successfully saved.",
      lineup: savedLineup,
    });
  } catch (err: any) {
    console.error("POST club lineup error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save lineup" },
      { status: 500 }
    );
  }
}

export const PUT = POST;

// ── DELETE /api/lineups/club/[clubId] ─────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: { clubId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== "ADMINISTRATOR" &&
      session.user.clubId !== params.clubId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.clubLineup.deleteMany({
      where: { clubId: params.clubId },
    });

    return NextResponse.json({ success: true, message: "Lineup cleared." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete lineup" },
      { status: 500 }
    );
  }
}
