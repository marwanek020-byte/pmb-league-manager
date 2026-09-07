import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalculateMarketValuesForLeague } from "@/lib/services/player-valuation-service";

export const dynamic = "force-dynamic";

// POST /api/admin/recalculate-market-values
// Triggers market value recalculation for Botola Pro or any/all leagues.
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let leagueId: string | undefined;
  try {
    const body = await req.json();
    leagueId = body?.leagueId;
  } catch {}

  if (leagueId === "ALL") {
    const leagues = await prisma.league.findMany({ select: { id: true, name: true } });
    for (const l of leagues) {
      await recalculateMarketValuesForLeague(l.id);
    }
    return NextResponse.json({
      success: true,
      message: `Market values recalculated for all ${leagues.length} leagues.`,
    });
  }

  if (leagueId) {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true },
    });
    if (!league) {
      return NextResponse.json({ error: "League not found." }, { status: 404 });
    }
    const result = await recalculateMarketValuesForLeague(league.id);
    return NextResponse.json({
      success: true,
      message: `Market values recalculated for ${league.name}.`,
      result,
    });
  }

  const league = await prisma.league.findFirst({
    where: { name: { contains: "Botola", mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Botola Pro league not found." }, { status: 404 });
  }

  const result = await recalculateMarketValuesForLeague(league.id);

  return NextResponse.json({
    success: true,
    message: `Market values recalculated for ${league.name}.`,
    result,
  });
}
