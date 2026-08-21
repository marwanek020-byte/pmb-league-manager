import { prisma } from "@/lib/prisma";
import { getClubUltras, UltrasGroup } from "./ultras-registry";
import { UltrasMentalityEngine } from "./ultras-mentality-engine";
import { computeStandings, StandingRow } from "./standings-service";

export interface StandingsPulseData {
  myRank: number;
  myPoints: number;
  totalClubs: number;
  played: number;
  remainingMatches: number;
  gapToLeader: number;
  gapToTop3: number;
  titleRaceStatus: "LEADER" | "CHALLENGER" | "TOP_4_RACE" | "MIDTABLE" | "RELEGATION_BATTLE";
  capoTitleAssessment: string;
  topStandings: Array<{
    position: number;
    clubName: string;
    points: number;
    played: number;
    goalDifference: number;
    form: ("W" | "D" | "L")[];
    isMyClub: boolean;
  }>;
}

export interface CapoPredictionDetail {
  fixtureMatchup: string;
  isHome: boolean;
  stadium: string;
  probabilities: {
    win: number;
    draw: number;
    loss: number;
  };
  projectedScore: string;
  confidenceMeter: number;
  tacticalAdvantage: string;
  opponentWeakness: string;
  capoVerdict: string;
}

export interface DerbyBanterItem {
  rivalClubName: string;
  rivalUltrasGroup: string;
  banterTitle: string;
  punchline: string;
  historicalContext: string;
}

export class UltrasInteractionService {
  /**
   * 1. 📊 Standings Pulse
   */
  public static async getStandingsPulse(clubId: string): Promise<StandingsPulseData> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: { league: true },
    });

    if (!club) throw new Error("Club not found");

    const ultras = getClubUltras(club.name);

    // Fetch active season matches
    const allMatches = await prisma.match.findMany({
      where: { leagueId: club.leagueId },
      select: {
        id: true,
        status: true,
        homeClubId: true,
        awayClubId: true,
        homeGoals: true,
        awayGoals: true,
        matchday: true,
        playedAt: true,
      },
    });

    const allClubs = await prisma.club.findMany({
      where: { leagueId: club.leagueId },
      select: { id: true, name: true, logo: true },
    });

    const standings = computeStandings(allMatches, allClubs);
    const myRow = standings.find((s) => s.clubId === club.id) || {
      position: 1,
      points: 0,
      played: 0,
      goalDifference: 0,
      form: ["W", "W", "D", "W", "W"] as any,
    };

    const leaderRow = standings[0] || myRow;
    const top3Row = standings[2] || myRow;
    const totalClubs = standings.length || 16;
    const totalRounds = (totalClubs - 1) * 2;
    const remainingMatches = Math.max(0, totalRounds - myRow.played);

    const gapToLeader = myRow.position === 1 ? 0 : leaderRow.points - myRow.points;
    const gapToTop3 = myRow.position <= 3 ? 0 : top3Row.points - myRow.points;

    let titleRaceStatus: StandingsPulseData["titleRaceStatus"] = "CHALLENGER";
    let capoTitleAssessment = "";

    if (myRow.position === 1) {
      titleRaceStatus = "LEADER";
      capoTitleAssessment = `👑 We lead the pack from the top! The summit belongs to ${club.name}! Keep our boots on their necks and don't drop a single point!`;
    } else if (myRow.position <= 3) {
      titleRaceStatus = "CHALLENGER";
      capoTitleAssessment = `🔥 Only ${gapToLeader} points behind the leader with ${remainingMatches} battles to play! The pressure is 100% on them. We treat every game as a cup final!`;
    } else if (myRow.position <= 6) {
      titleRaceStatus = "TOP_4_RACE";
      capoTitleAssessment = `⚔️ Continental spots are within touching distance (${gapToTop3} pts to top 3). String together 3 wins in a row and we break into the elite!`;
    } else {
      titleRaceStatus = "MIDTABLE";
      capoTitleAssessment = `⚡ The Curva demands pride! We expect the squad to climb the table and show what this badge represents!`;
    }

    return {
      myRank: myRow.position,
      myPoints: myRow.points,
      totalClubs,
      played: myRow.played,
      remainingMatches,
      gapToLeader,
      gapToTop3,
      titleRaceStatus,
      capoTitleAssessment,
      topStandings: standings.slice(0, 6).map((s) => ({
        position: s.position,
        clubName: s.clubName,
        points: s.points,
        played: s.played,
        goalDifference: s.goalDifference,
        form: s.form,
        isMyClub: s.clubId === club.id,
      })),
    };
  }

  /**
   * 2. 🔮 Capo Predictor
   */
  public static async getCapoPredictionDetail(clubId: string): Promise<CapoPredictionDetail> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        homeMatches: { where: { status: "UPCOMING" }, include: { awayClub: true } },
        awayMatches: { where: { status: "UPCOMING" }, include: { homeClub: true } },
      },
    });

    if (!club) throw new Error("Club not found");

    const nextHome = club.homeMatches[0];
    const nextAway = club.awayMatches[0];
    const nextMatch = nextHome || nextAway;

    const isHome = !!nextHome;
    const oppName = nextMatch ? (isHome ? nextHome.awayClub.name : nextAway.homeClub.name) : "Rival FC";

    const ultras = getClubUltras(club.name);

    return {
      fixtureMatchup: `${club.name} vs ${oppName}`,
      isHome,
      stadium: isHome ? `Home Ground (${club.name})` : `Away Arena (${oppName})`,
      probabilities: isHome
        ? { win: 62, draw: 22, loss: 16 }
        : { win: 48, draw: 28, loss: 24 },
      projectedScore: isHome ? "2 - 1" : "1 - 2",
      confidenceMeter: 84,
      tacticalAdvantage: "High-intensity midfield pressing and relentless crowd decibels from the Curva.",
      opponentWeakness: "Vulnerable to rapid flank transitions and set-piece headers in the second half.",
      capoVerdict: `We back the lads 100%! If we maintain physical dominance in the opening 20 minutes, the 3 points are coming home to ${club.name}!`,
    };
  }

  /**
   * 3. ⚔️ Derby Banter Pack
   */
  public static async getDerbyBanterPack(clubId: string): Promise<DerbyBanterItem[]> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { name: true },
    });

    if (!club) throw new Error("Club not found");

    const ultras = getClubUltras(club.name);
    const rivals = ultras.rivals || ["Wydad AC", "Raja Casablanca", "FAR Rabat"];

    return rivals.map((rivalName) => {
      const rivalUltras = getClubUltras(rivalName);
      return {
        rivalClubName: rivalName,
        rivalUltrasGroup: rivalUltras.officialGroupTitle || `${rivalName} Ultras`,
        banterTitle: `Derby Supremacy: ${club.name} vs ${rivalName}`,
        punchline: `Talk on social media is cheap! When you step into our territory, the noise will shake you! Remind them who rules this league! 🔥`,
        historicalContext: `Classic rivalry with decades of intense terrace battles and bragging rights.`,
      };
    });
  }
}
