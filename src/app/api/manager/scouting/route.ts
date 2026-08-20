import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      include: {
        league: true,
        players: {
          where: { status: "REGISTERED" },
          orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
        },
        PlayerLoan_PlayerLoan_toClubIdToClub: {
          where: { status: "ACTIVE" },
          include: { Player: true },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    if (!club.aiScoutEnabled) {
      return NextResponse.json({
        enabled: false,
        clubName: club.name,
        clubLogo: club.logo,
        aiScoutTier: club.aiScoutTier,
        message: "Chief Scout AI (VIP Pro) is locked for your club.",
      });
    }

    // ── 1. SQUAD POSITIONAL AUDIT ─────────────────────────────────────────
    const players = club.players;
    const budget = Number(club.budget);

    // Helpers to classify positions
    const isGK = (pos: string) => /gk/i.test(pos);
    const isCB = (pos: string) => /cb/i.test(pos);
    const isLB = (pos: string) => /lb|lwb/i.test(pos);
    const isRB = (pos: string) => /rb|rwb/i.test(pos);
    const isDMF = (pos: string) => /dmf|dm/i.test(pos);
    const isCMF = (pos: string) => /cmf|cm/i.test(pos) && !/dmf|amf/i.test(pos);
    const isAMF = (pos: string) => /amf|cam/i.test(pos);
    const isLWF = (pos: string) => /lwf|lw/i.test(pos);
    const isRWF = (pos: string) => /rwf|rw/i.test(pos);
    const isCF = (pos: string) => /cf|st|finisher/i.test(pos);

    const isDEF = (pos: string) => /cb|lb|rb|lwb|rwb|def/i.test(pos);
    const isMID = (pos: string) => /dmf|cmf|amf|lmf|rmf|mid|dm|cam/i.test(pos);
    const isATT = (pos: string) => /cf|st|lwf|rwf|lw|rw|att|fw/i.test(pos);

    const gkPlayers = players.filter((p) => isGK(p.position));
    const cbPlayers = players.filter((p) => isCB(p.position));
    const lbPlayers = players.filter((p) => isLB(p.position));
    const rbPlayers = players.filter((p) => isRB(p.position));
    const dmfPlayers = players.filter((p) => isDMF(p.position));
    const cmfPlayers = players.filter((p) => isCMF(p.position));
    const amfPlayers = players.filter((p) => isAMF(p.position));
    const lwfPlayers = players.filter((p) => isLWF(p.position));
    const rwfPlayers = players.filter((p) => isRWF(p.position));
    const cfPlayers = players.filter((p) => isCF(p.position));

    const defPlayers = players.filter((p) => isDEF(p.position));
    const midPlayers = players.filter((p) => isMID(p.position));
    const attPlayers = players.filter((p) => isATT(p.position));

    const calcAvg = (arr: typeof players) => {
      if (arr.length === 0) return 0;
      const total = arr.reduce((sum, p) => sum + (p.overallRating ?? 75), 0);
      return Math.round(total / arr.length);
    };

    const gkRating = calcAvg(gkPlayers);
    const defRating = calcAvg(defPlayers);
    const midRating = calcAvg(midPlayers);
    const attRating = calcAvg(attPlayers);
    const overallRating = calcAvg(players);

    // Starting XI vs Bench Quality
    const startingXi = players.slice(0, 11);
    const bench = players.slice(11);
    const startingXiAvg = calcAvg(startingXi);
    const benchAvg = bench.length > 0 ? calcAvg(bench) : startingXiAvg - 8;
    const benchQualityDeficit = startingXiAvg - benchAvg;

    // Strongest & Weakest helper per position
    const getPosStats = (posArray: typeof players) => {
      if (posArray.length === 0) return { best: null, weakest: null, avg: 0 };
      const sorted = [...posArray].sort(
        (a, b) => (b.overallRating ?? 75) - (a.overallRating ?? 75)
      );
      return {
        best: {
          fullName: sorted[0].fullName,
          overallRating: sorted[0].overallRating ?? 75,
        },
        weakest: {
          fullName: sorted[sorted.length - 1].fullName,
          overallRating: sorted[sorted.length - 1].overallRating ?? 75,
        },
        avg: calcAvg(posArray),
      };
    };

    // 10-Position Depth Matrix with Strongest & Weakest
    const depthMatrix = [
      { pos: "GK", name: "Goalkeeper", count: gkPlayers.length, minIdeal: 2, ...getPosStats(gkPlayers), status: gkPlayers.length < 2 ? "DEFICIT" : "HEALTHY" },
      { pos: "CB", name: "Center Back", count: cbPlayers.length, minIdeal: 3, ...getPosStats(cbPlayers), status: cbPlayers.length < 3 ? "DEFICIT" : "HEALTHY" },
      { pos: "LB", name: "Left Back", count: lbPlayers.length, minIdeal: 2, ...getPosStats(lbPlayers), status: lbPlayers.length < 1 ? "DEFICIT" : "HEALTHY" },
      { pos: "RB", name: "Right Back", count: rbPlayers.length, minIdeal: 2, ...getPosStats(rbPlayers), status: rbPlayers.length < 1 ? "DEFICIT" : "HEALTHY" },
      { pos: "DMF", name: "Defensive Mid", count: dmfPlayers.length, minIdeal: 1, ...getPosStats(dmfPlayers), status: dmfPlayers.length < 1 ? "DEFICIT" : "HEALTHY" },
      { pos: "CMF", name: "Central Mid", count: cmfPlayers.length, minIdeal: 2, ...getPosStats(cmfPlayers), status: cmfPlayers.length < 2 ? "DEFICIT" : "HEALTHY" },
      { pos: "AMF", name: "Attacking Mid", count: amfPlayers.length, minIdeal: 1, ...getPosStats(amfPlayers), status: amfPlayers.length < 1 ? "DEFICIT" : "HEALTHY" },
      { pos: "LWF", name: "Left Wing", count: lwfPlayers.length, minIdeal: 1, ...getPosStats(lwfPlayers), status: lwfPlayers.length < 1 ? "DEFICIT" : "HEALTHY" },
      { pos: "RWF", name: "Right Wing", count: rwfPlayers.length, minIdeal: 1, ...getPosStats(rwfPlayers), status: rwfPlayers.length < 1 ? "DEFICIT" : "HEALTHY" },
      { pos: "CF", name: "Center Forward", count: cfPlayers.length, minIdeal: 2, ...getPosStats(cfPlayers), status: cfPlayers.length < 2 ? "DEFICIT" : "HEALTHY" },
    ];

    // ── 2. SQUAD HEALTH SCORE (/100) ──────────────────────────────────────
    const calcPosScore = (count: number, minIdeal: number, avgRating: number) => {
      let score = 50;
      if (count >= minIdeal) score += 20;
      else if (count === 0) score -= 30;
      else score += (count / minIdeal) * 15;

      score += Math.max(0, Math.min(30, (avgRating - 70) * 1.5));
      return Math.min(99, Math.max(25, Math.round(score)));
    };

    const gkScore = calcPosScore(gkPlayers.length, 2, gkRating);
    const defScore = calcPosScore(defPlayers.length, 4, defRating);
    const midScore = calcPosScore(midPlayers.length, 4, midRating);
    const attScore = calcPosScore(attPlayers.length, 3, attRating);
    const overallHealthScore = Math.round((gkScore + defScore + midScore + attScore) / 4);

    // ── 3. SURPLUS PLAYERS & SELL/LOAN CANDIDATES ─────────────────────────
    const sellOrLoanCandidates: Array<{
      id: string;
      fullName: string;
      position: string;
      overallRating: number;
      marketValue: number;
      action: "SELL" | "LOAN";
      reason: string;
    }> = [];

    // Check surplus in Midfield
    if (midPlayers.length > 5) {
      const surplusMids = [...midPlayers]
        .sort((a, b) => (a.overallRating ?? 75) - (b.overallRating ?? 75))
        .slice(0, midPlayers.length - 4);
      for (const p of surplusMids) {
        sellOrLoanCandidates.push({
          id: p.id,
          fullName: p.fullName,
          position: p.position.toUpperCase(),
          overallRating: p.overallRating ?? 75,
          marketValue: Number(p.marketValue ?? 0),
          action: (p.overallRating ?? 75) <= 75 ? "SELL" : "LOAN",
          reason: `Excess midfield depth (${midPlayers.length} mids). Free up wage budget for striker/defender.`,
        });
      }
    }

    // Check surplus in Defense
    if (defPlayers.length > 6) {
      const surplusDefs = [...defPlayers]
        .sort((a, b) => (a.overallRating ?? 75) - (b.overallRating ?? 75))
        .slice(0, defPlayers.length - 5);
      for (const p of surplusDefs) {
        sellOrLoanCandidates.push({
          id: p.id,
          fullName: p.fullName,
          position: p.position.toUpperCase(),
          overallRating: p.overallRating ?? 75,
          marketValue: Number(p.marketValue ?? 0),
          action: "LOAN",
          reason: `Surplus defensive rotation option. Loan out for matchday experience.`,
        });
      }
    }

    // ── 4. LEAGUE BENCHMARKS & COMPETITOR COMPARISON ──────────────────────
    const allLeagueClubs = await prisma.club.findMany({
      where: { leagueId: club.leagueId },
      include: {
        players: {
          where: { status: "REGISTERED" },
          select: { position: true, overallRating: true },
        },
      },
    });

    const clubStatsList = allLeagueClubs.map((c) => {
      const gks = c.players.filter((p) => isGK(p.position));
      const defs = c.players.filter((p) => isDEF(p.position));
      const mids = c.players.filter((p) => isMID(p.position));
      const atts = c.players.filter((p) => isATT(p.position));

      const avg = (arr: typeof c.players) =>
        arr.length > 0
          ? Math.round(arr.reduce((s, p) => s + (p.overallRating ?? 75), 0) / arr.length)
          : 70;

      return {
        clubId: c.id,
        clubName: c.name,
        ovr: avg(c.players),
        gk: avg(gks),
        def: avg(defs),
        mid: avg(mids),
        att: avg(atts),
        squadSize: c.players.length,
      };
    });

    // Sort to find Leader, Top 3, Lowest
    const sortedByOvr = [...clubStatsList].sort((a, b) => b.ovr - a.ovr);
    const leagueLeader = sortedByOvr[0] || null;
    const lowestClub = sortedByOvr[sortedByOvr.length - 1] || null;
    const top3Clubs = sortedByOvr.slice(0, 3);

    const top3Avg = {
      ovr: Math.round(top3Clubs.reduce((s, c) => s + c.ovr, 0) / Math.max(1, top3Clubs.length)),
      gk: Math.round(top3Clubs.reduce((s, c) => s + c.gk, 0) / Math.max(1, top3Clubs.length)),
      def: Math.round(top3Clubs.reduce((s, c) => s + c.def, 0) / Math.max(1, top3Clubs.length)),
      mid: Math.round(top3Clubs.reduce((s, c) => s + c.mid, 0) / Math.max(1, top3Clubs.length)),
      att: Math.round(top3Clubs.reduce((s, c) => s + c.att, 0) / Math.max(1, top3Clubs.length)),
    };

    const leagueAvgStats = {
      ovr: Math.round(clubStatsList.reduce((s, c) => s + c.ovr, 0) / Math.max(1, clubStatsList.length)),
      gk: Math.round(clubStatsList.reduce((s, c) => s + c.gk, 0) / Math.max(1, clubStatsList.length)),
      def: Math.round(clubStatsList.reduce((s, c) => s + c.def, 0) / Math.max(1, clubStatsList.length)),
      mid: Math.round(clubStatsList.reduce((s, c) => s + c.mid, 0) / Math.max(1, clubStatsList.length)),
      att: Math.round(clubStatsList.reduce((s, c) => s + c.att, 0) / Math.max(1, clubStatsList.length)),
    };

    // My club ranks
    const getRank = (key: "ovr" | "gk" | "def" | "mid" | "att") => {
      const sorted = [...clubStatsList].sort((a, b) => b[key] - a[key]);
      const idx = sorted.findIndex((c) => c.clubId === club.id);
      return idx >= 0 ? idx + 1 : 1;
    };

    const myRanks = {
      overall: getRank("ovr"),
      gk: getRank("gk"),
      def: getRank("def"),
      mid: getRank("mid"),
      att: getRank("att"),
      totalClubs: allLeagueClubs.length,
    };

    // Closest Competitor (club just above or below us)
    const myOvrIdx = sortedByOvr.findIndex((c) => c.clubId === club.id);
    const closestCompetitor =
      myOvrIdx > 0
        ? sortedByOvr[myOvrIdx - 1]
        : sortedByOvr.length > 1
        ? sortedByOvr[1]
        : null;

    // ── 5. GAP DETECTION & ALERTS ─────────────────────────────────────────
    const gapAlerts: {
      id: string;
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
      title: string;
      positionGroup: "GK" | "DEF" | "MID" | "ATT" | "GENERAL";
      description: string;
      targetPositions: string[];
    }[] = [];

    if (gkPlayers.length === 0) {
      gapAlerts.push({
        id: "no-gk",
        severity: "CRITICAL",
        title: "No Registered Goalkeeper",
        positionGroup: "GK",
        description: "Your club currently has 0 registered goalkeepers. Urgent signing required.",
        targetPositions: ["GK"],
      });
    } else if (gkPlayers.length === 1) {
      gapAlerts.push({
        id: "low-gk",
        severity: "MEDIUM",
        title: "Single Goalkeeper Vulnerability",
        positionGroup: "GK",
        description: `Only 1 goalkeeper registered (${gkPlayers[0].fullName}, ${gkPlayers[0].overallRating ?? 75} OVR). Backup needed.`,
        targetPositions: ["GK"],
      });
    }

    if (cbPlayers.length < 2) {
      gapAlerts.push({
        id: "cb-shortage",
        severity: "HIGH",
        title: "Central Defense Shortage",
        positionGroup: "DEF",
        description: `Only ${cbPlayers.length} natural CB in squad. You need at least 3 for rotation.`,
        targetPositions: ["CB"],
      });
    }

    if (cfPlayers.length < 1) {
      gapAlerts.push({
        id: "no-striker",
        severity: "HIGH",
        title: "No Center Forward",
        positionGroup: "ATT",
        description: "Your attack has no pure Center Forward (CF/ST) to lead the frontline.",
        targetPositions: ["CF", "ST"],
      });
    }

    if (defRating > 0 && defRating < leagueAvgStats.def - 3) {
      gapAlerts.push({
        id: "def-lag",
        severity: "HIGH",
        title: "Defense Below League Standard",
        positionGroup: "DEF",
        description: `Your defense (${defRating} OVR, Rank #${myRanks.def}) is lagging behind the league average (${leagueAvgStats.def} OVR).`,
        targetPositions: ["CB", "LB", "RB"],
      });
    }

    // Loans expiry
    const incomingLoans = club.PlayerLoan_PlayerLoan_toClubIdToClub;
    for (const loan of incomingLoans) {
      const daysLeft = Math.ceil((new Date(loan.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 14) {
        gapAlerts.push({
          id: `loan-${loan.id}`,
          severity: daysLeft <= 7 ? "HIGH" : "MEDIUM",
          title: `Loan Expiring: ${loan.Player.fullName}`,
          positionGroup: isATT(loan.Player.position) ? "ATT" : isMID(loan.Player.position) ? "MID" : "DEF",
          description: `${loan.Player.fullName} loan ends in ${daysLeft} days. Scout permanent replacement.`,
          targetPositions: [loan.Player.position],
        });
      }
    }

    if (gapAlerts.length === 0) {
      gapAlerts.push({
        id: "squad-healthy",
        severity: "INFO",
        title: "Squad Depth & Quality is Balanced",
        positionGroup: "GENERAL",
        description: "Your roster has healthy coverage across all sectors. Focus on marquee upgrades in live auctions.",
        targetPositions: ["CF", "AMF", "CB"],
      });
    }

    const neededPositions = Array.from(new Set(gapAlerts.flatMap((a) => a.targetPositions)));

    // ── 6. MULTI-CHANNEL MARKET SCAN ──────────────────────────────────────
    const [freeAgents, activeAuctions, rivalSurplus, recentCompletedTransfers] = await Promise.all([
      prisma.player.findMany({
        where: { status: "AVAILABLE", pmbClubId: null },
        orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
        take: 40,
      }),
      prisma.auction.findMany({
        where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
        include: { player: true, currentWinnerClub: { select: { id: true, name: true } } },
        orderBy: { expiresAt: "asc" },
        take: 12,
      }),
      prisma.player.findMany({
        where: { status: "REGISTERED", pmbClubId: { not: club.id } },
        orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
        take: 20,
        include: { pmbClub: { select: { id: true, name: true, logo: true } } },
      }),
      prisma.transfer.findMany({
        where: { status: "COMPLETED" },
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: {
          player: { select: { fullName: true, position: true, overallRating: true } },
          fromClub: { select: { name: true } },
          toClub: { select: { name: true } },
        },
      }),
    ]);

    // Format 1: Immediate Starters (Free Agents)
    const immediateStarters = freeAgents
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        playerId: p.playerId,
        fullName: p.fullName,
        position: p.position.toUpperCase(),
        overallRating: p.overallRating ?? 75,
        marketValue: Number(p.marketValue ?? 0),
        realClub: p.realClub,
        nationality: p.nationality,
        photo: p.photo,
        fitsGap: neededPositions.some((pos) => p.position.toUpperCase().includes(pos.toUpperCase())),
        affordable: Number(p.marketValue ?? 0) <= budget,
        reason: (p.overallRating ?? 75) >= overallRating
          ? `+${(p.overallRating ?? 75) - overallRating} OVR upgrade to current team average.`
          : `Fills depth in ${p.position.toUpperCase()} with instant free-agent signing.`,
      }));

    // Format 2: Budget Gems
    const budgetGems = freeAgents
      .filter((p) => Number(p.marketValue ?? 0) <= Math.max(15_000_000, budget * 0.6))
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        playerId: p.playerId,
        fullName: p.fullName,
        position: p.position.toUpperCase(),
        overallRating: p.overallRating ?? 75,
        marketValue: Number(p.marketValue ?? 0),
        realClub: p.realClub,
        nationality: p.nationality,
        photo: p.photo,
        fitsGap: neededPositions.some((pos) => p.position.toUpperCase().includes(pos.toUpperCase())),
        affordable: true,
        reason: `Value pick: €${(Number(p.marketValue ?? 0) / 1_000_000).toFixed(1)}M market value.`,
      }));

    // Format 3: Live Auctions
    const auctionOpportunities = activeAuctions.map((auc) => {
      const nextBid = Number(auc.currentBid) + Number(auc.minIncrement);
      const isAffordable = nextBid <= budget;
      const isWinning = auc.currentWinnerClubId === club.id;

      return {
        auctionId: auc.id,
        playerId: auc.player.id,
        fullName: auc.player.fullName,
        position: auc.player.position.toUpperCase(),
        overallRating: auc.player.overallRating ?? 75,
        photo: auc.player.photo,
        realClub: auc.player.realClub,
        currentBid: Number(auc.currentBid),
        minIncrement: Number(auc.minIncrement),
        nextBid,
        expiresAt: auc.expiresAt.toISOString(),
        isWinning,
        currentWinnerName: auc.currentWinnerClub?.name ?? "No bids yet",
        affordable: isAffordable,
        reason: isWinning
          ? "You currently hold the highest bid!"
          : isAffordable
          ? `Live bidding open within your €${(budget / 1_000_000).toFixed(1)}M budget.`
          : "Exceeds current cash balance.",
      };
    });

    // Format 4: Rival Club Targets
    const rivalClubTargets = rivalSurplus.slice(0, 4).map((p) => ({
      id: p.id,
      playerId: p.playerId,
      fullName: p.fullName,
      position: p.position.toUpperCase(),
      overallRating: p.overallRating ?? 75,
      marketValue: Number(p.marketValue ?? 0),
      currentClubName: p.pmbClub?.name ?? "Rival Club",
      currentClubLogo: p.pmbClub?.logo ?? null,
      realClub: p.realClub,
      nationality: p.nationality,
      photo: p.photo,
      fitsGap: neededPositions.some((pos) => p.position.toUpperCase().includes(pos.toUpperCase())),
      affordable: Number(p.marketValue ?? 0) <= budget,
      reason: `Transfer / Loan prospect currently registered to ${p.pmbClub?.name ?? "rival team"}.`,
    }));

    // Format 5: "Best Available for My Budget" Algorithmic Ranker
    const bestAvailableForBudget = [...freeAgents, ...rivalSurplus]
      .filter((p) => Number(p.marketValue ?? 0) <= budget || Number(p.marketValue ?? 0) === 0)
      .map((p) => {
        const rating = p.overallRating ?? 75;
        const price = Number(p.marketValue ?? 0);
        const delta = rating - overallRating;
        const isNeeded = neededPositions.some((pos) =>
          p.position.toUpperCase().includes(pos.toUpperCase())
        );

        let score = rating * 1.2 + delta * 3;
        if (isNeeded) score += 15;
        score += Math.max(0, 10 - price / 5_000_000);

        return {
          id: p.id,
          playerId: p.playerId,
          fullName: p.fullName,
          position: p.position.toUpperCase(),
          overallRating: rating,
          marketValue: price,
          nationality: p.nationality,
          realClub: p.realClub,
          currentClubName: (p as any).pmbClub?.name || "Free Agent",
          ratingImprovement: delta,
          isNeeded,
          score,
          impactSummary:
            delta > 0
              ? `+${delta} OVR squad upgrade • Leaves €${((budget - price) / 1_000_000).toFixed(1)}M reserve`
              : `Reliable depth in ${p.position.toUpperCase()} • €${(price / 1_000_000).toFixed(1)}M`,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // ── 7. NEXT OPPONENT TACTICAL SCOUTING REPORT ─────────────────────────
    const upcomingMatch = await prisma.match.findFirst({
      where: {
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
        status: "UPCOMING",
      },
      orderBy: { matchday: "asc" },
      include: {
        homeClub: {
          include: {
            manager: { select: { username: true } },
            players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
          },
        },
        awayClub: {
          include: {
            manager: { select: { username: true } },
            players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
          },
        },
        season: {
          include: { competitionSeason: true },
        },
      },
    });

    let nextOpponentReport: any = null;

    if (upcomingMatch) {
      const isHome = upcomingMatch.homeClubId === club.id;
      const opponentClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
      const oppPlayers = opponentClub.players;

      const oppGkPlayers = oppPlayers.filter((p) => isGK(p.position));
      const oppDefPlayers = oppPlayers.filter((p) => isDEF(p.position));
      const oppMidPlayers = oppPlayers.filter((p) => isMID(p.position));
      const oppAttPlayers = oppPlayers.filter((p) => isATT(p.position));

      const oppOverall = calcAvg(oppPlayers);
      const oppGkRating = calcAvg(oppGkPlayers);
      const oppDefRating = calcAvg(oppDefPlayers);
      const oppMidRating = calcAvg(oppMidPlayers);
      const oppAttRating = calcAvg(oppAttPlayers);

      const bestPlayers = oppPlayers.slice(0, 4).map((p) => ({
        id: p.id,
        fullName: p.fullName,
        position: p.position.toUpperCase(),
        overallRating: p.overallRating ?? 75,
        photo: p.photo,
        marketValue: Number(p.marketValue ?? 0),
      }));

      const [oppGoals, oppAssists] = await Promise.all([
        prisma.matchEvent.findMany({
          where: { clubId: opponentClub.id, type: "GOAL" },
          include: { player: { select: { id: true, fullName: true, position: true, overallRating: true } } },
        }),
        prisma.matchEvent.findMany({
          where: {
            clubId: opponentClub.id,
            OR: [{ type: "ASSIST" }, { assistPlayerId: { not: null } }],
          },
          include: {
            assistPlayer: { select: { id: true, fullName: true, position: true, overallRating: true } },
            player: { select: { id: true, fullName: true, position: true, overallRating: true } },
          },
        }),
      ]);

      const goalCounts: Record<string, { player: any; goals: number }> = {};
      for (const event of oppGoals) {
        if (event.player) {
          if (!goalCounts[event.player.id]) {
            goalCounts[event.player.id] = { player: event.player, goals: 0 };
          }
          goalCounts[event.player.id].goals++;
        }
      }
      const topScorers = Object.values(goalCounts)
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 3)
        .map((g) => ({
          id: g.player.id,
          fullName: g.player.fullName,
          position: g.player.position.toUpperCase(),
          overallRating: g.player.overallRating ?? 75,
          goals: g.goals,
        }));

      const assistCounts: Record<string, { player: any; assists: number }> = {};
      for (const event of oppAssists) {
        const ap = event.assistPlayer || (event.type === "ASSIST" ? event.player : null);
        if (ap) {
          if (!assistCounts[ap.id]) {
            assistCounts[ap.id] = { player: ap, assists: 0 };
          }
          assistCounts[ap.id].assists++;
        }
      }
      const topAssists = Object.values(assistCounts)
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 3)
        .map((a) => ({
          id: a.player.id,
          fullName: a.player.fullName,
          position: a.player.position.toUpperCase(),
          overallRating: a.player.overallRating ?? 75,
          assists: a.assists,
        }));

      const strengths: string[] = [];
      const vulnerabilities: string[] = [];
      let suggestedFormation = "4-3-3 Standard";
      let areaToExploit = "Central Midfield";
      let playerToMark = bestPlayers[0]?.fullName || "Primary Attacker";

      if (oppAttRating >= 82 || topScorers.length > 0) {
        strengths.push(`Dangerous Attack (${oppAttRating} OVR). ${topScorers[0]?.fullName ? `${topScorers[0].fullName} is their primary goal threat.` : ""}`);
        playerToMark = topScorers[0]?.fullName || bestPlayers[0]?.fullName || "Top Striker";
      }
      if (oppMidRating >= 82) {
        strengths.push(`Strong Midfield Control (${oppMidRating} OVR). They dominate possession.`);
      }
      if (oppDefRating < 78) {
        vulnerabilities.push(`Vulnerable Backline (${oppDefRating} OVR). Exploit their center-backs with fast vertical through-balls.`);
        areaToExploit = "Behind their Central Defenders";
        suggestedFormation = "4-3-3 Fast Counter-Attack";
      } else if (oppGkRating < 78) {
        vulnerabilities.push(`Unproven Goalkeeper (${oppGkRating} OVR). Instruct forwards to shoot on sight from the edge of the penalty box.`);
        areaToExploit = "Edge of Penalty Area";
      } else {
        areaToExploit = "Wide Flanks and Cutbacks";
      }

      if (strengths.length === 0) strengths.push("Well-balanced squad with steady baseline performance.");
      if (vulnerabilities.length === 0) vulnerabilities.push("Solid across all sectors; maintain defensive discipline.");

      nextOpponentReport = {
        hasUpcomingMatch: true,
        matchId: upcomingMatch.id,
        matchday: upcomingMatch.matchday,
        competitionName: upcomingMatch.season?.competitionSeason?.name ?? upcomingMatch.season?.name ?? "League Match",
        isHome,
        opponent: {
          id: opponentClub.id,
          name: opponentClub.name,
          logo: opponentClub.logo,
          managerUsername: opponentClub.manager?.username ?? "No Manager",
          squadSize: oppPlayers.length,
          overallRating: oppOverall,
          ratings: {
            gk: oppGkRating,
            def: oppDefRating,
            mid: oppMidRating,
            att: oppAttRating,
          },
        },
        bestPlayers,
        topScorers,
        topAssists,
        matchPlan: {
          formation: suggestedFormation,
          tacticalApproach: isHome ? "High-Tempo Possession & Frontfoot Press" : "Disciplined Mid-Block & Rapid Transitions",
          mainThreat: strengths[0],
          areaToExploit,
          playerToMark,
          defensiveStrategy: isHome ? "Compact high-line with offside trap" : "Deep defensive block denying space behind fullbacks",
          attackingStrategy: oppDefRating < 78 ? "Fast vertical balls into channels" : "Overload wide areas and look for second balls",
          scoutVerdict: isHome
            ? `Playing at HOME gives you the psychological edge. ${vulnerabilities[0] || "Control the pace from the start."}`
            : `AWAY fixture. Exercise tactical patience and neutralize their ${strengths[0] || "frontline"}.`,
        },
      };
    } else {
      nextOpponentReport = {
        hasUpcomingMatch: false,
        message: "No upcoming fixtures scheduled in the active season.",
      };
    }

    // ── 8. TRANSFER BUDGET PLANNER ALLOCATIONS ─────────────────────────────
    const primaryNeedPos = neededPositions[0] || "CF";
    const primaryBudgetSpend = Math.round(budget * 0.55);
    const secondaryBudgetSpend = Math.round(budget * 0.25);
    const emergencyReserve = budget - primaryBudgetSpend - secondaryBudgetSpend;

    const budgetPlanner = {
      totalBudget: budget,
      primaryAllocation: {
        targetPosition: primaryNeedPos,
        suggestedAmount: primaryBudgetSpend,
        reason: `Reinforce critical ${primaryNeedPos} gap with proven starter.`,
      },
      secondaryAllocation: {
        targetPosition: neededPositions[1] || "CB",
        suggestedAmount: secondaryBudgetSpend,
        reason: "Squad depth and defensive rotation reinforcement.",
      },
      emergencyReserve: {
        amount: emergencyReserve,
        reason: "Preserve liquidity for matchday rewards and live auction snipes.",
      },
      financialAdvice:
        budget > 25_000_000
          ? "You have strong spending power. Split budget between a marquee starter and key depth rather than blowing it on a single signing."
          : "Tight financial margin. Prioritize high rating-per-million free agents and loan deals.",
    };

    return NextResponse.json({
      enabled: true,
      club: {
        id: club.id,
        name: club.name,
        logo: club.logo,
        budget,
        leagueName: club.league.name,
        aiScoutTier: club.aiScoutTier,
      },
      audit: {
        squadSize: players.length,
        overallRating,
        gkRating,
        defRating,
        midRating,
        attRating,
        startingXiAvg,
        benchAvg,
        benchQualityDeficit,
        counts: {
          gk: gkPlayers.length,
          def: defPlayers.length,
          mid: midPlayers.length,
          att: attPlayers.length,
        },
        healthScores: {
          overall: overallHealthScore,
          gk: gkScore,
          def: defScore,
          mid: midScore,
          att: attScore,
        },
        sellOrLoanCandidates,
      },
      depthMatrix,
      leagueBenchmarks: {
        myRanks,
        leagueAverage: leagueAvgStats,
        leagueLeader: leagueLeader ? { name: leagueLeader.clubName, ...leagueLeader } : null,
        top3Average: top3Avg,
        closestCompetitor: closestCompetitor ? { name: closestCompetitor.clubName, ...closestCompetitor } : null,
        lowestClub: lowestClub ? { name: lowestClub.clubName, ...lowestClub } : null,
      },
      gapAlerts,
      nextOpponentReport,
      budgetPlanner,
      recommendations: {
        immediateStarters,
        budgetGems,
        auctionOpportunities,
        rivalClubTargets,
        bestAvailableForBudget,
      },
      transferWindowOverview: {
        recentCompletedTransfers: recentCompletedTransfers.map((t) => ({
          id: t.id,
          playerName: t.player?.fullName || t.playerName,
          position: t.player?.position.toUpperCase() || "FW",
          overallRating: t.player?.overallRating ?? 75,
          fromClubName: t.fromClub?.name || t.fromClubName,
          toClubName: t.toClub?.name || t.toClubName,
          fee: Number(t.fee || 0),
          type: t.type,
          completedAt: t.updatedAt.toISOString(),
        })),
      },
      squadPlayers: players.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        position: p.position.toUpperCase(),
        nationality: p.nationality,
        overallRating: p.overallRating ?? 75,
        marketValue: Number(p.marketValue ?? 0),
      })),
      allAvailablePlayers: freeAgents.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        position: p.position.toUpperCase(),
        nationality: p.nationality,
        overallRating: p.overallRating ?? 75,
        marketValue: Number(p.marketValue ?? 0),
        realClub: p.realClub,
      })),
    });
  } catch (error) {
    console.error("Failed to execute AI scouting audit:", error);
    return NextResponse.json(
      { error: "Failed to execute AI scouting audit" },
      { status: 500 }
    );
  }
}
