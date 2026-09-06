import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StadiumEconomyEngine } from "@/lib/services/stadium-economy-engine";
import { generatePricingAdvice, type MatchdayRevenueSnapshot } from "@/lib/services/matchday-revenue-service";

export const dynamic = "force-dynamic";

const CLUB_PRESTIGE: Record<string, number> = {
  "Raja Casablanca": 90, "Wydad AC": 88, "FAR Rabat": 82, "IR Tanger": 72,
  "Hassania Agadir": 65, "Maghreb Fez": 68, "Kawkab Marrakech": 60, "COD Meknes": 55,
  "FUS Rabat": 70, "Olympique Safi": 50, "Difaa El Jadidi": 52, "Berkane": 58,
  "Renaissance Zemamra": 40, "Union Touarga": 42, "Dcheira": 38, "Yacoub El Mansour": 44,
};

/**
 * GET /api/manager/stadium/last-report
 * Returns attendance, finances, and AI pricing conseils for the manager's
 * most recently completed home match.
 */
export async function GET() {
  const session = await auth();
  let clubId = session?.user?.clubId ?? null;

  if (!clubId) {
    const fallback = await prisma.club.findFirst({
      where: { name: { contains: "FAR Rabat" } },
      select: { id: true },
    }) ?? await prisma.club.findFirst({ select: { id: true } });
    clubId = fallback?.id ?? null;
  }

  if (!clubId) {
    return NextResponse.json({ report: null });
  }

  try {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true },
    });

    if (!club) return NextResponse.json({ report: null });

    // Find the latest completed home match for this club
    const lastMatch = await prisma.match.findFirst({
      where: {
        homeClubId: clubId,
        status: "COMPLETED",
        homeGoals: { not: null },
        awayGoals: { not: null },
      },
      orderBy: [
        { playedAt: "desc" },
        { matchday: "desc" },
      ],
      include: {
        homeClub: { select: { id: true, name: true } },
        awayClub: { select: { id: true, name: true, logo: true } },
      },
    });

    if (!lastMatch) {
      return NextResponse.json({ report: null });
    }

    // Compute team form at that time from completed matches up to that matchday
    const pastMatches = await prisma.match.findMany({
      where: {
        status: "COMPLETED",
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
        matchday: { lte: lastMatch.matchday },
      },
      orderBy: { matchday: "desc" },
      take: 10,
      select: { homeClubId: true, homeGoals: true, awayGoals: true },
    });

    const pts = pastMatches.reduce((acc, m) => {
      const isHome = m.homeClubId === clubId;
      const myG = isHome ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
      const oppG = isHome ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
      if (myG > oppG) return acc + 1;
      if (myG === oppG) return acc + 0.5;
      return acc;
    }, 0);

    const form = pastMatches.length > 0
      ? Math.round((pts / pastMatches.length) * 10 * 10) / 10
      : 5;

    const standardPrice = Number(lastMatch.standardTicketPrice ?? 50);
    const vipPrice = Number(lastMatch.vipTicketPrice ?? 200);

    const clubName = club.name;
    const prestige = CLUB_PRESTIGE[clubName] ?? 55;
    const reg = StadiumEconomyEngine.BOTOLA_STADIUM_REGISTRY[clubName];
    const stadiumName = lastMatch.overrideStadiumName ?? reg?.stadium ?? "Unknown Stadium";

    const vipCapacity = reg
      ? Math.floor(reg.capacity * StadiumEconomyEngine.VIP_CAPACITY_PERCENTAGE)
      : 0;

    const engineResult = StadiumEconomyEngine.calculateMatchday({
      clubIdentifier: clubName,
      standardPrice,
      vipPrice: vipCapacity > 0 ? vipPrice : 0,
      teamForm: Math.max(1, Math.min(10, form)),
      matchImportance: "regular",
      clubPrestige: prestige,
      isBoycotting: false,
      isThroneCupMatch: false,
      isRelocated: !!lastMatch.overrideHostClubId,
      isSameCity: true,
    });

    const netProfit = engineResult.finances.netProfit;

    const snapshot: MatchdayRevenueSnapshot = {
      revenueClubId: lastMatch.overrideHostClubId ?? lastMatch.homeClubId,
      revenueClubName: club.name,
      homeClubId: lastMatch.homeClubId,
      homeClubName: club.name,
      stadiumName,
      standardPrice,
      vipPrice: vipCapacity > 0 ? vipPrice : 0,
      priceSource: lastMatch.ticketPriceConfirmed ? "CONFIRMED" : "SMART_DEFAULT",
      teamForm: form,
      attendance: {
        standard: engineResult.attendance.standard,
        vip: engineResult.attendance.vip,
        total: engineResult.attendance.total,
        occupancyPct: engineResult.attendance.occupancyRatePercent,
        isSoldOut: engineResult.attendance.isSoldOut,
        isBoycotted: engineResult.attendance.isBoycotted,
      },
      finances: {
        grossTotal: engineResult.finances.revenue.grossTotal,
        operatingCost: engineResult.finances.operatingCost,
        netProfit,
        isProfitable: engineResult.finances.isProfitable,
      },
    };

    const advice = generatePricingAdvice(snapshot);

    return NextResponse.json({
      report: {
        matchId: lastMatch.id,
        matchday: lastMatch.matchday,
        playedAt: lastMatch.playedAt,
        score: `${lastMatch.homeGoals} - ${lastMatch.awayGoals}`,
        opponent: lastMatch.awayClub.name,
        opponentLogo: lastMatch.awayClub.logo,
        stadiumName,
        snapshot,
        advice,
      },
    });
  } catch (err) {
    console.error("[last-report GET] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
