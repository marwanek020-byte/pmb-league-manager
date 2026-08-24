import { Prisma, BudgetTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

type TxClient = Prisma.TransactionClient;

export const GLOBAL_TOTW_SELECTION_REWARD = new Prisma.Decimal("1000000"); // 1M EUR per player
export const GLOBAL_TOTW_1ST_PRIZE        = new Prisma.Decimal("3000000"); // 3M EUR for 1st Place MVP
export const GLOBAL_TOTW_2ND_PRIZE        = new Prisma.Decimal("1750000"); // 1.75M EUR for 2nd Place Star
export const GLOBAL_TOTW_3RD_PRIZE        = new Prisma.Decimal("1500000"); // 1.5M EUR for 3rd Place Star

export const MAX_PLAYERS_PER_LEAGUE = 3;
export const MAX_PLAYERS_PER_CLUB   = 2;

export type LeagueRoundDetection = {
  leagueId: string;
  leagueName: string;
  leagueLogo: string | null;
  leagueCountry: string;
  latestCompletedMatchday: number | null;
  totalCompletedMatches: number;
  isIncluded: boolean;
};

export type GlobalCandidate = {
  playerId: string;
  fullName: string;
  photo: string | null;
  position: string;
  normalizedGroup: "GK" | "DEF" | "MID" | "FWD";
  overallRating: number | null;
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  leagueId: string;
  leagueName: string;
  leagueLogo: string | null;
  goals: number;
  assists: number;
  isMotm: boolean;
  cleanSheet: boolean;
  score: number;
};

export type GlobalTotwRewardPlayerInput = {
  playerId: string;
  clubId: string;
  leagueId?: string | null;
  position: string;
  podiumRank?: number | null; // 1, 2, 3, or null
  ratingBoost?: number;
  goalsInMatchday?: number;
  assistsInMatchday?: number;
  isMotm?: boolean;
};

function normalizePosition(rawPos: string | null | undefined): {
  normalizedGroup: "GK" | "DEF" | "MID" | "FWD";
  normalizedPos: string;
} {
  const pos = (rawPos || "CMF").toUpperCase().trim();
  if (pos === "GK" || pos === "GOALKEEPER") {
    return { normalizedGroup: "GK", normalizedPos: "GK" };
  }
  if (["CB", "LB", "RB", "DF", "LWB", "RWB", "SW", "DEFENDER"].includes(pos)) {
    const p = ["LB", "RB", "CB"].includes(pos) ? pos : "CB";
    return { normalizedGroup: "DEF", normalizedPos: p };
  }
  if (["DMF", "CMF", "AMF", "LMF", "RMF", "MF", "MIDFIELDER", "DM", "CM", "AM", "LM", "RM"].includes(pos)) {
    const p = ["DMF", "CMF", "AMF", "LMF", "RMF"].includes(pos) ? pos : "CMF";
    return { normalizedGroup: "MID", normalizedPos: p };
  }
  return {
    normalizedGroup: "FWD",
    normalizedPos: ["CF", "SS", "LWF", "RWF"].includes(pos) ? pos : "CF",
  };
}

/**
 * 1. Auto-detect the latest completed matchday for each league.
 */
export async function detectLatestLeagueRounds(): Promise<LeagueRoundDetection[]> {
  const leagues = await prisma.league.findMany({
    include: {
      matches: {
        where: { status: "COMPLETED" },
        select: { matchday: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return leagues.map((league) => {
    let latestMD: number | null = null;
    if (league.matches.length > 0) {
      const matchdays = league.matches.map((m) => m.matchday);
      latestMD = Math.max(...matchdays);
    }

    return {
      leagueId: league.id,
      leagueName: league.name,
      leagueLogo: league.logo,
      leagueCountry: league.country,
      latestCompletedMatchday: latestMD,
      totalCompletedMatches: league.matches.length,
      isIncluded: latestMD !== null && latestMD > 0,
    };
  });
}

/**
 * 2. Fetch candidates across specified league rounds and score them.
 */
export async function getGlobalTotwCandidates(
  leagueRounds: { leagueId: string; matchday: number }[]
): Promise<GlobalCandidate[]> {
  if (!leagueRounds || leagueRounds.length === 0) return [];

  const candidateMap = new Map<string, GlobalCandidate>();

  for (const lr of leagueRounds) {
    if (!lr.leagueId || !lr.matchday || lr.matchday <= 0) continue;

    const matches = await prisma.match.findMany({
      where: {
        leagueId: lr.leagueId,
        matchday: lr.matchday,
        status: "COMPLETED",
      },
      include: {
        league: { select: { id: true, name: true, logo: true } },
        manOfTheMatch: true,
        homeClub: {
          include: {
            players: true,
          },
        },
        awayClub: {
          include: {
            players: true,
          },
        },
        events: {
          include: {
            player: true,
            assistPlayer: true,
          },
        },
      },
    });

    for (const match of matches) {
      const homeGoals = match.homeGoals ?? 0;
      const awayGoals = match.awayGoals ?? 0;
      const homeCleanSheet = awayGoals === 0;
      const awayCleanSheet = homeGoals === 0;
      const homeWon = homeGoals > awayGoals;
      const awayWon = awayGoals > homeGoals;
      const isDraw = homeGoals === awayGoals;

      function getOrCreateCandidate(
        p: { id: string; fullName: string; photo: string | null; position: string; overallRating: number | null },
        club: { id: string; name: string; logo: string | null },
        league: { id: string; name: string; logo: string | null }
      ): GlobalCandidate {
        let cand = candidateMap.get(p.id);
        if (!cand) {
          const { normalizedGroup, normalizedPos } = normalizePosition(p.position);
          cand = {
            playerId: p.id,
            fullName: p.fullName,
            photo: p.photo,
            position: normalizedPos,
            normalizedGroup,
            overallRating: p.overallRating || 76,
            clubId: club.id,
            clubName: club.name,
            clubLogo: club.logo,
            leagueId: league.id,
            leagueName: league.name,
            leagueLogo: league.logo,
            goals: 0,
            assists: 0,
            isMotm: false,
            cleanSheet: false,
            score: 0,
          };
          candidateMap.set(p.id, cand);
        }
        return cand;
      }

      // Home Club players
      if (match.homeClub?.players && match.league) {
        for (const p of match.homeClub.players) {
          const cand = getOrCreateCandidate(p, match.homeClub, match.league);
          if (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF") {
            if (homeCleanSheet) cand.cleanSheet = true;
          }
          if (homeWon) cand.score += 2.5;
          else if (isDraw) cand.score += 1.0;

          if (homeCleanSheet && (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF")) {
            cand.score += 5.0;
          } else if (awayGoals === 1 && (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF")) {
            cand.score += 2.0;
          }
        }
      }

      // Away Club players
      if (match.awayClub?.players && match.league) {
        for (const p of match.awayClub.players) {
          const cand = getOrCreateCandidate(p, match.awayClub, match.league);
          if (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF") {
            if (awayCleanSheet) cand.cleanSheet = true;
          }
          if (awayWon) cand.score += 2.5;
          else if (isDraw) cand.score += 1.0;

          if (awayCleanSheet && (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF")) {
            cand.score += 5.0;
          } else if (homeGoals === 1 && (cand.normalizedGroup === "GK" || cand.normalizedGroup === "DEF")) {
            cand.score += 2.0;
          }
        }
      }

      // MOTM
      if (match.manOfTheMatch && match.league) {
        const club =
          match.manOfTheMatch.pmbClubId === match.homeClubId
            ? match.homeClub
            : match.awayClub;
        if (club) {
          const cand = getOrCreateCandidate(match.manOfTheMatch, club, match.league);
          cand.isMotm = true;
          cand.score += 6.0;
        }
      }

      // Events
      for (const ev of match.events) {
        if (ev.type === "GOAL" && ev.player && match.league) {
          const club = ev.clubId === match.homeClubId ? match.homeClub : match.awayClub;
          if (club) {
            const cand = getOrCreateCandidate(ev.player, club, match.league);
            cand.goals += 1;
            cand.score += cand.normalizedGroup === "DEF" ? 6.0 : 4.5;
          }
        }
        if (ev.assistPlayer && match.league) {
          const club = ev.clubId === match.homeClubId ? match.homeClub : match.awayClub;
          if (club) {
            const cand = getOrCreateCandidate(ev.assistPlayer, club, match.league);
            cand.assists += 1;
            cand.score += cand.normalizedGroup === "DEF" ? 4.5 : 3.5;
          }
        }
      }
    }
  }

  const candidates = Array.from(candidateMap.values()).map((c) => ({
    ...c,
    score:
      c.score +
      ((c.overallRating || 76) - 65) * 0.35 +
      c.goals * 4 +
      c.assists * 3 +
      (c.isMotm ? 5 : 0) +
      (c.cleanSheet ? 3 : 0),
  }));

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * 3. Generate guaranteed 11 unique players for Global TOTW respecting:
 * - Max 3 players per league
 * - Max 2 players per club
 * - 4-3-3 positional mapping
 * - Top 3 Podium (1st, 2nd, 3rd place)
 */
export function generateGlobalSuggestedLineup(candidates: GlobalCandidate[]): {
  suggestedLineup: { key: string; player: GlobalCandidate; podiumRank: number | null }[];
  podium: { first: GlobalCandidate | null; second: GlobalCandidate | null; third: GlobalCandidate | null };
} {
  const leagueCounts = new Map<string, number>();
  const clubCounts = new Map<string, number>();
  const usedPlayerIds = new Set<string>();

  const gks = candidates.filter((c) => c.normalizedGroup === "GK");
  const defs = candidates.filter((c) => c.normalizedGroup === "DEF");
  const mids = candidates.filter((c) => c.normalizedGroup === "MID");
  const fwds = candidates.filter((c) => c.normalizedGroup === "FWD");

  const lbs = defs.filter((c) => c.position === "LB");
  const cbs = defs.filter((c) => c.position === "CB");
  const rbs = defs.filter((c) => c.position === "RB");

  const dmfs = mids.filter((c) => c.position === "DMF");
  const cmfs = mids.filter((c) => c.position === "CMF");
  const amfs = mids.filter((c) => c.position === "AMF");

  const lwfs = fwds.filter((c) => c.position === "LWF");
  const cfs = fwds.filter((c) => c.position === "CF" || c.position === "SS");
  const rwfs = fwds.filter((c) => c.position === "RWF");

  function pickCandidate(preferred: GlobalCandidate[], fallbacks: GlobalCandidate[][] = []): GlobalCandidate | null {
    // 1. Try preferred pool
    for (const cand of preferred) {
      const lCount = leagueCounts.get(cand.leagueId) || 0;
      const cCount = clubCounts.get(cand.clubId) || 0;
      if (!usedPlayerIds.has(cand.playerId) && lCount < MAX_PLAYERS_PER_LEAGUE && cCount < MAX_PLAYERS_PER_CLUB) {
        usedPlayerIds.add(cand.playerId);
        leagueCounts.set(cand.leagueId, lCount + 1);
        clubCounts.set(cand.clubId, cCount + 1);
        return cand;
      }
    }
    // 2. Try fallbacks
    for (const fallback of fallbacks) {
      for (const cand of fallback) {
        const lCount = leagueCounts.get(cand.leagueId) || 0;
        const cCount = clubCounts.get(cand.clubId) || 0;
        if (!usedPlayerIds.has(cand.playerId) && lCount < MAX_PLAYERS_PER_LEAGUE && cCount < MAX_PLAYERS_PER_CLUB) {
          usedPlayerIds.add(cand.playerId);
          leagueCounts.set(cand.leagueId, lCount + 1);
          clubCounts.set(cand.clubId, cCount + 1);
          return cand;
        }
      }
    }
    return null;
  }

  const lineupSlots = [
    { key: "GK", player: pickCandidate(gks, [candidates]) },
    { key: "LB", player: pickCandidate(lbs, [defs, mids, candidates]) },
    { key: "CB1", player: pickCandidate(cbs, [defs, mids, candidates]) },
    { key: "CB2", player: pickCandidate(cbs, [defs, mids, candidates]) },
    { key: "RB", player: pickCandidate(rbs, [defs, mids, candidates]) },
    { key: "DMF", player: pickCandidate(dmfs, [mids, defs, candidates]) },
    { key: "CMF", player: pickCandidate(cmfs, [mids, candidates]) },
    { key: "AMF", player: pickCandidate(amfs, [mids, fwds, candidates]) },
    { key: "LWF", player: pickCandidate(lwfs, [fwds, mids, candidates]) },
    { key: "CF", player: pickCandidate(cfs, [fwds, candidates]) },
    { key: "RWF", player: pickCandidate(rwfs, [fwds, mids, candidates]) },
  ];

  const pickedLineup = lineupSlots.filter((s) => s.player !== null) as { key: string; player: GlobalCandidate }[];

  // Rank the picked 11 by their scores to determine Top 3 Podium
  const sortedPerformers = pickedLineup.slice().sort((a, b) => (b.player.score || 0) - (a.player.score || 0));

  const firstPlaceId  = sortedPerformers[0]?.player.playerId || null;
  const secondPlaceId = sortedPerformers[1]?.player.playerId || null;
  const thirdPlaceId  = sortedPerformers[2]?.player.playerId || null;

  const suggestedLineup = pickedLineup.map((slot) => {
    let podiumRank: number | null = null;
    if (slot.player.playerId === firstPlaceId) podiumRank = 1;
    else if (slot.player.playerId === secondPlaceId) podiumRank = 2;
    else if (slot.player.playerId === thirdPlaceId) podiumRank = 3;

    return {
      key: slot.key,
      player: slot.player,
      podiumRank,
    };
  });

  return {
    suggestedLineup,
    podium: {
      first: sortedPerformers[0]?.player || null,
      second: sortedPerformers[1]?.player || null,
      third: sortedPerformers[2]?.player || null,
    },
  };
}

/**
 * 4. Apply financial rewards for Global TOTW Edition:
 * - Reverse any previous rewards for this Edition
 * - Reward €1,000,000 to each of the 11 player clubs
 * - Reward +€3,000,000 to 1st Place Club
 * - Reward +€1,750,000 to 2nd Place Club
 * - Reward +€1,500,000 to 3rd Place Club
 */
export async function applyGlobalTotwRewards(
  tx: TxClient,
  edition: number,
  players: GlobalTotwRewardPlayerInput[]
): Promise<void> {
  const descPrefix = `Global TOTW Edition #${edition}:`;

  // 1. Reverse previous rewards for this edition
  const previousTxns = await tx.clubBudgetTransaction.findMany({
    where: {
      type: BudgetTransactionType.COMPETITION_REWARD,
      description: { startsWith: descPrefix },
    },
    select: { id: true, clubId: true, amount: true },
  });

  const reversalByClub = new Map<string, Prisma.Decimal>();
  for (const prev of previousTxns) {
    const negated = new Prisma.Decimal(prev.amount.toString()).negated();
    const current = reversalByClub.get(prev.clubId) ?? new Prisma.Decimal("0");
    reversalByClub.set(prev.clubId, current.plus(negated));
  }

  const reversalClubIds = [...reversalByClub.keys()].sort();
  for (const clubId of reversalClubIds) {
    const reversalAmount = reversalByClub.get(clubId)!;
    if (reversalAmount.isZero()) continue;

    const currentBudget = await lockClubBudget(tx, clubId);
    await applyBudgetTransaction(tx, {
      clubId,
      amount: reversalAmount,
      currentBudget,
      type: BudgetTransactionType.COMPETITION_REWARD,
      description: `Reversed: ${descPrefix} Previous Global TOTW reward adjustment`,
    });
  }

  // 2. Apply new rewards in deterministic order by clubId
  const clubIds = [...new Set(players.map((p) => p.clubId))].sort();

  for (const clubId of clubIds) {
    const clubPlayers = players.filter((p) => p.clubId === clubId);

    for (const p of clubPlayers) {
      // Base €1,000,000 selection reward
      let currentBudget = await lockClubBudget(tx, clubId);
      currentBudget = await applyBudgetTransaction(tx, {
        clubId,
        amount: GLOBAL_TOTW_SELECTION_REWARD,
        currentBudget,
        type: BudgetTransactionType.COMPETITION_REWARD,
        description: `${descPrefix} Selection Reward (€1,000,000)`,
        playerId: p.playerId,
      });

      // 🥇 1st Place Global MVP (+€3,000,000)
      if (p.podiumRank === 1) {
        currentBudget = await lockClubBudget(tx, clubId);
        await applyBudgetTransaction(tx, {
          clubId,
          amount: GLOBAL_TOTW_1ST_PRIZE,
          currentBudget,
          type: BudgetTransactionType.COMPETITION_REWARD,
          description: `${descPrefix} 1st Place Global MVP Prize (€3,000,000)`,
          playerId: p.playerId,
        });
      }

      // 🥈 2nd Place Global Star (+€1,750,000)
      else if (p.podiumRank === 2) {
        currentBudget = await lockClubBudget(tx, clubId);
        await applyBudgetTransaction(tx, {
          clubId,
          amount: GLOBAL_TOTW_2ND_PRIZE,
          currentBudget,
          type: BudgetTransactionType.COMPETITION_REWARD,
          description: `${descPrefix} 2nd Place Global Star Prize (€1,750,000)`,
          playerId: p.playerId,
        });
      }

      // 🥉 3rd Place Global Star (+€1,500,000)
      else if (p.podiumRank === 3) {
        currentBudget = await lockClubBudget(tx, clubId);
        await applyBudgetTransaction(tx, {
          clubId,
          amount: GLOBAL_TOTW_3RD_PRIZE,
          currentBudget,
          type: BudgetTransactionType.COMPETITION_REWARD,
          description: `${descPrefix} 3rd Place Global Star Prize (€1,500,000)`,
          playerId: p.playerId,
        });
      }
    }
  }
}
