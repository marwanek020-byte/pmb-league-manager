import { prisma } from "@/lib/prisma";

export type OpponentTacticalReport = {
  hasUpcomingMatch: boolean;
  matchday?: number;
  isHome?: boolean;
  competitionName?: string;
  opponent: {
    id: string;
    name: string;
    logo?: string | null;
    managerUsername?: string;
    squadSize: number;
    overallRating: number;
    gkRating: number;
    defRating: number;
    midRating: number;
    attRating: number;
    bestPlayers: Array<{ fullName: string; position: string; overallRating: number }>;
    topScorers: Array<{ name: string; goals: number; pos: string }>;
    playmakers: Array<{ name: string; assists: number; pos: string }>;
  } | null;
  myClub: {
    overallRating: number;
    gkRating: number;
    defRating: number;
    midRating: number;
    attRating: number;
  };
  simulationOutcome: {
    winProbability: number; // 0-100%
    drawProbability: number;
    lossProbability: number;
    projectedScore: string;
    expectedGoals: { myClub: number; opponent: number };
  };
  tacticalPlan: {
    recommendedFormation: string;
    tacticalMentality: "HIGH_PRESS" | "BALANCED_CONTROL" | "COUNTER_ATTACK" | "LOW_BLOCK_DEFENSIVE";
    mentalityLabel: string;
    keyThreat: string;
    vulnerabilityZone: string;
    primaryDirectives: string[];
    manMarkingDuty: string;
  };
};

export class OpponentTacticalService {
  static async generatePreMatchDossier(clubId: string): Promise<OpponentTacticalReport> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        players: { where: { status: "REGISTERED" } },
      },
    });

    if (!club) throw new Error("Club not found");

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
            players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }] },
          },
        },
        awayClub: {
          include: {
            manager: { select: { username: true } },
            players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }] },
          },
        },
        season: {
          include: { competitionSeason: true },
        },
      },
    });

    const isGK = (pos: string) => /gk/i.test(pos);
    const isDEF = (pos: string) => /cb|lb|rb|lwb|rwb|def/i.test(pos);
    const isMID = (pos: string) => /dmf|cmf|amf|mid|dm|cam/i.test(pos);
    const isATT = (pos: string) => /cf|st|lwf|rwf|att|fw/i.test(pos);

    const calcAvg = (arr: Array<{ position: string; overallRating: number | null }>) => {
      if (arr.length === 0) return 70;
      return Math.round(arr.reduce((s, p) => s + (p.overallRating ?? 75), 0) / arr.length);
    };

    const myClubStats = {
      overallRating: calcAvg(club.players),
      gkRating: calcAvg(club.players.filter((p) => isGK(p.position))),
      defRating: calcAvg(club.players.filter((p) => isDEF(p.position))),
      midRating: calcAvg(club.players.filter((p) => isMID(p.position))),
      attRating: calcAvg(club.players.filter((p) => isATT(p.position))),
    };

    if (!upcomingMatch) {
      return {
        hasUpcomingMatch: false,
        opponent: null,
        myClub: myClubStats,
        simulationOutcome: {
          winProbability: 50,
          drawProbability: 25,
          lossProbability: 25,
          projectedScore: "—",
          expectedGoals: { myClub: 1.5, opponent: 1.0 },
        },
        tacticalPlan: {
          recommendedFormation: "4-3-3 Balanced",
          tacticalMentality: "BALANCED_CONTROL",
          mentalityLabel: "⚖️ Balanced Possession",
          keyThreat: "No active opponent",
          vulnerabilityZone: "Standard Training",
          primaryDirectives: ["Maintain squad fitness and tactical sharpness."],
          manMarkingDuty: "Standard zonal marking.",
        },
      };
    }

    const isHome = upcomingMatch.homeClubId === club.id;
    const oppClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
    const oppPlayers = oppClub.players;

    const oppStats = {
      overallRating: calcAvg(oppPlayers),
      gkRating: calcAvg(oppPlayers.filter((p) => isGK(p.position))),
      defRating: calcAvg(oppPlayers.filter((p) => isDEF(p.position))),
      midRating: calcAvg(oppPlayers.filter((p) => isMID(p.position))),
      attRating: calcAvg(oppPlayers.filter((p) => isATT(p.position))),
    };

    // Goals & Assists
    const [oppGoals, oppAssists] = await Promise.all([
      prisma.matchEvent.findMany({
        where: { clubId: oppClub.id, type: "GOAL" },
        include: { player: { select: { fullName: true, position: true } } },
      }),
      prisma.matchEvent.findMany({
        where: { clubId: oppClub.id, OR: [{ type: "ASSIST" }, { assistPlayerId: { not: null } }] },
        include: { assistPlayer: { select: { fullName: true, position: true } } },
      }),
    ]);

    const goalCounts: Record<string, { name: string; goals: number; pos: string }> = {};
    for (const e of oppGoals) {
      if (e.player) {
        if (!goalCounts[e.player.fullName]) {
          goalCounts[e.player.fullName] = { name: e.player.fullName, goals: 0, pos: e.player.position };
        }
        goalCounts[e.player.fullName].goals++;
      }
    }
    const topScorers = Object.values(goalCounts).sort((a, b) => b.goals - a.goals).slice(0, 3);

    const assistCounts: Record<string, { name: string; assists: number; pos: string }> = {};
    for (const e of oppAssists) {
      if (e.assistPlayer) {
        if (!assistCounts[e.assistPlayer.fullName]) {
          assistCounts[e.assistPlayer.fullName] = { name: e.assistPlayer.fullName, assists: 0, pos: e.assistPlayer.position };
        }
        assistCounts[e.assistPlayer.fullName].assists++;
      }
    }
    const playmakers = Object.values(assistCounts).sort((a, b) => b.assists - a.assists).slice(0, 3);

    const bestPlayers = oppPlayers.slice(0, 4).map((p) => ({
      fullName: p.fullName,
      position: p.position.toUpperCase(),
      overallRating: p.overallRating ?? 75,
    }));

    // 1,000-Iteration Monte Carlo Simulation
    const ratingDiff = myClubStats.overallRating - oppStats.overallRating + (isHome ? 3 : -2);
    let myWins = 0;
    let draws = 0;
    let oppWins = 0;
    let totalMyGoals = 0;
    let totalOppGoals = 0;

    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      const myBaseXg = Math.max(0.5, 1.4 + ratingDiff * 0.08 + (Math.random() * 0.6 - 0.3));
      const oppBaseXg = Math.max(0.4, 1.2 - ratingDiff * 0.08 + (Math.random() * 0.6 - 0.3));

      // Poisson-like score generation
      const myScore = Math.floor(myBaseXg + (Math.random() > 0.6 ? 1 : 0) + (Math.random() > 0.85 ? 1 : 0));
      const oppScore = Math.floor(oppBaseXg + (Math.random() > 0.65 ? 1 : 0) + (Math.random() > 0.9 ? 1 : 0));

      totalMyGoals += myScore;
      totalOppGoals += oppScore;

      if (myScore > oppScore) myWins++;
      else if (myScore === oppScore) draws++;
      else oppWins++;
    }

    const winProb = Math.round((myWins / iterations) * 100);
    const drawProb = Math.round((draws / iterations) * 100);
    const lossProb = 100 - winProb - drawProb;
    const avgMyG = Number((totalMyGoals / iterations).toFixed(1));
    const avgOppG = Number((totalOppGoals / iterations).toFixed(1));

    // Tactical Strategy Generation
    let recommendedFormation = "4-3-3 Attack";
    let mentality: OpponentTacticalReport["tacticalPlan"]["tacticalMentality"] = "BALANCED_CONTROL";
    let mentalityLabel = "⚖️ Balanced Possession";
    let keyThreat = bestPlayers[0]?.fullName || "Opponent Frontline";
    let vulnerabilityZone = "Central Midfield Channel";
    const primaryDirectives: string[] = [];

    if (oppStats.attRating >= 80 && myClubStats.defRating < 78) {
      recommendedFormation = "4-2-3-1 Midfield Shield";
      mentality = "COUNTER_ATTACK";
      mentalityLabel = "⚡ Disciplined Mid-Block Counter";
      vulnerabilityZone = "Opponent High Defensive Line";
      primaryDirectives.push("Deploy double DMF pivots to absorb opponent frontline pressure.");
      primaryDirectives.push("Strike on fast vertical transitions into channels behind their fullbacks.");
    } else if (oppStats.defRating < 75) {
      recommendedFormation = "4-3-3 High Press";
      mentality = "HIGH_PRESS";
      mentalityLabel = "🔥 High-Intensity Offensive Press";
      vulnerabilityZone = "Opponent Central Backline";
      primaryDirectives.push("Trigger high press from kickoff to force defensive distribution errors.");
      primaryDirectives.push("Overload the final third with overlapping wingers and late box arrivals.");
    } else {
      recommendedFormation = "4-3-3 Control";
      mentality = "BALANCED_CONTROL";
      mentalityLabel = "⚖️ Fluid Positional Control";
      vulnerabilityZone = "Half-Spaces between Midfield and Defense";
      primaryDirectives.push("Control tempo with short progressive passing sequences.");
      primaryDirectives.push("Isolate opponent fullbacks in 1v1 situations out wide.");
    }

    const manMarkingDuty = bestPlayers.length > 0
      ? `Instruct your DMF or fullback to tight-mark ${bestPlayers[0].fullName} (${bestPlayers[0].position}, ${bestPlayers[0].overallRating} OVR) to stifle their primary creative outlet.`
      : "Maintain disciplined zonal coverage across defensive channels.";

    return {
      hasUpcomingMatch: true,
      matchday: upcomingMatch.matchday,
      isHome,
      competitionName: upcomingMatch.season?.competitionSeason?.name || "League Match",
      opponent: {
        id: oppClub.id,
        name: oppClub.name,
        logo: oppClub.logo,
        managerUsername: oppClub.manager?.username,
        squadSize: oppPlayers.length,
        overallRating: oppStats.overallRating,
        gkRating: oppStats.gkRating,
        defRating: oppStats.defRating,
        midRating: oppStats.midRating,
        attRating: oppStats.attRating,
        bestPlayers,
        topScorers,
        playmakers,
      },
      myClub: myClubStats,
      simulationOutcome: {
        winProbability: winProb,
        drawProbability: drawProb,
        lossProbability: lossProb,
        projectedScore: `${Math.round(avgMyG)} - ${Math.round(avgOppG)}`,
        expectedGoals: { myClub: avgMyG, opponent: avgOppG },
      },
      tacticalPlan: {
        recommendedFormation,
        tacticalMentality: mentality,
        mentalityLabel,
        keyThreat,
        vulnerabilityZone,
        primaryDirectives,
        manMarkingDuty,
      },
    };
  }
}
