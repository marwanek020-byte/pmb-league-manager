import { prisma } from "@/lib/prisma";
import { getClubUltras, UltrasGroup } from "./ultras-registry";
import { UltrasSocialService } from "./ultras-social-service";

export interface CrossClubBanterRound {
  speaker: "HOME_CAPO" | "AWAY_CAPO";
  speakerName: string;
  clubName: string;
  groupTitle: string;
  badge: string;
  statement: string;
}

export interface CrossClubBanterArenaData {
  homeClubName: string;
  awayClubName: string;
  derbyTitle: string;
  h2hSummary: string;
  dialogueRounds: CrossClubBanterRound[];
}

export interface PyroPressureMetrics {
  stadiumName: string;
  crowdDecibels: number; // e.g. 118 dB
  pyroFlareCount: number; // e.g. 1,500
  intimidationFactor: number; // 0 - 100%
  pitchAdvantageBoost: string; // e.g. "+8% High-Pressing Workrate & Opposition Passing Error +12%"
  atmosphereTier: "ELECTRIC_CAULDRON" | "SMOKING_FORTRESS" | "STANDARD_TERRACE" | "SUBDUED";
}

export interface CurvaUltimatumData {
  isInCrisis: boolean;
  moraleScore: number;
  crisisSeverity: "CRITICAL" | "SEVERE" | "NORMAL";
  capoConfrontationSpeech: string;
  demands: string[];
  managerPledgeOptions: {
    id: string;
    text: string;
    moraleBonus: number;
  }[];
}

export class UltrasInnovationsService {
  /**
   * 1. ⚔️ Cross-Club Ultras Banter Arena (AI vs AI Live Debate)
   */
  public static async getCrossClubBanterArena(
    clubId: string,
    targetRivalId?: string
  ): Promise<CrossClubBanterArenaData> {
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
    const isHome = Boolean(nextHome);

    let oppName = isHome ? nextHome?.awayClub.name : nextAway?.homeClub.name;
    if (!oppName) oppName = "Wydad AC";

    const homeUltras = getClubUltras(isHome ? club.name : oppName);
    const awayUltras = getClubUltras(isHome ? oppName : club.name);

    const homeName = isHome ? club.name : oppName;
    const awayName = isHome ? oppName : club.name;

    const dialogueRounds: CrossClubBanterRound[] = [
      {
        speaker: "HOME_CAPO",
        speakerName: homeUltras.leaderDisplayName,
        clubName: homeName,
        groupTitle: homeUltras.officialGroupTitle,
        badge: homeUltras.bannerEmoji,
        statement: `مرحبا بيكم فجحيم ${homeName}! التيفو واجد والكراكاج غايعمي عينيكم من الدقيقة الأولى! النقاط التلاتة غايبقاو فدارنا! 🔥🏰`,
      },
      {
        speaker: "AWAY_CAPO",
        speakerName: awayUltras.leaderDisplayName,
        clubName: awayName,
        groupTitle: awayUltras.officialGroupTitle,
        badge: awayUltras.bannerEmoji,
        statement: `الهضرة فالسوشيال ميديا ساهلة! ${awayUltras.groupName} جاية بديبلاسمون تاريخي وغانسكتو مدرجاتكم بصوت حناجرنا والرجال فالتيران! ✈️⚔️`,
      },
      {
        speaker: "HOME_CAPO",
        speakerName: homeUltras.leaderDisplayName,
        clubName: homeName,
        groupTitle: homeUltras.officialGroupTitle,
        badge: homeUltras.bannerEmoji,
        statement: `التاريخ كيشهد شكون اللي عندو السيادة فهاد البلاد! عمركم ربحتو عندنا فاش كتكون الكورفا فقمة الغليان! 👑🛡️`,
      },
      {
        speaker: "AWAY_CAPO",
        speakerName: awayUltras.leaderDisplayName,
        clubName: awayName,
        groupTitle: awayUltras.officialGroupTitle,
        badge: awayUltras.bannerEmoji,
        statement: `الماضي فات والميدان هو لي غايحكم دابا! التوني ديالنا غالي وما كنرجعوش بلا فوز! موعدنا الصافرة النهائية! 👊💥`,
      },
    ];

    return {
      homeClubName: homeName,
      awayClubName: awayName,
      derbyTitle: `CLASH OF TITANS: ${homeName} vs ${awayName}`,
      h2hSummary: "Historical rivalry with fiery atmosphere and zero tactical compromise.",
      dialogueRounds,
    };
  }

  /**
   * 2. 🔥 Pyro & Pressure Dynamic Meter
   */
  public static async getPyroPressureMetrics(clubId: string): Promise<PyroPressureMetrics> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        powerRating: true,
        homeMatches: { where: { status: "UPCOMING" } },
      },
    });

    if (!club) throw new Error("Club not found");

    const morale = await UltrasSocialService.calculateUltrasMorale(clubId);
    const score = morale.moraleScore;

    const crowdDecibels = Math.round(102 + (score / 100) * 20); // 102 - 122 dB
    const pyroFlareCount = Math.round(400 + (score / 100) * 1600); // 400 - 2000 flares
    const intimidationFactor = Math.min(98, Math.max(45, score + 12));

    let atmosphereTier: PyroPressureMetrics["atmosphereTier"] = "SMOKING_FORTRESS";
    if (score >= 80) atmosphereTier = "ELECTRIC_CAULDRON";
    else if (score >= 50) atmosphereTier = "SMOKING_FORTRESS";
    else if (score >= 35) atmosphereTier = "STANDARD_TERRACE";
    else atmosphereTier = "SUBDUED";

    return {
      stadiumName: `Stade ${club.name} Main Arena`,
      crowdDecibels,
      pyroFlareCount,
      intimidationFactor,
      pitchAdvantageBoost: `+${Math.round(intimidationFactor * 0.12)}% High-Pressing Intensity & Opposition Disruption Coefficient`,
      atmosphereTier,
    };
  }

  /**
   * 3. 🚨 Curva Ultimatum Boardroom Pressure Event
   */
  public static async getCurvaUltimatumEvent(clubId: string): Promise<CurvaUltimatumData> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: { manager: true },
    });

    if (!club) throw new Error("Club not found");

    const morale = await UltrasSocialService.calculateUltrasMorale(clubId);
    const ultras = getClubUltras(club.name);

    const isInCrisis = morale.moraleScore < 45;

    return {
      isInCrisis,
      moraleScore: morale.moraleScore,
      crisisSeverity: morale.moraleScore < 30 ? "CRITICAL" : morale.moraleScore < 45 ? "SEVERE" : "NORMAL",
      capoConfrontationSpeech: `كوتش @${club.manager?.username || "Manager"}! الكورفا ماكتسكتش على الإهانة! هاد القميص عندو هيبة وجمهور كيضحي بحياتو فالديبلاسمونات! بغينا نشوفو روح قتالية فالتيران ولعب رجولي وإلا الأمور غاتخرج على السيطرة! 😡`,
      demands: [
        "إبعاد أي لاعب بارد وماكيعطيش 100% فالميدان",
        "تغيير النهج التكتيكي واللعب الهجومي الشجاع",
        "تحقيق 3 نقاط فالماتش الجاي بدون أي عذر",
      ],
      managerPledgeOptions: [
        {
          id: "PLEDGE_TACTICAL_OVERHAUL",
          text: "أعدكم بتغيير تكتيكي شامل والاعتماد على المقاتلين فقط (+15% Morale)",
          moraleBonus: 15,
        },
        {
          id: "PLEDGE_WIN_GUARANTEE",
          text: "الماتش الجاي مسألة حياة أو موت.. غاتشوفو وجه مختلف تماماً (+20% Morale)",
          moraleBonus: 20,
        },
        {
          id: "PLEDGE_UNITY_CALL",
          text: "محتاجين دعم الكورفا فالمدرج باش نتجاوزو هاد الأزمة معاً (+10% Morale)",
          moraleBonus: 10,
        },
      ],
    };
  }
}
