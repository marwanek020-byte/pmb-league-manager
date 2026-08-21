import { prisma } from "@/lib/prisma";
import { getClubUltras, UltrasGroup } from "./ultras-registry";
import { UltrasMentalityEngine } from "./ultras-mentality-engine";

export type PostMatchOutcome = "VICTORY" | "DRAW" | "DEFEAT";

export interface PostMatchExperience {
  hasCompletedMatch: boolean;
  outcome: PostMatchOutcome;
  headline: string;
  theme: {
    badge: string;
    badgeColor: string;
    title: string;
    subtitle: string;
    accentColor: string;
  };
  matchSummary: {
    matchId: string;
    homeClubName: string;
    awayClubName: string;
    homeGoals: number;
    awayGoals: number;
    isHome: boolean;
    myClubScore: number;
    oppClubScore: number;
    matchday: number;
    playedAt: string;
    scorers: Array<{ player: string; minute?: number; clubName: string }>;
  };
  manOfTheMatch?: {
    name: string;
    position: string;
    rating: number;
    tribute: string;
  };
  tableImpact: {
    pointsAwarded: number;
    tableMovement: string;
    verdict: string;
  };
  capoStatement: string;
  curvaActionCall: string;
  formattedMarkdownCommuniqué: string;
}

export class UltrasPostMatchService {
  /**
   * Generates the authentic Post-Match Experience (Craquage vs Crisis Meeting)
   */
  public static async generatePostMatchExperience(clubId: string): Promise<PostMatchExperience> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        league: true,
        manager: { select: { username: true } },
      },
    });

    if (!club) {
      throw new Error("Club not found");
    }

    const myUltras = getClubUltras(club.name);
    const persona = UltrasMentalityEngine.resolveCapoPersona(club.name, myUltras.preferredLanguage, myUltras);

    // 1. Fetch latest completed match
    const lastMatch = await prisma.match.findFirst({
      where: {
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
        status: "COMPLETED",
      },
      orderBy: { playedAt: "desc" },
      include: {
        homeClub: true,
        awayClub: true,
        manOfTheMatch: true,
        events: {
          where: { type: "GOAL" },
          include: { player: true, club: true },
          orderBy: { minute: "asc" },
        },
      },
    });

    if (!lastMatch) {
      return {
        hasCompletedMatch: false,
        outcome: "DRAW",
        headline: "No Completed Matches Yet",
        theme: {
          badge: "⏳ PRE-SEASON",
          badgeColor: "text-gray-400 bg-gray-500/20 border-gray-500/40",
          title: "Awaiting Season Kickoff",
          subtitle: "No official matches recorded for the active campaign.",
          accentColor: "from-zinc-900 to-black",
        },
        matchSummary: {
          matchId: "",
          homeClubName: club.name,
          awayClubName: "TBD",
          homeGoals: 0,
          awayGoals: 0,
          isHome: true,
          myClubScore: 0,
          oppClubScore: 0,
          matchday: 0,
          playedAt: new Date().toISOString(),
          scorers: [],
        },
        tableImpact: { pointsAwarded: 0, tableMovement: "Neutral", verdict: "Season not underway." },
        capoStatement: "The Curva is resting and preparing choreographies for the opening day!",
        curvaActionCall: "Ensure the squad is ready physically and mentally!",
        formattedMarkdownCommuniqué: "No completed matches on record.",
      };
    }

    const isHome = lastMatch.homeClubId === club.id;
    const myScore = isHome ? (lastMatch.homeGoals ?? 0) : (lastMatch.awayGoals ?? 0);
    const oppScore = isHome ? (lastMatch.awayGoals ?? 0) : (lastMatch.homeGoals ?? 0);
    const oppClub = isHome ? lastMatch.awayClub : lastMatch.homeClub;

    let outcome: PostMatchOutcome = "DRAW";
    if (myScore > oppScore) outcome = "VICTORY";
    else if (myScore < oppScore) outcome = "DEFEAT";

    // 2. Extract scorers
    const scorers = lastMatch.events.map((e) => ({
      player: e.player?.fullName || "Player",
      minute: e.minute ?? undefined,
      clubName: e.club?.name || "",
    }));

    // 3. Configure themes and Capo statements based on outcome
    let headline = "";
    let themeBadge = "";
    let themeColor = "";
    let themeTitle = "";
    let themeSubtitle = "";
    let accentColor = "";
    let tableMovement = "";
    let tableVerdict = "";
    let pointsAwarded = 0;
    let capoStatement = "";
    let curvaActionCall = "";

    const chant = myUltras.chants[0] || "";

    if (outcome === "VICTORY") {
      pointsAwarded = 3;
      headline = `🏆 FULL-TIME: VICTORY & CRAQUAGE TOTAL (${myScore}-${oppScore})!`;
      themeBadge = "🔥 VICTORY · CRAQUAGE TOTAL";
      themeColor = "text-emerald-400 bg-emerald-500/20 border-emerald-500/40";
      themeTitle = "🎆 Pyro Smoke & Euphoria in the Curva!";
      themeSubtitle = `A heroic ${myScore}-${oppScore} triumph against ${oppClub.name}! The terrace is rocking!`;
      accentColor = "from-emerald-950/40 via-zinc-950/90 to-black";
      tableMovement = "+3 Points Secured 📈";
      tableVerdict = "Massive step forward in the title race! Momentum is surging through the squad!";

      if (persona.id === "THE_HAMMER_EN") {
        capoStatement = `What a proper shift from the lads today! We completely out-battled ${oppClub.name} all over the pitch! The away end was in full voice from the first minute to the last! Claret and blue flying high! ⚒️🫧`;
        curvaActionCall = "Celebrate tonight, but stay hungry for the next clash! Keep this graft going!";
      } else if (persona.id === "LE_VIRAGE_FR") {
        capoStatement = `DÉLIRE ET CRAQUAGE TOTAL DANS LE VIRAGE ! ${chant} Les joueurs se sont battus comme des guerriers pour nos couleurs sacrées ! Paris est fier de vous ! 🔵🔴`;
        curvaActionCall = "Fête méritée ce soir, puis concentration maximale pour enchaîner !";
      } else {
        // Moroccan Darija (EL_CAPO_AR)
        capoStatement = `كرااااكاج خيالي فالمدرج وفرحة مستحقة للرجال! ${chant}\nهادي هي الروح والقتالية اللي كتمثل هيبة ${club.name}! 3 نقاط من ذهب والعز للفرقة وللكوتش! 💚🖤🔥`;
        curvaActionCall = "نحتفلو الليلة وغدا نرجعو نخدمو.. مكملين فطريق اللقب بلا تراخي!";
      }
    } else if (outcome === "DRAW") {
      pointsAwarded = 1;
      headline = `⚖️ FULL-TIME: POINTS SHARED (${myScore}-${oppScore}) · TACTICAL DEBRIEF`;
      themeBadge = "⚖️ DRAW · FRUSTRATION & MISSED CHANCES";
      themeColor = "text-amber-400 bg-amber-500/20 border-amber-500/40";
      themeTitle = "Tactical Review: 2 Points Left on the Table";
      themeSubtitle = `Stalemate against ${oppClub.name}. Fighting spirit present, but lacked clinical edge.`;
      accentColor = "from-amber-950/40 via-zinc-950/90 to-black";
      tableMovement = "+1 Point Added 📊";
      tableVerdict = "Keeps us ticking over, but championship contenders must kill off these games!";

      if (persona.id === "THE_HAMMER_EN") {
        capoStatement = `Fair graft from the boys, but we dropped two points today. We had the chances to put ${oppClub.name} to the sword and didn't take them. Must be sharper in the final third!`;
        curvaActionCall = "Turn that frustration into fuel for the next matchday under the lights!";
      } else if (persona.id === "LE_VIRAGE_FR") {
        capoStatement = `Un match nul frustrant. La ferveur était au rendez-vous dans le virage, mais il a manqué ce geste décisif pour arracher la victoire. Pas de place au doute, on avance !`;
        curvaActionCall = "Rectifier les erreurs et aller chercher les 3 points dès le week-end prochain !";
      } else {
        capoStatement = `نقطة أحسن من والو ولكن كنا نستحقو ما حسن! الفرقة تقاتلات ولكن ضيعنا فرص سهلة قدام المرمى.. الماتش الجاي ما كاين غير الفوز!`;
        curvaActionCall = "نراجعو الأخطاء الهجومية والتركيز من دابا على المقابلة القادمة فبلادنا!";
      }
    } else {
      // DEFEAT
      pointsAwarded = 0;
      headline = `🚨 FULL-TIME: CRISIS MEETING IN THE CURVA (${myScore}-${oppScore})`;
      themeBadge = "😡 DEFEAT · CRISIS MEETING & ULTIMATUM";
      themeColor = "text-rose-400 bg-rose-500/20 border-rose-500/40";
      themeTitle = "🚨 Curva Demands Immediate Answers!";
      themeSubtitle = `Unacceptable ${myScore}-${oppScore} defeat to ${oppClub.name}. Lack of intensity and complacency in the shirt!`;
      accentColor = "from-rose-950/40 via-zinc-950/90 to-black";
      tableMovement = "0 Points Gained 📉";
      tableVerdict = "Damaging blow to the table. Immediate reaction required to preserve season ambitions.";

      if (persona.id === "THE_HAMMER_EN") {
        capoStatement = `That was nowhere near good enough. If you put on the ${club.name} shirt, you put in a proper shift for 90 minutes. Jogging and sloppy defending won't be tolerated in this club! We want answers, gaffer! 😡`;
        curvaActionCall = "Look the fans in the eye, sort out the tactics, and bounce back immediately!";
      } else if (persona.id === "LE_VIRAGE_FR") {
        capoStatement = `COLÈRE TOTALE DANS LA TRIBUNE ! Ce maillot a une histoire et une âme, on ne peut pas accepter une telle passivité face à ${oppClub.name} ! Une réaction d'hommes est exigée sur-le-champ !`;
        curvaActionCall = "Zéro excuse ! Mouillez le maillot ou laissez votre place !";
      } else {
        capoStatement = `هاد الهزيمة غير مقبولة نهائياً وفضيحة فحق الكورفا! قميص ${club.name} غالي وفيه هيبة أجيال.. مايمكنش نشوفو برود واستهتار فالتيران! خاص ردة فعل رجولية وفورية فالماتش الجاي! ⚠️`;
        curvaActionCall = "المدرب واللاعبين خاصهم يتحملو المسؤولية ويعرفو قيمة التوني اللي لابسين!";
      }
    }

    // 4. Man of the match tribute
    const motm = lastMatch.manOfTheMatch;
    const manOfTheMatch = motm
      ? {
          name: motm.fullName,
          position: (motm.position || "FW").toUpperCase(),
          rating: motm.overallRating || 82,
          tribute:
            outcome === "VICTORY"
              ? "Warrior performance! Commanded the pitch and carried the club to glory!"
              : "Fought hard despite the tough circumstances. Showed true grit for the badge.",
        }
      : undefined;

    // 5. Formatted Markdown Communiqué
    const formattedMarkdownCommuniqué = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${headline}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏟️ MATCHDAY ${lastMatch.matchday} DEBRIEF: ${lastMatch.homeClub.name} ${lastMatch.homeGoals ?? 0} - ${lastMatch.awayGoals ?? 0} ${lastMatch.awayClub.name}
📊 OUTCOME: ${themeBadge} (${pointsAwarded} pts)
📈 TABLE IMPACT: ${tableMovement} — ${tableVerdict}
${scorers.length > 0 ? `⚽ SCORERS: ${scorers.map((s) => `${s.player} ${s.minute ? `(${s.minute}')` : ""}`).join(", ")}` : "⚽ SCORERS: None"}

📢 CURVA CAPO COMMUNIQUÉ:
"${capoStatement}"

${manOfTheMatch ? `⭐ MAN OF THE MATCH: ${manOfTheMatch.name} (${manOfTheMatch.position} • ${manOfTheMatch.rating} OVR)\n"${manOfTheMatch.tribute}"\n` : ""}
⚔️ DIRECTIVE FROM THE VIRAGE:
"${curvaActionCall}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return {
      hasCompletedMatch: true,
      outcome,
      headline,
      theme: {
        badge: themeBadge,
        badgeColor: themeColor,
        title: themeTitle,
        subtitle: themeSubtitle,
        accentColor,
      },
      matchSummary: {
        matchId: lastMatch.id,
        homeClubName: lastMatch.homeClub.name,
        awayClubName: lastMatch.awayClub.name,
        homeGoals: lastMatch.homeGoals ?? 0,
        awayGoals: lastMatch.awayGoals ?? 0,
        isHome,
        myClubScore: myScore,
        oppClubScore: oppScore,
        matchday: lastMatch.matchday,
        playedAt: lastMatch.playedAt?.toISOString() || new Date().toISOString(),
        scorers,
      },
      manOfTheMatch,
      tableImpact: {
        pointsAwarded,
        tableMovement,
        verdict: tableVerdict,
      },
      capoStatement,
      curvaActionCall,
      formattedMarkdownCommuniqué,
    };
  }
}
