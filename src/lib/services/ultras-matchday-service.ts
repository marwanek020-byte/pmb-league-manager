import { prisma } from "@/lib/prisma";
import { getClubUltras, findMentionedClubsInText, UltrasGroup } from "./ultras-registry";
import { UltrasMentalityEngine, CapoPersona } from "./ultras-mentality-engine";
import { computeStandings } from "./standings-service";

export interface MatchdayBriefing {
  hasUpcomingMatch: boolean;
  editionTitle: string;
  isDerby: boolean;
  fixture: {
    matchId: string;
    homeClubId: string;
    awayClubId: string;
    homeClubName: string;
    awayClubName: string;
    isHome: boolean;
    stadiumName: string;
    kickoffTime: string;
    capacity: string;
    matchday: number;
    competitionName: string;
  };
  tableStakes: {
    myRank: number;
    myPoints: number;
    oppRank: number;
    oppPoints: number;
    stakesLabel: string;
  };
  form: {
    myClubForm: Array<"W" | "D" | "L">;
    oppClubForm: Array<"W" | "D" | "L">;
  };
  capoCallToArms: string;
  manToWatch: {
    name: string;
    position: string;
    overallRating: number;
    detail: string;
  };
  keyThreat: {
    name: string;
    position: string;
    overallRating: number;
    detail: string;
  };
  capoPrediction: {
    predictedScore: string;
    confidence: number;
    verdict: string;
  };
  h2hRecord: {
    totalMeetings: number;
    myWins: number;
    draws: number;
    oppWins: number;
    lastScore?: string;
  };
  formattedMarkdownBriefing: string;
}

const KNOWN_STADIUMS: Record<string, { stadium: string; capacity: string }> = {
  "far rabat": { stadium: "Stade Moulay Abdellah (Rabat)", capacity: "53,000 (SOLD OUT)" },
  "raja casablanca": { stadium: "Stade Mohammed V (Casablanca)", capacity: "45,891 (SOLD OUT)" },
  "wydad ac": { stadium: "Stade Mohammed V (Casablanca)", capacity: "45,891 (SOLD OUT)" },
  "maghreb de fes": { stadium: "Complexe Sportif de Fès", capacity: "45,000" },
  "mas fes": { stadium: "Complexe Sportif de Fès", capacity: "45,000" },
  "ittihad tanger": { stadium: "Grand Stade de Tanger (Ibn Batouta)", capacity: "65,000 (SOLD OUT)" },
  "rs berkane": { stadium: "Stade Municipal de Berkane", capacity: "15,000" },
  "hassania agadir": { stadium: "Grand Stade d'Agadir (Adrar)", capacity: "45,480" },
  "fus rabat": { stadium: "Stade Prince Moulay El Hassan", capacity: "12,000" },
  "moghreb tetouan": { stadium: "Stade Saniat Rmel", capacity: "15,000" },
  "olympic safi": { stadium: "Stade El Massira", capacity: "15,000" },
  "west ham united": { stadium: "London Stadium (Queen Elizabeth Olympic Park)", capacity: "62,500 (SOLD OUT)" },
  "west ham": { stadium: "London Stadium (London)", capacity: "62,500 (SOLD OUT)" },
  "arsenal": { stadium: "Emirates Stadium (London)", capacity: "60,704 (SOLD OUT)" },
  "chelsea": { stadium: "Stamford Bridge (London)", capacity: "40,341 (SOLD OUT)" },
  "liverpool": { stadium: "Anfield (Liverpool)", capacity: "61,276 (SOLD OUT)" },
  "manchester united": { stadium: "Old Trafford (Manchester)", capacity: "74,310 (SOLD OUT)" },
  "manchester city": { stadium: "Etihad Stadium (Manchester)", capacity: "53,400 (SOLD OUT)" },
  "real madrid": { stadium: "Estadio Santiago Bernabéu (Madrid)", capacity: "84,000 (SOLD OUT)" },
  "barcelona": { stadium: "Spotify Camp Nou / Montjuïc (Barcelona)", capacity: "54,367 (SOLD OUT)" },
  "paris saint-germain": { stadium: "Parc des Princes (Paris)", capacity: "48,583 (SOLD OUT)" },
  "bayern munich": { stadium: "Allianz Arena (München)", capacity: "75,024 (SOLD OUT)" },
};

export class UltrasMatchdayService {
  /**
   * Generates the comprehensive Matchday Briefing for any PMB club.
   */
  public static async generateMatchdayBriefing(clubId: string): Promise<MatchdayBriefing> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        league: true,
        manager: { select: { username: true } },
        players: { where: { status: "REGISTERED" }, orderBy: { overallRating: "desc" } },
      },
    });

    if (!club) {
      throw new Error("Club not found");
    }

    const myUltras = getClubUltras(club.name);
    const persona = UltrasMentalityEngine.resolveCapoPersona(club.name, myUltras.preferredLanguage, myUltras);

    // 1. Fetch next upcoming match
    const upcomingMatch = await prisma.match.findFirst({
      where: {
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
        status: "UPCOMING",
      },
      orderBy: { matchday: "asc" },
      include: {
        homeClub: {
          include: {
            players: { where: { status: "REGISTERED" }, orderBy: { overallRating: "desc" } },
          },
        },
        awayClub: {
          include: {
            players: { where: { status: "REGISTERED" }, orderBy: { overallRating: "desc" } },
          },
        },
        season: { include: { competitionSeason: true } },
        league: true,
      },
    });

    if (!upcomingMatch) {
      return {
        hasUpcomingMatch: false,
        editionTitle: "⏳ PMB MATCHDAY BRIEFING | PRE-SEASON / RECESS",
        isDerby: false,
        fixture: {
          matchId: "",
          homeClubId: club.id,
          awayClubId: "",
          homeClubName: club.name,
          awayClubName: "TBD",
          isHome: true,
          stadiumName: this.resolveStadium(club.name).stadium,
          kickoffTime: "TBD",
          capacity: this.resolveStadium(club.name).capacity,
          matchday: 0,
          competitionName: club.league?.name || "PMB Championship",
        },
        tableStakes: { myRank: 1, myPoints: 0, oppRank: 2, oppPoints: 0, stakesLabel: "No active fixture scheduled." },
        form: { myClubForm: ["W", "W", "D", "W", "W"], oppClubForm: ["W", "L", "W", "D", "W"] },
        capoCallToArms: "No upcoming battle scheduled on the calendar. Keep the training intensity high!",
        manToWatch: { name: club.players[0]?.fullName || "Captain", position: club.players[0]?.position || "CF", overallRating: club.players[0]?.overallRating || 80, detail: "Squad anchor in training" },
        keyThreat: { name: "Opponent Star", position: "FW", overallRating: 80, detail: "Awaiting next draw" },
        capoPrediction: { predictedScore: "1-0", confidence: 75, verdict: "Always backing our colors!" },
        h2hRecord: { totalMeetings: 0, myWins: 0, draws: 0, oppWins: 0 },
        formattedMarkdownBriefing: "No active matchday briefing available.",
      };
    }

    const isHome = upcomingMatch.homeClubId === club.id;
    const oppClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
    const oppUltras = getClubUltras(oppClub.name);

    // 2. Determine Derby / Clash type
    const isDerby = myUltras.rivals?.includes(oppClub.name.toLowerCase()) || oppUltras.rivals?.includes(club.name.toLowerCase()) || false;
    let editionTitle = "🔥 PMB MATCHDAY BRIEFING | MATCHDAY CLASH ⚽";
    if (isDerby) editionTitle = "🔥 PMB MATCHDAY BRIEFING | DERBY EDITION ⚔️";
    else if (upcomingMatch.league?.country !== "Morocco" || /west ham|arsenal|chelsea|real madrid|psg/i.test(oppClub.name)) {
      editionTitle = "🔥 PMB MATCHDAY BRIEFING | CONTINENTAL CLASH ✈️";
    }

    // 3. Compute Form from past 5 completed matches
    const [myRecentMatches, oppRecentMatches] = await Promise.all([
      prisma.match.findMany({
        where: {
          OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
          status: "COMPLETED",
        },
        orderBy: { playedAt: "desc" },
        take: 5,
      }),
      prisma.match.findMany({
        where: {
          OR: [{ homeClubId: oppClub.id }, { awayClubId: oppClub.id }],
          status: "COMPLETED",
        },
        orderBy: { playedAt: "desc" },
        take: 5,
      }),
    ]);

    const calculateForm = (matches: typeof myRecentMatches, targetClubId: string): Array<"W" | "D" | "L"> => {
      if (matches.length === 0) return ["W", "W", "D", "W", "W"];
      return matches.map((m) => {
        const home = m.homeClubId === targetClubId;
        const myG = home ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
        const oppG = home ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
        if (myG > oppG) return "W";
        if (myG < oppG) return "L";
        return "D";
      });
    };

    const myClubForm = calculateForm(myRecentMatches, club.id);
    const oppClubForm = calculateForm(oppRecentMatches, oppClub.id);

    // 4. Standings and Table Stakes
    let myRank = 1;
    let myPoints = 24;
    let oppRank = 2;
    let oppPoints = 21;

    try {
      const allLeagueMatches = await prisma.match.findMany({
        where: { leagueId: club.leagueId },
        select: { id: true, status: true, homeClubId: true, awayClubId: true, homeGoals: true, awayGoals: true, matchday: true, playedAt: true },
      });
      const allLeagueClubs = await prisma.club.findMany({
        where: { leagueId: club.leagueId },
        select: { id: true, name: true, logo: true },
      });
      const standings = computeStandings(allLeagueMatches, allLeagueClubs);
      const myRow = standings.find((s: any) => s.clubId === club.id);
      const oppRow = standings.find((s: any) => s.clubId === oppClub.id);
      if (myRow) {
        myRank = myRow.position;
        myPoints = myRow.points;
      }
      if (oppRow) {
        oppRank = oppRow.position;
        oppPoints = oppRow.points;
      }
    } catch {
      // Keep defaults
    }

    let stakesLabel = `${myRank}${this.getOrdinal(myRank)} (${myPoints} pts) vs ${oppRank}${this.getOrdinal(oppRank)} (${oppPoints} pts)`;
    if (Math.abs(myRank - oppRank) <= 2 && (myRank <= 3 || oppRank <= 3)) {
      stakesLabel += " — Title 6-Pointer! 🏆";
    } else if (isDerby) {
      stakesLabel += " — City Pride & Honor at Stake! ⚔️";
    }

    // 5. Star Players & Matchups
    const myBestPlayer = club.players[0] || { fullName: "Team Captain", position: "CF", overallRating: 81 };
    const oppBestPlayer = oppClub.players[0] || { fullName: "Opponent Star", position: "CF", overallRating: 80 };

    const manToWatch = {
      name: myBestPlayer.fullName,
      position: (myBestPlayer.position || "CF").toUpperCase(),
      overallRating: myBestPlayer.overallRating || 81,
      detail: `Primary focal point in attack (${myBestPlayer.overallRating || 81} OVR)`,
    };

    const keyThreat = {
      name: oppBestPlayer.fullName,
      position: (oppBestPlayer.position || "CF").toUpperCase(),
      overallRating: oppBestPlayer.overallRating || 80,
      detail: `Dangerous finisher with high speed (${oppBestPlayer.overallRating || 80} OVR)`,
    };

    // 6. Head-to-Head Record
    const pastH2H = await prisma.match.findMany({
      where: {
        OR: [
          { homeClubId: club.id, awayClubId: oppClub.id },
          { homeClubId: oppClub.id, awayClubId: club.id },
        ],
        status: "COMPLETED",
      },
      orderBy: { playedAt: "desc" },
    });

    let myWins = 0;
    let draws = 0;
    let oppWins = 0;
    let lastScore = "";

    pastH2H.forEach((m, idx) => {
      const isHomeM = m.homeClubId === club.id;
      const myG = isHomeM ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
      const oppG = isHomeM ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
      if (myG > oppG) myWins++;
      else if (myG < oppG) oppWins++;
      else draws++;
      if (idx === 0) {
        lastScore = `${club.name} ${myG} - ${oppG} ${oppClub.name}`;
      }
    });

    // 7. Capo Call to Arms & Capo Prediction
    const stadiumInfo = this.resolveStadium(isHome ? club.name : oppClub.name);
    const capoCallToArms = this.generateCapoCallToArms(club.name, oppClub.name, isDerby, isHome, myUltras, persona);
    const capoPrediction = this.generateCapoPrediction(club.name, oppClub.name, isHome, isDerby, myRank, oppRank);

    // Format Structured Text
    const formattedMarkdownBriefing = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${editionTitle}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏟️ FIXTURE: ${upcomingMatch.homeClub.name} vs ${upcomingMatch.awayClub.name} (${stadiumInfo.stadium})
⏰ KICKOFF: 20:00 GMT · Matchday ${upcomingMatch.matchday} · Capacity: ${stadiumInfo.capacity}
📊 TABLE STAKES: ${stakesLabel}
📈 FORM: ${club.name} [${myClubForm.join("-")}] vs ${oppClub.name} [${oppClubForm.join("-")}]

📢 CAPO CALL TO ARMS:
"${capoCallToArms}"

⭐ MAN TO WATCH: ${manToWatch.name} (${manToWatch.position} • ${manToWatch.overallRating} OVR)
⚠️ KEY THREAT: ${keyThreat.name} (${keyThreat.position} • ${keyThreat.overallRating} OVR)
🔮 CAPO PREDICTION: ${capoPrediction.predictedScore} (${capoPrediction.verdict})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return {
      hasUpcomingMatch: true,
      editionTitle,
      isDerby,
      fixture: {
        matchId: upcomingMatch.id,
        homeClubId: upcomingMatch.homeClubId,
        awayClubId: upcomingMatch.awayClubId,
        homeClubName: upcomingMatch.homeClub.name,
        awayClubName: upcomingMatch.awayClub.name,
        isHome,
        stadiumName: stadiumInfo.stadium,
        kickoffTime: "20:00 GMT",
        capacity: stadiumInfo.capacity,
        matchday: upcomingMatch.matchday,
        competitionName: upcomingMatch.season?.competitionSeason?.name || upcomingMatch.league?.name || "PMB League",
      },
      tableStakes: {
        myRank,
        myPoints,
        oppRank,
        oppPoints,
        stakesLabel,
      },
      form: {
        myClubForm,
        oppClubForm,
      },
      capoCallToArms,
      manToWatch,
      keyThreat,
      capoPrediction,
      h2hRecord: {
        totalMeetings: pastH2H.length,
        myWins,
        draws,
        oppWins,
        lastScore,
      },
      formattedMarkdownBriefing,
    };
  }

  private static resolveStadium(clubName: string): { stadium: string; capacity: string } {
    const clean = (clubName || "").toLowerCase().trim();
    for (const [k, v] of Object.entries(KNOWN_STADIUMS)) {
      if (clean.includes(k) || k.includes(clean)) return v;
    }
    return { stadium: `Stade Municipal (${clubName})`, capacity: "35,000" };
  }

  private static getOrdinal(n: number): string {
    if (n === 1) return "st";
    if (n === 2) return "nd";
    if (n === 3) return "rd";
    return "th";
  }

  private static generateCapoCallToArms(
    myClub: string,
    oppClub: string,
    isDerby: boolean,
    isHome: boolean,
    ultras: UltrasGroup,
    persona: CapoPersona
  ): string {
    const chant = ultras.chants[0] || "";

    if (persona.id === "THE_HAMMER_EN") {
      return isDerby
        ? `Tonight is about East London supremacy and pride! The terrace is roaring and the bubbles are ready to fly! 90 minutes of pure graft against ${oppClub}!`
        : `Under the floodlights tonight, we expect a relentless shift from every single lad wearing the badge! Let's get right into ${oppClub} from minute 1!`;
    }

    if (persona.id === "LE_VIRAGE_FR") {
      return isDerby
        ? `Ce soir, c'est l'honneur de la ville qui est en jeu face à ${oppClub} ! Le virage prépare un craquage monumental. Donnez votre vie sur la pelouse !`
        : `Toute la tribune est mobilisée ce soir ! Portez haut nos couleurs et combattez pour le club jusqu'au bout !`;
    }

    // Moroccan Darija (EL_CAPO_AR)
    if (isDerby) {
      return `الليلة مسألة شرف وكبرياء مدينة كاملة! الكورفا واجدة بتيفو تاريخي و2000 فلام مشتعلة.. دخلو كولو التيران وما تفرطوش فـ 3 نقاط ضد ${oppClub}!`;
    }

    return `${chant}\nالمدرج غايكون جحيم الليلة والرجال وراكم من الدقيقة الأولى! هاد الماتش مفتاح البطولة، القتالية حتى لآخر قطرة عرق!`;
  }

  private static generateCapoPrediction(
    myClub: string,
    oppClub: string,
    isHome: boolean,
    isDerby: boolean,
    myRank: number,
    oppRank: number
  ): { predictedScore: string; confidence: number; verdict: string } {
    if (isHome) {
      if (myRank <= oppRank) {
        return {
          predictedScore: "2-1",
          confidence: 88,
          verdict: "Hard-fought victory with a late winner under the roar of the Curva!",
        };
      }
      return {
        predictedScore: "2-0",
        confidence: 82,
        verdict: "Dominant home tactical display with relentless pressing!",
      };
    }

    if (isDerby) {
      return {
        predictedScore: "1-2",
        confidence: 79,
        verdict: "Historic away victory snatched in the dying minutes!",
      };
    }

    return {
      predictedScore: "1-2",
      confidence: 80,
      verdict: "Solid away performance to bring back 3 precious points!",
    };
  }
}
