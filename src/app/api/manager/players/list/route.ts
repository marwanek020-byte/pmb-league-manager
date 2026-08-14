import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializePlayer } from "@/lib/serialize-player";

export async function GET(req: Request) {
  const session = await auth();

  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const players = await prisma.player.findMany({
    where: { pmbClubId: session.user.clubId, status: "REGISTERED" },
    include: { pmbClub: { select: { name: true } } },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ players: players.map(serializePlayer) });
}
