import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }

  const sessionInfo = {
    userId: session.user.id,
    username: session.user.username,
    role: session.user.role,
    clubId: session.user.clubId,
    clubName: session.user.clubName,
  };

  let players: any[] = [];
  let queryError: string | null = null;

  try {
    players = await prisma.player.findMany({
      where: { pmbClubId: session.user.clubId ?? "__none__", status: "REGISTERED" },
      select: { id: true, fullName: true, status: true, pmbClubId: true },
    });
  } catch (e: any) {
    queryError = e?.message ?? "Unknown error";
  }

  // Also check raw count in DB for this club
  let dbClub = null;
  try {
    dbClub = session.user.clubId
      ? await prisma.club.findUnique({
          where: { id: session.user.clubId },
          select: { id: true, name: true, _count: { select: { players: true } } },
        })
      : null;
  } catch {}

  return NextResponse.json({
    session: sessionInfo,
    playersFound: players.length,
    players,
    queryError,
    dbClub,
  });
}
