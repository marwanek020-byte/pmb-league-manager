import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/seasons/[seasonId]/matches?matchday=N
// Public — no auth required
export async function GET(
  req: Request,
  { params }: { params: { seasonId: string } }
) {
  const { searchParams } = new URL(req.url);
  const matchdayParam = searchParams.get("matchday");
  const matchday = matchdayParam ? parseInt(matchdayParam, 10) : null;

  const where: { seasonId: string; matchday?: number } = {
    seasonId: params.seasonId,
  };

  if (matchday !== null && Number.isFinite(matchday) && matchday >= 1) {
    where.matchday = matchday;
  }

  const matches = await prisma.match.findMany({
    where,
    orderBy: [{ matchday: "asc" }, { createdAt: "asc" }],
    include: {
      homeClub: { select: { id: true, name: true, logo: true } },
      awayClub: { select: { id: true, name: true, logo: true } },
    },
  });

  // Find the max matchday for pagination context
  const aggregation = await prisma.match.aggregate({
    where: { seasonId: params.seasonId },
    _max: { matchday: true },
  });

  return NextResponse.json({
    seasonId: params.seasonId,
    matchday: matchday ?? null,
    totalMatchdays: aggregation._max.matchday ?? 0,
    matches,
  });
}
