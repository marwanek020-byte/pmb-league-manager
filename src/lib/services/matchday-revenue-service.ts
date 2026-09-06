import { Prisma, BudgetTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";
import { StadiumEconomyEngine } from "@/lib/services/stadium-economy-engine";

type TxClient = Prisma.TransactionClient;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STANDARD_MIN = 50;
const STANDARD_MAX = 120;
const VIP_MIN      = 200;
const VIP_MAX      = 500;

const CLUB_PRESTIGE: Record<string, number> = {
  "Raja Casablanca": 90, "Wydad AC": 88, "FAR Rabat": 82, "IR Tanger": 72,
  "Hassania Agadir": 65, "Maghreb Fez": 68, "Kawkab Marrakech": 60, "COD Meknes": 55,
  "FUS Rabat": 70, "Olympique Safi": 50, "Difaa El Jadidi": 52, "Berkane": 58,
  "Renaissance Zemamra": 40, "Union Touarga": 42, "Dcheira": 38, "Yacoub El Mansour": 44,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Compute team form (0–10) from last 10 completed match results for a club */
async function resolveTeamForm(clubId: string): Promise<number> {
  const matches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
    },
    orderBy: { matchday: "desc" },
    take: 10,
    select: { homeClubId: true, homeGoals: true, awayGoals: true },
  });

  if (matches.length === 0) return 5; // neutral default

  const pts = matches.reduce((acc, m) => {
    const isHome = m.homeClubId === clubId;
    const myG   = isHome ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    const oppG  = isHome ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    if (myG > oppG) return acc + 1;
    if (myG === oppG) return acc + 0.5;
    return acc;
  }, 0);

  return Math.round((pts / matches.length) * 10 * 10) / 10;
}

/** Resolve the last confirmed standard ticket price for a club (previous home match) */
async function resolveLastConfirmedPrices(
  clubId: string,
  beforeMatchday: number,
  seasonId: string
): Promise<{ standard: number; vip: number } | null> {
  const prev = await prisma.match.findFirst({
    where: {
      homeClubId: clubId,
      seasonId,
      matchday: { lt: beforeMatchday },
      ticketPriceConfirmed: true,
      standardTicketPrice: { not: null },
    },
    orderBy: { matchday: "desc" },
    select: { standardTicketPrice: true, vipTicketPrice: true },
  });

  if (!prev?.standardTicketPrice) return null;
  return {
    standard: Number(prev.standardTicketPrice),
    vip:      Number(prev.vipTicketPrice ?? VIP_MIN),
  };
}

/** Build smart default prices from team form */
function smartDefaultPrices(form: number): { standard: number; vip: number } {
  const t = Math.max(0, Math.min(10, form)) / 10;
  return {
    standard: Math.round(STANDARD_MIN + t * (STANDARD_MAX - STANDARD_MIN)),
    vip:      Math.round(VIP_MIN      + t * (VIP_MAX      - VIP_MIN)),
  };
}

export type MatchdayRevenueSnapshot = {
  /** Club that receives the ticket revenue */
  revenueClubId:    string;
  revenueClubName:  string;
  /** Actual home club (who plays in the stadium) */
  homeClubId:       string;
  homeClubName:     string;
  stadiumName:      string;
  standardPrice:    number;
  vipPrice:         number;
  priceSource:      "CONFIRMED" | "LAST_MATCH" | "SMART_DEFAULT";
  teamForm:         number;
  attendance: {
    standard:       number;
    vip:            number;
    total:          number;
    occupancyPct:   number;
    isSoldOut:      boolean;
    isBoycotted:    boolean;
  };
  finances: {
    grossTotal:     number;
    operatingCost:  number;
    netProfit:      number;
    isProfitable:   boolean;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// APPLY MATCHDAY REVENUE
// Must be called inside an existing prisma.$transaction(tx)
// ─────────────────────────────────────────────────────────────────────────────
export async function applyMatchdayRevenue(
  tx: TxClient,
  matchId: string
): Promise<MatchdayRevenueSnapshot> {
  // ── 1. Load match ──────────────────────────────────────────────────────────
  const match = await tx.match.findUnique({
    where: { id: matchId },
    include: {
      homeClub: { select: { id: true, name: true } },
      awayClub: { select: { id: true, name: true } },
    },
  });

  if (!match) throw new Error(`Match ${matchId} not found`);
  if (match.homeGoals === null || match.awayGoals === null) {
    throw new Error("Match does not have a result yet");
  }

  // ── 2. Resolve team form ───────────────────────────────────────────────────
  const form = await resolveTeamForm(match.homeClubId);

  // ── 3. Resolve ticket prices (priority: confirmed > last match > smart default)
  let standardPrice: number;
  let vipPrice:      number;
  let priceSource:   MatchdayRevenueSnapshot["priceSource"];

  if (match.ticketPriceConfirmed && match.standardTicketPrice) {
    standardPrice = Number(match.standardTicketPrice);
    vipPrice      = Number(match.vipTicketPrice ?? VIP_MIN);
    priceSource   = "CONFIRMED";
  } else {
    const last = await resolveLastConfirmedPrices(
      match.homeClubId,
      match.matchday,
      match.seasonId
    );
    if (last) {
      standardPrice = last.standard;
      vipPrice      = last.vip;
      priceSource   = "LAST_MATCH";
    } else {
      const defaults = smartDefaultPrices(form);
      standardPrice = defaults.standard;
      vipPrice      = defaults.vip;
      priceSource   = "SMART_DEFAULT";
    }
    // Persist the resolved prices back to the match row so report can read them
    await tx.match.update({
      where: { id: matchId },
      data: {
        standardTicketPrice: new Prisma.Decimal(standardPrice),
        vipTicketPrice:      new Prisma.Decimal(vipPrice),
      },
    });
  }

  // ── 4. Determine match importance from matchday context ───────────────────
  // Simple heuristic: if it's the last 3 matchdays it might be a decider
  // We use "regular" as default — admin can override via tier in the future
  const matchImportance: "regular" | "decider" | "derby" = "regular";

  // ── 5. Determine revenue recipient ─────────────────────────────────────────
  // The host playing club (match.homeClubId) sells the tickets and receives matchday revenue
  const revenueClubId   = match.homeClubId;
  const revenueClubName = match.homeClub.name;

  // ── 6. Run economy engine ─────────────────────────────────────────────────
  const clubName  = match.homeClub.name;
  const prestige  = CLUB_PRESTIGE[clubName] ?? 55;
  const vipCapacity = StadiumEconomyEngine.BOTOLA_STADIUM_REGISTRY[clubName]
    ? Math.floor(
        StadiumEconomyEngine.BOTOLA_STADIUM_REGISTRY[clubName].capacity *
        StadiumEconomyEngine.VIP_CAPACITY_PERCENTAGE
      )
    : 0;
  const hasVip = vipCapacity > 0;

  const isRelocated = Boolean(match.overrideStadiumName);

  const result = StadiumEconomyEngine.calculateMatchday({
    clubIdentifier:  clubName,
    standardPrice,
    vipPrice:        hasVip ? vipPrice : 0,
    teamForm:        Math.max(1, Math.min(10, form)),
    matchImportance,
    clubPrestige:    prestige,
    isBoycotting:    false,
    isThroneCupMatch: false,
    isRelocated,
    isSameCity:      false,
    overrideStadiumName: match.overrideStadiumName ?? undefined,
  });

  const netProfit     = result.finances.netProfit;
  const stadiumEntry  = StadiumEconomyEngine.BOTOLA_STADIUM_REGISTRY[clubName];
  const stadiumName   = match.overrideStadiumName ?? stadiumEntry?.stadium ?? "Unknown Stadium";

  // ── 7. Apply budget transaction ───────────────────────────────────────────
  const txType = netProfit >= 0
    ? BudgetTransactionType.MATCHDAY_REVENUE
    : BudgetTransactionType.MATCHDAY_COST;

  const amount = new Prisma.Decimal(Math.round(netProfit));

  // Reverse any existing matchday transaction for this match first
  await reverseMatchdayRevenue(tx, matchId);

  if (!amount.isZero()) {
    const currentBudget = await lockClubBudget(tx, revenueClubId);
    await applyBudgetTransaction(tx, {
      clubId: revenueClubId,
      amount,
      currentBudget,
      type: txType,
      description: `Matchday ${match.matchday} stadium revenue — ${match.homeClub.name} vs ${match.awayClub.name} (${priceSource === "CONFIRMED" ? "Manager-set prices" : priceSource === "LAST_MATCH" ? "Last match prices" : "Auto-default prices"})`,
      matchId,
    });
  }

  return {
    revenueClubId,
    revenueClubName,
    homeClubId:   match.homeClubId,
    homeClubName: match.homeClub.name,
    stadiumName,
    standardPrice,
    vipPrice:     hasVip ? vipPrice : 0,
    priceSource,
    teamForm:     form,
    attendance: {
      standard:     result.attendance.standard,
      vip:          result.attendance.vip,
      total:        result.attendance.total,
      occupancyPct: result.attendance.occupancyRatePercent,
      isSoldOut:    result.attendance.isSoldOut,
      isBoycotted:  result.attendance.isBoycotted,
    },
    finances: {
      grossTotal:   result.finances.revenue.grossTotal,
      operatingCost: result.finances.operatingCost,
      netProfit,
      isProfitable:  result.finances.isProfitable,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REVERSE MATCHDAY REVENUE (called before re-application or on match reset)
// ─────────────────────────────────────────────────────────────────────────────
export async function reverseMatchdayRevenue(
  tx: TxClient,
  matchId: string
): Promise<void> {
  const existing = await tx.clubBudgetTransaction.findMany({
    where: {
      matchId,
      type: { in: [BudgetTransactionType.MATCHDAY_REVENUE, BudgetTransactionType.MATCHDAY_COST] },
    },
    select: { id: true, clubId: true, amount: true },
  });

  if (existing.length === 0) return;

  const byClub = new Map<string, Prisma.Decimal>();
  for (const row of existing) {
    const neg = new Prisma.Decimal(row.amount.toString()).negated();
    byClub.set(row.clubId, (byClub.get(row.clubId) ?? new Prisma.Decimal(0)).plus(neg));
  }

  for (const [clubId, reversal] of [...byClub.entries()].sort()) {
    if (reversal.isZero()) continue;
    const budget = await lockClubBudget(tx, clubId);
    await applyBudgetTransaction(tx, {
      clubId,
      amount:         reversal,
      currentBudget:  budget,
      type:           BudgetTransactionType.MATCHDAY_REVENUE,
      description:    "Reversed: Matchday revenue (match reset)",
      matchId,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI PRICING ADVICE — generates a conseil string from the snapshot
// ─────────────────────────────────────────────────────────────────────────────
export function generatePricingAdvice(snap: MatchdayRevenueSnapshot): {
  type: "success" | "warning" | "danger" | "info";
  headline: string;
  advice: string;
} {
  const { attendance, finances, standardPrice, vipPrice, teamForm } = snap;
  const occ = attendance.occupancyPct;

  if (attendance.isBoycotted) {
    return {
      type: "danger",
      headline: "🚨 Boycott — Zero Attendance",
      advice: `The Ultras boycotted this match. To rebuild trust, lower your standard ticket to €${Math.max(STANDARD_MIN, standardPrice - 20)} for the next 2 home matches.`,
    };
  }

  if (!finances.isProfitable) {
    const suggestPrice = Math.round(standardPrice * 1.15);
    return {
      type: "danger",
      headline: "📉 Matchday Loss",
      advice: `Operating costs exceeded revenue. Consider raising your standard ticket to €${Math.min(STANDARD_MAX, suggestPrice)} or reduce operational waste. Current occupancy: ${occ}%.`,
    };
  }

  if (attendance.isSoldOut && finances.isProfitable) {
    const increase = Math.round(standardPrice * 0.12);
    return {
      type: "success",
      headline: "🏟️ Sold Out — Revenue Maximised",
      advice: `Full house! You could increase your standard ticket price by €${increase} (to €${Math.min(STANDARD_MAX, standardPrice + increase)}) next match — demand is strong enough at form ${teamForm}/10.`,
    };
  }

  if (occ < 50) {
    const decrease = Math.round(standardPrice * 0.15);
    return {
      type: "danger",
      headline: "📉 Low Attendance — Consider Price Cut",
      advice: `Only ${occ}% occupancy. Lower standard price to €${Math.max(STANDARD_MIN, standardPrice - decrease)} to attract more fans. Team form of ${teamForm}/10 is limiting natural demand.`,
    };
  }

  if (occ >= 50 && occ < 80) {
    const decrease = Math.round(standardPrice * 0.08);
    return {
      type: "warning",
      headline: "⚠️ Moderate Attendance",
      advice: `${occ}% occupancy. A small price drop of €${decrease} (to €${Math.max(STANDARD_MIN, standardPrice - decrease)}) could push you towards a full house and maximize total revenue.`,
    };
  }

  if (occ >= 80 && !attendance.isSoldOut) {
    return {
      type: "info",
      headline: "✅ Good Attendance",
      advice: `${occ}% occupancy — great result. Prices are well-calibrated. ${vipPrice > 0 && attendance.vip < 50 ? `VIP sales are low — try reducing VIP to €${Math.max(VIP_MIN, vipPrice - 30)}.` : "Keep current pricing for the next match."}`,
    };
  }

  return {
    type: "info",
    headline: "📊 Matchday Complete",
    advice: `${occ}% occupancy at €${standardPrice} standard. Prices look reasonable for your team form of ${teamForm}/10.`,
  };
}
