import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { calculatePlayerDemands } from "@/lib/services/botola-contract-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { id: params.playerId },
    select: {
      id: true,
      fullName: true,
      overallRating: true,
      position: true,
      photo: true,
      nationality: true,
      realClub: true,
      marketValue: true,
      primeSignature: true,
      seasonSalary: true,
      contractSeasonsLeft: true,
      squadRole: true,
      releaseClause: true,
      isFreeAgentMarket: true,
      expiredFromClubName: true,
      failedFreeAgentClubIds: true,
    },
  });

  if (!player || !player.isFreeAgentMarket) {
    return NextResponse.json({ error: "Free agent player not found on market." }, { status: 404 });
  }

  const failedClubs = (player.failedFreeAgentClubIds || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (failedClubs.includes(session.user.clubId)) {
    return NextResponse.json(
      {
        error: "⛔ لقد استنفد ناديك فرصته الوحيدة للتفاوض مع هذا اللاعب. يرفض الوكيل واللاعب إجراء أي محادثات جديدة بعد فشل الجلسة السابقة.",
      },
      { status: 403 }
    );
  }

  const demands = await calculatePlayerDemands(params.playerId);

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    select: { budget: true },
  });

  return NextResponse.json({
    player: {
      ...player,
      marketValue: 0,
      primeSignature: Number(player.primeSignature),
      seasonSalary: Number(player.seasonSalary),
    },
    demands,
    clubBudget: Number(club?.budget ?? 0),
  });
}
