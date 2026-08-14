import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { clubId: string; playerId: string } }
) {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json(
      { error: "Unauthorized", code: "FORBIDDEN" },
      { status: 401 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          id: string;
          fullName: string;
          status: string;
          pmbClubId: string | null;
        }[]
      >(
        Prisma.sql`
          SELECT "id", "fullName", "status", "pmbClubId"
          FROM "Player"
          WHERE "id" = ${params.playerId}
          FOR UPDATE
        `
      );

      const player = rows[0];

      if (!player) {
        throw new Error("PLAYER_NOT_FOUND");
      }

      if (
        player.status !== "REGISTERED" ||
        player.pmbClubId !== params.clubId
      ) {
        throw new Error("PLAYER_NOT_IN_CLUB");
      }

      const updated = await tx.player.update({
        where: { id: params.playerId },
        data: {
          status: "AVAILABLE",
          pmbClubId: null,
        },
        select: {
          id: true,
          fullName: true,
        },
      });

      return updated;
    });

    return NextResponse.json({
      player: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PLAYER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Player not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === "PLAYER_NOT_IN_CLUB") {
      return NextResponse.json(
        { error: "This player is not registered to this club.", code: "INVALID_CLUB" },
        { status: 409 }
      );
    }

    console.error("Admin remove player failed:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while removing the player.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
