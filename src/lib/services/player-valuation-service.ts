/**
 * Player Market Value Engine — Botola Pro
 *
 * Calculates and writes marketValue to every Player in the league
 * based on their in-game performance (goals, assists, MOTM, TOTW).
 *
 * Position-specific formulas + ceilings:
 *   ATTACKER  → Goals×12 + Assists×8  + MOTM×10 + TOTW×8  → ceiling €100M
 *   MIDFIELDER → Assists×12 + Goals×10 + MOTM×12 + TOTW×10 → ceiling €70M
 *   DEFENDER  → CleanSheets×8 + Goals×15 + MOTM×10 + TOTW×10 → ceiling €50M
 *   GOALKEEPER → CleanSheets×10 + MOTM×10 + TOTW×10 → ceiling €40M
 *
 * All players receive at least the BASE_FLOOR of €4,000,000.
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_FLOOR = 4_000_000;

const CEILINGS = {
  attacker:   100_000_000,
  midfielder:  70_000_000,
  defender:    50_000_000,
  goalkeeper:  40_000_000,
} as const;

type PositionType = keyof typeof CEILINGS;

// ── Position classifier ────────────────────────────────────────────────────
function classifyPosition(rawPos: string | null): PositionType {
  const pos = (rawPos ?? "").toUpperCase().replace(/[\s.]/g, "");

  if (pos === "GK") return "goalkeeper";

  if (
    pos === "CB" || pos === "LB" || pos === "RB" ||
    pos === "LWB" || pos === "RWB" || pos === "DEF" ||
    pos.startsWith("CB") || pos.startsWith("LB") || pos.startsWith("RB")
  ) return "defender";

  if (
    pos.includes("CMF") || pos.includes("AMF") || pos.includes("DMF") ||
    pos.includes("LMF") || pos.includes("RMF") || pos === "MF" ||
    pos === "MID" || pos.endsWith("MF")
  ) return "midfielder";

  // Default everything else to attacker
  return "attacker";
}

// ── Score formula per position type ────────────────────────────────────────
function computeScore(
  type: PositionType,
  goals: number,
  assists: number,
  motms: number,
  totws: number,
  cleanSheets: number
): number {
  switch (type) {
    case "attacker":
      return goals * 12 + assists * 8 + motms * 10 + totws * 8;
    case "midfielder":
      return assists * 12 + goals * 10 + motms * 12 + totws * 10;
    case "defender":
      return cleanSheets * 8 + goals * 15 + motms * 10 + totws * 10;
    case "goalkeeper":
      return cleanSheets * 10 + motms * 10 + totws * 10;
  }
}

// ── Round to nearest 500k ──────────────────────────────────────────────────
function roundToHalfMillion(value: number): number {
  return Math.round(value / 500_000) * 500_000;
}

// ── Main recalculation function ────────────────────────────────────────────
export async function recalculateMarketValuesForLeague(
  leagueId: string
): Promise<void> {
  // 1. Get all clubs in the league
  const clubs = await prisma.club.findMany({
    where: { leagueId },
    select: { id: true },
  });
  const clubIds = clubs.map((c) => c.id);

  if (clubIds.length === 0) return;

  // 2. Get all players
  const players = await prisma.player.findMany({
    where: { pmbClubId: { in: clubIds } },
    select: { id: true, position: true },
  });

  // 3. Goals from MatchEvent
  const goalEvents = await prisma.matchEvent.findMany({
    where: { type: "GOAL" },
    select: { playerId: true, assistPlayerId: true },
  });

  // 4. MOTM from Match
  const motmRows = await prisma.match.findMany({
    where: { manOfTheMatchId: { not: null } },
    select: { manOfTheMatchId: true },
  });

  // 5. TOTW
  const totwRows = await prisma.totwPlayer.findMany({
    select: { playerId: true },
  });

  // 6. Clean sheets — count matches where a player's team kept a clean sheet
  //    We check completed matches where the opposing team scored 0 goals.
  const completedMatches = await prisma.match.findMany({
    where: { status: "COMPLETED" },
    select: {
      homeClubId: true,
      awayClubId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });

  // Build a set of clubs that kept a clean sheet in each match
  // (club kept clean sheet when opponent scored 0)
  const cleanSheetClubs = new Set<string>();
  for (const m of completedMatches) {
    if (m.awayGoals === 0 && m.homeClubId) cleanSheetClubs.add(m.homeClubId);
    if (m.homeGoals === 0 && m.awayClubId) cleanSheetClubs.add(m.awayClubId);
  }

  // Build stat maps
  const goalsMap = new Map<string, number>();
  const assistsMap = new Map<string, number>();
  for (const e of goalEvents) {
    if (e.playerId)
      goalsMap.set(e.playerId, (goalsMap.get(e.playerId) ?? 0) + 1);
    if (e.assistPlayerId)
      assistsMap.set(e.assistPlayerId, (assistsMap.get(e.assistPlayerId) ?? 0) + 1);
  }

  const motmMap = new Map<string, number>();
  for (const m of motmRows) {
    if (m.manOfTheMatchId)
      motmMap.set(m.manOfTheMatchId, (motmMap.get(m.manOfTheMatchId) ?? 0) + 1);
  }

  const totwMap = new Map<string, number>();
  for (const t of totwRows) {
    totwMap.set(t.playerId, (totwMap.get(t.playerId) ?? 0) + 1);
  }

  // ── STEP 1: Compute every player's raw performance score ──────────────────
  type PlayerEntry = { id: string; type: PositionType; score: number; rawPrice: number };
  const entries: PlayerEntry[] = players.map((p) => {
    const type = classifyPosition(p.position);
    const score = computeScore(
      type,
      goalsMap.get(p.id) ?? 0,
      assistsMap.get(p.id) ?? 0,
      motmMap.get(p.id) ?? 0,
      totwMap.get(p.id) ?? 0,
      0, // clean-sheet tracking requires lineup data — approximated as 0
    );
    return { id: p.id, type, score, rawPrice: 0 };
  });

  // ── STEP 2: Find the actual highest score per position type ───────────────
  //    Fully dynamic — no hardcoded baselines.
  //    The top scorer in each type will always reach exactly the ceiling price.
  const maxScores: Record<PositionType, number> = {
    attacker: 0, midfielder: 0, defender: 0, goalkeeper: 0,
  };
  for (const e of entries) {
    if (e.score > maxScores[e.type]) maxScores[e.type] = e.score;
  }

  // ── STEP 3: Compute raw (unrounded) price for each player ─────────────────
  for (const e of entries) {
    const ceiling = CEILINGS[e.type];
    const maxScore = maxScores[e.type];
    e.rawPrice = (e.score > 0 && maxScore > 0)
      ? BASE_FLOOR + (e.score / maxScore) * (ceiling - BASE_FLOOR)
      : BASE_FLOOR;
  }

  // ── STEP 4: Enforce strict unique ranking within each position type ────────
  //    After rounding, if two players share the same price the lower-ranked one
  //    drops by €500k. The #1 scorer always gets exactly the ceiling (€100M etc.).
  const finalPrices = new Map<string, number>();

  for (const type of (["attacker", "midfielder", "defender", "goalkeeper"] as PositionType[])) {
    const group = entries
      .filter((e) => e.type === type)
      .sort((a, b) => b.score - a.score || b.rawPrice - a.rawPrice);

    if (group.length === 0) continue;

    const ceiling = CEILINGS[type];
    // Sentinel: one step above ceiling so rank-1 resolves to exactly ceiling
    let prevPrice = ceiling + 500_000;

    for (const e of group) {
      let price = Math.max(BASE_FLOOR, roundToHalfMillion(e.rawPrice));

      // Must be strictly less than the player ranked immediately above
      if (price >= prevPrice) {
        price = prevPrice - 500_000;
      }
      price = Math.max(BASE_FLOOR, price);

      finalPrices.set(e.id, price);
      prevPrice = price;
    }
  }

  // ── STEP 5: Write to DB in chunks of 50 ───────────────────────────────────
  const CHUNK = 50;
  const allIds = Array.from(finalPrices.keys());
  for (let i = 0; i < allIds.length; i += CHUNK) {
    await Promise.all(
      allIds.slice(i, i + CHUNK).map((id) =>
        prisma.player.update({
          where: { id },
          data: { marketValue: new Prisma.Decimal(finalPrices.get(id)!) },
        })
      )
    );
  }

  console.log(
    `[MarketValue] Recalculated ${players.length} players in league ${leagueId}`
  );
}
