import { prisma } from "@/lib/prisma";

export type WhatIfSimulationResult = {
  targetPlayer: {
    id: string;
    fullName: string;
    position: string;
    overallRating: number;
    marketValue: number;
    clubName: string;
  };
  sellPlayer: {
    id: string;
    fullName: string;
    position: string;
    overallRating: number;
    marketValue: number;
  } | null;
  before: {
    overallRating: number;
    startingXiAvg: number;
    gkRating: number;
    defRating: number;
    midRating: number;
    attRating: number;
    budgetEur: number;
    squadSize: number;
    projectedRank: number;
    tier: string;
  };
  after: {
    overallRating: number;
    startingXiAvg: number;
    gkRating: number;
    defRating: number;
    midRating: number;
    attRating: number;
    budgetEur: number;
    squadSize: number;
    projectedRank: number;
    tier: string;
  };
  deltas: {
    ovrDelta: number;
    startingXiDelta: number;
    budgetDeltaEur: number;
    rankDelta: number;
  };
  executiveVerdict: {
    recommendation: "STRONG_BUY" | "VALUE_BUY" | "LUXURY_DEAL" | "FINANCIALLY_RISKY" | "UNNECESSARY";
    verdictTitle: string;
    verdictDescription: string;
    tacticalPros: string[];
    tacticalCons: string[];
  };
};

export class WhatIfSimulatorService {
  static async simulateTransfer(params: {
    clubId: string;
    targetPlayerId: string;
    sellPlayerId?: string | null;
  }): Promise<WhatIfSimulationResult> {
    const { clubId, targetPlayerId, sellPlayerId } = params;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        players: { where: { status: "REGISTERED" } },
        league: {
          include: {
            clubs: {
              include: {
                players: { where: { status: "REGISTERED" }, select: { overallRating: true } },
              },
            },
          },
        },
      },
    });

    if (!club) throw new Error("Club not found");

    const targetPlayer = await prisma.player.findUnique({
      where: { id: targetPlayerId },
      include: { pmbClub: { select: { name: true } } },
    });

    if (!targetPlayer) throw new Error("Target player not found");

    let sellPlayer: any = null;
    if (sellPlayerId) {
      sellPlayer = club.players.find((p) => p.id === sellPlayerId) || null;
    }

    // Helper functions for position rating averages
    const isGK = (pos: string) => /gk/i.test(pos);
    const isDEF = (pos: string) => /cb|lb|rb|lwb|rwb|def/i.test(pos);
    const isMID = (pos: string) => /dmf|cmf|amf|mid|dm|cam/i.test(pos);
    const isATT = (pos: string) => /cf|st|lwf|rwf|att|fw/i.test(pos);

    const calcGroupAvg = (list: Array<{ position: string; overallRating: number | null }>, filterFn: (p: string) => boolean) => {
      const filtered = list.filter((p) => filterFn(p.position));
      if (filtered.length === 0) return 70;
      return Math.round(filtered.reduce((s, p) => s + (p.overallRating ?? 75), 0) / filtered.length);
    };

    const calcTeamOvr = (list: Array<{ position: string; overallRating: number | null }>) => {
      if (list.length === 0) return 70;
      return Math.round(list.reduce((s, p) => s + (p.overallRating ?? 75), 0) / list.length);
    };

    const calcStartingXiAvg = (list: Array<{ position: string; overallRating: number | null }>) => {
      const sorted = [...list].sort((a, b) => (b.overallRating ?? 75) - (a.overallRating ?? 75));
      const top11 = sorted.slice(0, 11);
      if (top11.length === 0) return 70;
      return Math.round(top11.reduce((s, p) => s + (p.overallRating ?? 75), 0) / top11.length);
    };

    // Calculate League Benchmarks
    const allClubsOvr = club.league.clubs.map((c) => {
      if (c.id === club.id) return { clubId: c.id, ovr: calcTeamOvr(club.players) };
      const ovr = c.players.length > 0
        ? Math.round(c.players.reduce((s, p) => s + (p.overallRating ?? 75), 0) / c.players.length)
        : 70;
      return { clubId: c.id, ovr };
    });

    const getRankForOvr = (ovr: number, selfId: string) => {
      const list = allClubsOvr.map((c) => (c.clubId === selfId ? { ...c, ovr } : c));
      list.sort((a, b) => b.ovr - a.ovr);
      const idx = list.findIndex((c) => c.clubId === selfId);
      return idx >= 0 ? idx + 1 : 1;
    };

    const getTierForRank = (rank: number, total: number) => {
      if (rank === 1) return "🏆 Title Contender";
      if (rank <= 3) return "⭐ Top 3 Elite";
      if (rank <= Math.ceil(total / 2)) return "🟢 Upper Mid-Table";
      return "⚠️ Relegation Battle";
    };

    // BEFORE STATE
    const currentSquad = [...club.players];
    const beforeOvr = calcTeamOvr(currentSquad);
    const beforeXi = calcStartingXiAvg(currentSquad);
    const beforeGk = calcGroupAvg(currentSquad, isGK);
    const beforeDef = calcGroupAvg(currentSquad, isDEF);
    const beforeMid = calcGroupAvg(currentSquad, isMID);
    const beforeAtt = calcGroupAvg(currentSquad, isATT);
    const beforeBudget = Number(club.budget);
    const beforeRank = getRankForOvr(beforeOvr, club.id);
    const beforeTier = getTierForRank(beforeRank, club.league.clubs.length);

    // AFTER STATE
    let simulatedSquad = [...currentSquad];
    if (sellPlayer) {
      simulatedSquad = simulatedSquad.filter((p) => p.id !== sellPlayer.id);
    }
    simulatedSquad.push({
      id: targetPlayer.id,
      fullName: targetPlayer.fullName,
      position: targetPlayer.position,
      overallRating: targetPlayer.overallRating ?? 75,
    } as any);

    const targetPrice = Number(targetPlayer.marketValue ?? 0);
    const sellPrice = sellPlayer ? Number(sellPlayer.marketValue ?? 0) : 0;
    const afterBudget = beforeBudget - targetPrice + sellPrice;

    const afterOvr = calcTeamOvr(simulatedSquad);
    const afterXi = calcStartingXiAvg(simulatedSquad);
    const afterGk = calcGroupAvg(simulatedSquad, isGK);
    const afterDef = calcGroupAvg(simulatedSquad, isDEF);
    const afterMid = calcGroupAvg(simulatedSquad, isMID);
    const afterAtt = calcGroupAvg(simulatedSquad, isATT);
    const afterRank = getRankForOvr(afterOvr, club.id);
    const afterTier = getTierForRank(afterRank, club.league.clubs.length);

    // Deltas
    const ovrDelta = Number((afterOvr - beforeOvr).toFixed(1));
    const startingXiDelta = Number((afterXi - beforeXi).toFixed(1));
    const budgetDeltaEur = -targetPrice + sellPrice;
    const rankDelta = beforeRank - afterRank; // positive means rank improved

    // Executive Verdict Calculation
    const pros: string[] = [];
    const cons: string[] = [];

    if (startingXiDelta > 0) pros.push(`Starting lineup quality increases by +${startingXiDelta} OVR.`);
    if (rankDelta > 0) pros.push(`Projected league standing improves from #${beforeRank} to #${afterRank}.`);
    if (targetPrice === 0) pros.push(`Free transfer signing preserves 100% of club cash balance.`);
    if (sellPlayer && sellPrice > 0) pros.push(`Offloading ${sellPlayer.fullName} recovers €${(sellPrice / 1_000_000).toFixed(1)}M in cash.`);

    if (afterBudget < 0) cons.push(`Deal exceeds available transfer treasury by €${(Math.abs(afterBudget) / 1_000_000).toFixed(1)}M.`);
    if (afterBudget > 0 && afterBudget < 5_000_000) cons.push(`Leaves club with razor-thin emergency cash reserve (€${(afterBudget / 1_000_000).toFixed(1)}M).`);
    if (startingXiDelta <= 0 && targetPrice > 5_000_000) cons.push(`High transfer fee for a rotational depth player rather than a starting upgrade.`);

    let recommendation: WhatIfSimulationResult["executiveVerdict"]["recommendation"] = "VALUE_BUY";
    let verdictTitle = "✅ Positive Strategic Move";
    let verdictDescription = "This deal improves squad competitiveness within acceptable financial risk.";

    if (afterBudget < 0) {
      recommendation = "FINANCIALLY_RISKY";
      verdictTitle = "❌ Financial Deficit Warning";
      verdictDescription = "This transfer would bankrupt your transfer budget. Sell players first before signing.";
    } else if (startingXiDelta >= 1.5 && afterBudget >= 10_000_000) {
      recommendation = "STRONG_BUY";
      verdictTitle = "🔥 Elite First-Team Masterstroke";
      verdictDescription = "High-impact starter signing that substantially elevates your title chances.";
    } else if (targetPrice === 0) {
      recommendation = "VALUE_BUY";
      verdictTitle = "💎 Free Agent Bargain";
      verdictDescription = "Zero-cost squad addition that bolsters depth with no financial downside.";
    } else if (startingXiDelta === 0) {
      recommendation = "LUXURY_DEAL";
      verdictTitle = "🟡 Squad Depth Luxury";
      verdictDescription = "Good player for rotation, but does not upgrade your strongest starting XI.";
    }

    return {
      targetPlayer: {
        id: targetPlayer.id,
        fullName: targetPlayer.fullName,
        position: targetPlayer.position.toUpperCase(),
        overallRating: targetPlayer.overallRating ?? 75,
        marketValue: targetPrice,
        clubName: targetPlayer.pmbClub?.name || "Free Agent",
      },
      sellPlayer: sellPlayer
        ? {
            id: sellPlayer.id,
            fullName: sellPlayer.fullName,
            position: sellPlayer.position.toUpperCase(),
            overallRating: sellPlayer.overallRating ?? 75,
            marketValue: sellPrice,
          }
        : null,
      before: {
        overallRating: beforeOvr,
        startingXiAvg: beforeXi,
        gkRating: beforeGk,
        defRating: beforeDef,
        midRating: beforeMid,
        attRating: beforeAtt,
        budgetEur: beforeBudget,
        squadSize: currentSquad.length,
        projectedRank: beforeRank,
        tier: beforeTier,
      },
      after: {
        overallRating: afterOvr,
        startingXiAvg: afterXi,
        gkRating: afterGk,
        defRating: afterDef,
        midRating: afterMid,
        attRating: afterAtt,
        budgetEur: afterBudget,
        squadSize: simulatedSquad.length,
        projectedRank: afterRank,
        tier: afterTier,
      },
      deltas: {
        ovrDelta,
        startingXiDelta,
        budgetDeltaEur,
        rankDelta,
      },
      executiveVerdict: {
        recommendation,
        verdictTitle,
        verdictDescription,
        tacticalPros: pros,
        tacticalCons: cons,
      },
    };
  }
}
