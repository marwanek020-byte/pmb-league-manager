import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalculateMarketValuesForLeague } from "@/lib/services/player-valuation-service";

export const dynamic = "force-dynamic";

// POST /api/admin/recalculate-market-values
// Triggers a full market value recalculation for all Botola Pro players.
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const league = await prisma.league.findFirst({
    where: { name: { contains: "Botola", mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Botola Pro league not found." }, { status: 404 });
  }

  await recalculateMarketValuesForLeague(league.id);

  return NextResponse.json({
    success: true,
    message: `Market values recalculated for ${league.name}.`,
  });
}
