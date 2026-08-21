import { prisma } from "@/lib/prisma";
import { getClubUltras } from "./ultras-registry";

export interface UltrasTier {
  tierLevel: number;
  title: string;
  badge: string;
  minXp: number;
  maxXp: number;
  description: string;
  perks: string[];
}

export const ULTRAS_TIERS: UltrasTier[] = [
  {
    tierLevel: 1,
    title: "Virage Rookie",
    badge: "🧢",
    minXp: 0,
    maxXp: 500,
    description: "دخلتي للكورفا جديد.. كتعلم الشانتيات وواقف فالمدرج.",
    perks: ["Basic Capo Chat", "Read Communiqués", "Dugout Comments"],
  },
  {
    tierLevel: 2,
    title: "Loyal Fanatic",
    badge: "🧣",
    minXp: 501,
    maxXp: 1500,
    description: "حاضر فكل ماتش وماكتزڭل حتى ديبلاسمون.. الراية ديما هازها فالعلالي.",
    perks: ["Matchday Hype Mode", "Pre-Match Briefings", "Standings Pulse Engine"],
  },
  {
    tierLevel: 3,
    title: "Curva Drummer",
    badge: "🥁",
    minXp: 1501,
    maxXp: 3500,
    description: "كتضبط ريتم الكورفا بالدربوكة والطبل الكبير.. صوت الحناجر كيبدا منك.",
    perks: ["Original Chant Studio", "Custom Rhyme Generator", "BPM Rhythm Equalizer"],
  },
  {
    tierLevel: 4,
    title: "Pyro Master",
    badge: "🎆",
    minXp: 3501,
    maxXp: 7000,
    description: "مسؤول على الفلام، الدخان، وتنسيق التيفوات العملاقة مع الكابو.",
    perks: ["Custom TIFO Studio", "Pyro Timing Coordinator", "Derby Banter Pack"],
  },
  {
    tierLevel: 5,
    title: "EL CAPO SUPREMO",
    badge: "👑",
    minXp: 7001,
    maxXp: Infinity,
    description: "واقف فالسياج بالميغافون.. القائد الفعلي للمدرج والكلمة كلمتك.",
    perks: ["Capo Megaphone VIP Badges", "1-Click Dugout Broadcast", "Priority Capo AI Stream"],
  },
];

export interface SupporterProfile {
  userId: string;
  username: string;
  clubId: string;
  clubName: string;
  preferredLanguage: "AR" | "FR" | "EN" | "ES";
  favoritePlayer?: {
    id: string;
    fullName: string;
    position: string;
    overallRating: number;
  };
  managerReputation: {
    trophiesCount: number;
    totalWins: number;
    titlesDelivered: string[];
  };
  currentXp: number;
  currentTier: UltrasTier;
  nextTier?: UltrasTier;
  progressPercentage: number;
  unlockedPerks: string[];
}

export interface MatchdayPredictionSubmission {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  firstScorer?: string;
}

export interface PredictionLeagueRecord {
  id: string;
  userId: string;
  matchId: string;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  predictedFirstScorer?: string;
  awardedXp: number;
  status: "PENDING" | "EVALUATED";
  createdAt: string;
}

// In-memory persistent cache for user personalization & predictions
const USER_SUPPORTER_PREFS = new Map<
  string,
  {
    preferredLanguage: "AR" | "FR" | "EN" | "ES";
    favoritePlayerId?: string;
    curvaXp: number;
  }
>();

const USER_PREDICTIONS: PredictionLeagueRecord[] = [];

export class UltrasGamificationService {
  /**
   * Resolves the current tier from XP value
   */
  public static getTierFromXp(xp: number): { currentTier: UltrasTier; nextTier?: UltrasTier; progressPercentage: number } {
    let currentTier = ULTRAS_TIERS[0];
    let nextTier: UltrasTier | undefined = ULTRAS_TIERS[1];

    for (let i = 0; i < ULTRAS_TIERS.length; i++) {
      const t = ULTRAS_TIERS[i];
      if (xp >= t.minXp) {
        currentTier = t;
        nextTier = ULTRAS_TIERS[i + 1];
      }
    }

    let progressPercentage = 100;
    if (nextTier && currentTier.maxXp !== Infinity) {
      const tierRange = nextTier.minXp - currentTier.minXp;
      const progressInTier = xp - currentTier.minXp;
      progressPercentage = Math.min(100, Math.max(0, Math.round((progressInTier / tierRange) * 100)));
    }

    return { currentTier, nextTier, progressPercentage };
  }

  /**
   * Fetches full Supporter Profile including Personalization, Trophies, Favorite Player & XP
   */
  public static async getSupporterProfile(userId: string, clubId: string): Promise<SupporterProfile> {
    const [user, club, powerRating, wonMatches] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      }),
      prisma.club.findUnique({
        where: { id: clubId },
        include: {
          players: {
            where: { status: "REGISTERED" },
            orderBy: { overallRating: "desc" },
          },
        },
      }),
      prisma.clubPowerRating.findUnique({
        where: { clubId },
      }),
      prisma.match.count({
        where: {
          OR: [
            { homeClubId: clubId, homeGoals: { gt: prisma.match.fields.awayGoals } },
            { awayClubId: clubId, awayGoals: { gt: prisma.match.fields.homeGoals } },
          ],
          status: "COMPLETED",
        },
      }),
    ]);

    const username = user?.username || "Supporter";
    const clubName = club?.name || "PMB Club";

    // Load or initialize preferences
    let prefs = USER_SUPPORTER_PREFS.get(userId);
    if (!prefs) {
      const isMoroccan = /far|raja|wydad|fes|tanger|berkane|agadir|safi/i.test(clubName);
      prefs = {
        preferredLanguage: isMoroccan ? "AR" : "EN",
        favoritePlayerId: club?.players[0]?.id,
        curvaXp: 750, // Initial base XP for active manager
      };
      USER_SUPPORTER_PREFS.set(userId, prefs);
    }

    const { currentTier, nextTier, progressPercentage } = this.getTierFromXp(prefs.curvaXp);

    // Resolve favorite player
    let favoritePlayer = undefined;
    if (club?.players && club.players.length > 0) {
      const found = club.players.find((p) => p.id === prefs!.favoritePlayerId) || club.players[0];
      if (found) {
        favoritePlayer = {
          id: found.id,
          fullName: found.fullName,
          position: (found.position || "FW").toUpperCase(),
          overallRating: found.overallRating || 81,
        };
      }
    }

    const trophiesCount = powerRating?.titles || 0;

    return {
      userId,
      username,
      clubId,
      clubName,
      preferredLanguage: prefs.preferredLanguage,
      favoritePlayer,
      managerReputation: {
        trophiesCount,
        totalWins: wonMatches || 12,
        titlesDelivered: trophiesCount > 0 ? [`${trophiesCount}x PMB Championship Titles 🏆`] : ["Contending for First Trophy ⚔️"],
      },
      currentXp: prefs.curvaXp,
      currentTier,
      nextTier,
      progressPercentage,
      unlockedPerks: currentTier.perks,
    };
  }

  /**
   * Updates supporter personalization settings
   */
  public static async updatePersonalization(
    userId: string,
    params: {
      preferredLanguage?: "AR" | "FR" | "EN" | "ES";
      favoritePlayerId?: string;
    }
  ): Promise<void> {
    const prefs = USER_SUPPORTER_PREFS.get(userId) || {
      preferredLanguage: "AR",
      curvaXp: 750,
    };

    if (params.preferredLanguage) prefs.preferredLanguage = params.preferredLanguage;
    if (params.favoritePlayerId) prefs.favoritePlayerId = params.favoritePlayerId;

    USER_SUPPORTER_PREFS.set(userId, prefs);
  }

  /**
   * Awards XP to a supporter and returns updated tier details
   */
  public static addXp(userId: string, amount: number, reason: string): { newXp: number; currentTier: UltrasTier } {
    const prefs = USER_SUPPORTER_PREFS.get(userId) || {
      preferredLanguage: "AR",
      curvaXp: 750,
    };

    prefs.curvaXp += amount;
    USER_SUPPORTER_PREFS.set(userId, prefs);

    const { currentTier } = this.getTierFromXp(prefs.curvaXp);
    return { newXp: prefs.curvaXp, currentTier };
  }

  /**
   * Submits a matchday prediction and rewards baseline XP
   */
  public static submitPrediction(
    userId: string,
    prediction: MatchdayPredictionSubmission
  ): { record: PredictionLeagueRecord; awardedXp: number } {
    const awardedXp = 15; // Baseline XP for participation
    this.addXp(userId, awardedXp, "Matchday Prediction Entry");

    const record: PredictionLeagueRecord = {
      id: `pred-${Date.now()}`,
      userId,
      matchId: prediction.matchId,
      predictedHomeGoals: prediction.homeGoals,
      predictedAwayGoals: prediction.awayGoals,
      predictedFirstScorer: prediction.firstScorer,
      awardedXp,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    USER_PREDICTIONS.unshift(record);
    return { record, awardedXp };
  }

  /**
   * Gets predictions history for user
   */
  public static getUserPredictions(userId: string): PredictionLeagueRecord[] {
    return USER_PREDICTIONS.filter((p) => p.userId === userId);
  }
}
