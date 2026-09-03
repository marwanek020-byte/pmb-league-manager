/**
 * botola-contract-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Botola Pro Contract & Salary Negotiation Engine
 * Handles: demand calculation, agent AI (patience), contract signing, budget debit
 */

import { Prisma, BudgetTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SquadRole = "CRUCIAL" | "IMPORTANT" | "ROTATION" | "BACKUP" | "PROSPECT";

export type AgentPersonality = "SHARK" | "PRAGMATIST" | "LOYALIST";

export type PositionCategory = "STRIKER" | "WINGER" | "MIDFIELDER" | "DEFENDER" | "GOALKEEPER";

export interface PlayerPerformanceProfile {
  positionCategory: PositionCategory;
  categoryLabelAr: string;
  performanceTier: "POOR" | "BELOW_AVERAGE" | "NORMAL" | "EXCELLENT" | "WORLD_CLASS";
  performanceTierLabel: string;
  goals: number;
  assists: number;
  cleanSheets: number;
  motmCount: number;
  totwCount: number;
  yellowCards: number;
  redCards: number;
  clubMatchesPlayed: number;
  goalsConceded: number;
  adjustmentPercentage: number;
  summaryAr: string;
}

export interface ContractDemands {
  primeSignature: number;      // منحة التوقيع السنوية (Annual Signing Bonus)
  seasonSalary: number;        // الراتب السنوي الثابت
  contractSeasonsLeft: number; // مدة العقد المطلوبة
  squadRole: SquadRole;        // الدور المطلوب في التشكيلة
  releaseClause: number | null;// الشرط الجزائي للاحتراف الخارجي
  agentName: string;           // اسم وكيل اللاعب
  agentPersonality: AgentPersonality;
  agentPatience: number;       // 3 = كامل, 2 = مرن, 1 = غاضب, 0 = انهار
  agentMessage: string;        // رسالة الوكيل للمدرب
  performance?: PlayerPerformanceProfile;
}

export interface NegotiationOffer {
  primeSignature: number;
  seasonSalary: number;
  contractSeasonsLeft: number;
  squadRole: SquadRole;
  releaseClause: number | null;
}

export interface NegotiationResult {
  status: "ACCEPTED" | "COUNTER" | "REJECTED" | "BREAKDOWN";
  agentPatience: number;       // رصيد الصبر المتبقي
  agentMessage: string;        // رد الوكيل
  agentMood: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  counterDemands?: Partial<NegotiationOffer>; // مقترح الوكيل المعدل عند COUNTER
}

export interface SignedContract {
  playerId: string;
  playerName: string;
  primeSignature: number;
  seasonSalary: number;
  contractSeasonsLeft: number;
  squadRole: SquadRole;
  releaseClause: number | null;
  clubBudgetAfter: number;
}

export const MAX_BOTOLA_SALARY = 400_000; // Strict Botola Pro Salary Cap: 400K € per season
export const MIN_BOTOLA_SALARY = 15_000;

const SALARY_BANDS: Array<{ minOvr: number; maxOvr: number; prime: [number, number]; salary: [number, number] }> = [
  { minOvr: 80, maxOvr: 99, prime: [100_000, 250_000], salary: [200_000, 380_000] },  // نجوم الصف الأول (سقف 400K)
  { minOvr: 76, maxOvr: 79, prime: [60_000, 150_000],  salary: [120_000, 220_000] },  // أساسيون مميزون
  { minOvr: 72, maxOvr: 75, prime: [30_000, 80_000],   salary:  [60_000, 130_000] },  // لاعبو التشكيلة
  { minOvr: 68, maxOvr: 71, prime: [15_000, 40_000],   salary:  [30_000,  60_000] },  // بديل/احتياطي
  { minOvr:  0, maxOvr: 67, prime:  [5_000, 20_000],   salary:  [15_000,  30_000] },  // موهبة صاعدة
];

const AGENT_NAMES = [
  "كريم بلمعلم", "سعيد الناصري", "عزيز الشافعي",
  "يوسف الرامي", "محمد الكنتاوي", "هشام الصبار",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBand(ovr: number) {
  return SALARY_BANDS.find(b => ovr >= b.minOvr && ovr <= b.maxOvr) ?? SALARY_BANDS[SALARY_BANDS.length - 1];
}

function midpoint(range: [number, number]) {
  return Math.round((range[0] + range[1]) / 2);
}

function pickAgentPersonality(ovr: number): AgentPersonality {
  if (ovr >= 79) return "SHARK";
  if (ovr >= 73) return "PRAGMATIST";
  return "LOYALIST";
}

function pickAgentName(): string {
  return AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
}

/**
 * Calculate how strong the manager's offer is relative to demands (0.0 – 1.0+)
 */
/**
 * Calculate how strong the manager's offer is relative to demands (0.0 – 1.0+)
 */
function offerStrength(offer: NegotiationOffer, demands: ContractDemands): number {
  const primeRatio   = offer.primeSignature   / demands.primeSignature;
  const salaryRatio  = offer.seasonSalary     / demands.seasonSalary;
  const seasonsRatio = offer.contractSeasonsLeft >= demands.contractSeasonsLeft ? 1 : 0.85;
  const roleMatch    = offer.squadRole === demands.squadRole ? 1 : 0.9;

  let base = (primeRatio * 0.50) + (salaryRatio * 0.30) + (seasonsRatio * 0.10) + (roleMatch * 0.10);

  // If player performance was poor, agent is more lenient and forgiving in accepting counter-offers
  if (demands.performance?.performanceTier === "POOR") {
    base += 0.06;
  } else if (demands.performance?.performanceTier === "BELOW_AVERAGE") {
    base += 0.03;
  }

  return base;
}

export function getPositionCategory(pos: string): PositionCategory {
  const p = (pos || "").toUpperCase().trim();
  if (/GK/.test(p)) return "GOALKEEPER";
  if (/CB|LB|RB|LWB|RWB|DEF/.test(p)) return "DEFENDER";
  if (/DMF|CMF|AMF|CM|CAM|CDM|LMF|RMF|MID/.test(p)) return "MIDFIELDER";
  if (/LWF|RWF|LW|RW/.test(p)) return "WINGER";
  return "STRIKER"; // CF, ST, SS, FW
}

export function getCategoryLabelAr(cat: PositionCategory): string {
  switch (cat) {
    case "STRIKER": return "مهاجم رأس حربة (Striker)";
    case "WINGER": return "جناح هجومي (Winger)";
    case "MIDFIELDER": return "لاعب خط وسط (Midfielder)";
    case "DEFENDER": return "مدافع (Defender)";
    case "GOALKEEPER": return "حارس مرمى (Goalkeeper)";
  }
}

// ── Public Service Methods ────────────────────────────────────────────────────

/**
 * 1. Calculate initial demands for a player before negotiations open.
 *    Performance-based analysis across ALL positions (Strikers, Wingers, Midfielders, Defenders, GKs).
 *    Strictly capped between 0 and 400,000 € for season salary.
 */
export async function calculatePlayerDemands(playerId: string): Promise<ContractDemands> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      fullName: true,
      overallRating: true,
      position: true,
      pmbClubId: true,
      contractSeasonsLeft: true,
      squadRole: true,
      releaseClause: true,
      lastNegotiatedAt: true,
    },
  });

  if (!player) throw new Error("Player not found.");

  const ovr  = player.overallRating ?? 72;
  const band = getBand(ovr);
  const personality = pickAgentPersonality(ovr);

  // ── Parallel Performance Queries Across All Competitions ─────────────────
  const [
    leagueGoals,
    cupGoals,
    leagueAssistsAsEvent,
    leagueAssistsAsAssister,
    cupAssists,
    yellowCards,
    redCards,
    leagueMotm,
    cupMotm,
    totwCount,
    globalTotwCount,
    clubCompletedMatches,
    totalLeagueMatches,
    totalCupMatches,
  ] = await Promise.all([
    prisma.matchEvent.count({ where: { playerId, type: "GOAL" } }),
    prisma.throneCupMatchEvent.count({ where: { playerId, type: "GOAL" } }),
    prisma.matchEvent.count({ where: { playerId, type: "ASSIST" } }),
    prisma.matchEvent.count({ where: { assistPlayerId: playerId } }),
    prisma.throneCupMatchEvent.count({ where: { playerId, type: "ASSIST" } }),
    prisma.matchEvent.count({ where: { playerId, type: "YELLOW_CARD" } }),
    prisma.matchEvent.count({ where: { playerId, type: "RED_CARD" } }),
    prisma.match.count({ where: { manOfTheMatchId: playerId } }),
    prisma.throneCupMatch.count({ where: { manOfTheMatchId: playerId } }),
    prisma.totwPlayer.count({ where: { playerId } }),
    prisma.globalTotwPlayer.count({ where: { playerId } }),
    player.pmbClubId
      ? prisma.match.findMany({
          where: {
            OR: [{ homeClubId: player.pmbClubId }, { awayClubId: player.pmbClubId }],
            status: "COMPLETED",
          },
          select: { homeClubId: true, awayClubId: true, homeGoals: true, awayGoals: true },
        })
      : Promise.resolve([]),
    prisma.match.count({ where: { status: "COMPLETED" } }),
    prisma.throneCupMatch.count({ where: { status: "COMPLETED" } }),
  ]);

  const totalGoals = leagueGoals + cupGoals;
  const totalAssists = leagueAssistsAsEvent + leagueAssistsAsAssister + cupAssists;
  const totalYellowCards = yellowCards;
  const totalRedCards = redCards;
  const totalMotm = leagueMotm + cupMotm;
  const totalTotw = totwCount + globalTotwCount;

  let cleanSheets = 0;
  let goalsConceded = 0;
  for (const m of clubCompletedMatches) {
    if (m.homeClubId === player.pmbClubId) {
      const conceded = m.awayGoals ?? 0;
      goalsConceded += conceded;
      if (conceded === 0) cleanSheets++;
    } else if (m.awayClubId === player.pmbClubId) {
      const conceded = m.homeGoals ?? 0;
      goalsConceded += conceded;
      if (conceded === 0) cleanSheets++;
    }
  }
  const clubMatchesPlayed = clubCompletedMatches.length;
  const totalMatchesAvailable = totalLeagueMatches + totalCupMatches + clubMatchesPlayed;

  const posCategory = getPositionCategory(player.position);
  let salaryFactor = 1.0;
  let primeFactor = 1.0;
  let performanceTier: "POOR" | "BELOW_AVERAGE" | "NORMAL" | "EXCELLENT" | "WORLD_CLASS" = "NORMAL";
  let performanceTierLabel = "مردود فني متوازن";
  let agentSpeech = "";
  let summaryAr = "";

  const baseSalary = midpoint(band.salary);
  const basePrime = midpoint(band.prime);

  // ── Position-Aware Performance Logic ──────────────────────────────────────
  if (totalMatchesAvailable === 0 && totalGoals === 0) {
    // Early season / unplayed: Baseline demands
    performanceTier = "NORMAL";
    performanceTierLabel = "جاهزية الموسم الجديد";
    summaryAr = `الموسم في بدايته. تم احتساب الراتب وفق التصنيف الفني للبطاقة (${ovr} OVR) وسقف الـ 400K €.`;
    agentSpeech = `مرحباً كوتش. اللاعب في جاهزية تامة لبدء مشواره مع الفريق وتقديم أفضل ما لديه. مطالبنا المالية تستند إلى تصنيفه وقيمته الفنية (${baseSalary.toLocaleString("fr-MA")} €) مع الالتزام التام بسقف الـ 400 ألف يورو.`;
  } else {
    switch (posCategory) {
      case "STRIKER": {
        if (totalGoals === 0) {
          salaryFactor = 0.50; // 50% discount
          primeFactor = 0.40;
          performanceTier = "POOR";
          performanceTierLabel = "صيام تهديفي حاد (-50%)";
          summaryAr = `المهاجم لم يسجل أي هدف هذا الموسم (0 أهداف في ${clubMatchesPlayed} مباراة). تم خفض الراتب بنسبة 50% لعدم الفاعلية التهديفية.`;
          agentSpeech = `مرحباً كوتش. موكلي يدرك تماماً أنه كمهاجم لم يسجل أي هدف هذا الموسم (${totalGoals} أهداف في ${clubMatchesPlayed} مباراة). المهاجم الذي لا يسجل لا يصح أن يطلب راتباً كبيراً، لذا طلباتنا المالية متواضعة وعقلانية جداً (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} € فقط للموسم) لنثبت جدارتنا في الملعب أولاً.`;
        } else if (totalGoals === 1) {
          salaryFactor = 0.70; // 30% discount
          primeFactor = 0.65;
          performanceTier = "BELOW_AVERAGE";
          performanceTierLabel = "فاعلية تهديفية متواضعة (-30%)";
          summaryAr = `المهاجم سجل هدفاً وحيداً فقط. تم خفض الراتب بنسبة 30% ليتناسب مع معدله التهديفي المحدود.`;
          agentSpeech = `موكلي مهاجم مجتهد لكن حصيلته التهديفية متواضعة (هدف واحد فقط). طلباتنا المالية معتدلة (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €) وتراعي أرقامه التهديفية الحالية دون مبالغة.`;
        } else if (totalGoals >= 5 || (totalGoals >= 3 && (totalMotm >= 1 || totalTotw >= 1))) {
          salaryFactor = 1.20; // 20% bonus
          primeFactor = 1.15;
          performanceTier = "EXCELLENT";
          performanceTierLabel = "قناص هداف وحاسم (+20%)";
          summaryAr = `المهاجم سجل ${totalGoals} أهداف ونال جائزة رجل المباراة ${totalMotm} مرات. يستحق علاوة أداء بنسبة 20% ضمن السقف القانوني.`;
          agentSpeech = `أرقام موكلي التهديفية تتحدث عنه بتسجيله ${totalGoals} أهداف حاسمة (${totalMotm} مرات رجل المباراة)! نطلب راتباً يعكس فاعليته الهجومية (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €) مع الالتزام التام بسقف الـ 400K €.`;
        } else {
          salaryFactor = 1.0;
          performanceTier = "NORMAL";
          performanceTierLabel = "مردود هجومي متوازن";
          summaryAr = `المهاجم يملك رصيداً تهديفياً مقبولاً (${totalGoals} أهداف). الراتب معتمد وفق الشريحة القياسية.`;
          agentSpeech = `موكلي يقدم أداءً هجومياً جيداً بتسجيله ${totalGoals} أهداف ومساهمته مع الفريق. طلباتنا عادلة وضمن السقف الطبيعي.`;
        }
        break;
      }

      case "WINGER": {
        const contributions = totalGoals + totalAssists;
        if (contributions === 0) {
          salaryFactor = 0.55; // 45% discount
          primeFactor = 0.45;
          performanceTier = "POOR";
          performanceTierLabel = "غياب البصمة الهجومية (-45%)";
          summaryAr = `الجناح لم يسجل ولم يصنع أي هدف (0 مساهمات تهديفية على الأطراف). تم خفض الراتب بنسبة 45%.`;
          agentSpeech = `الجناح يعلم أنه لم يقدم الفاعلية المطلوبة على الأطراف هذا الموسم (0 أهداف و 0 أسيست). نحن واقعيون ولا نطالب برواتب النجوم، ونطلب راتباً مخفضاً (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €) لإعادة إثبات الذات.`;
        } else if (contributions === 1) {
          salaryFactor = 0.75; // 25% discount
          primeFactor = 0.70;
          performanceTier = "BELOW_AVERAGE";
          performanceTierLabel = "مساهمة هجومية محدودة (-25%)";
          summaryAr = `الجناح ساهم في هدف وحيد فقط. تم خفض الراتب بنسبة 25%.`;
          agentSpeech = `موكلي ساهم في هدف واحد فقط على الرواق. طلباتنا معتدلة وتضع في الحسبان ضرورة رفع الإنتاجية الهجومية.`;
        } else if (contributions >= 4 || (contributions >= 2 && totalTotw >= 1)) {
          salaryFactor = 1.20; // 20% bonus
          primeFactor = 1.15;
          performanceTier = "EXCELLENT";
          performanceTierLabel = "جناح مهاري وحاسم (+20%)";
          summaryAr = `الجناح أسهم في ${contributions} أهداف (سجل ${totalGoals} وصنع ${totalAssists}) وتألق في تشكيلة الأسبوع.`;
          agentSpeech = `الجناح كان شعلة نشاط على الأطراف بصناعة وتسجيل ${contributions} أهداف وتألقه في تشكيلة الأسبوع! يستحق راتباً يقدر سرعته وخطورته (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €).`;
        } else {
          salaryFactor = 1.0;
          performanceTier = "NORMAL";
          performanceTierLabel = "نشاط هجومي معتدل";
          summaryAr = `الجناح يمتلك ${contributions} مساهمات هجومية. الراتب متوازن.`;
          agentSpeech = `الجناح يقدم عملاً جيداً على الأطراف ومساهمات إيجابية. طلباتنا المالية متوازنة مع إمكانياته وسقف البطولة.`;
        }
        break;
      }

      case "MIDFIELDER": {
        if (totalAssists === 0 && totalGoals === 0 && totalTotw === 0 && totalMotm === 0) {
          salaryFactor = 0.60; // 40% discount
          primeFactor = 0.50;
          performanceTier = "POOR";
          performanceTierLabel = "عقم في صناعة اللعب (-40%)";
          summaryAr = `لاعب الوسط لم يسجل أو يصنع أي هدف وخلا سجله من الجوائز الفردية. تم خفض الراتب بنسبة 40%.`;
          agentSpeech = `لاعب الوسط يدرك أنه لم يترك بعد البصمة المنتظرة في صناعة الأهداف أو ضبط الإيقاع (0 أسيست و 0 أهداف). نحن نتحلى بالواقعية ولا نطالب بأجر نجوم الصف الأول، بل براتب منطقي (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €).`;
        } else if (totalAssists >= 3 || totalGoals >= 3 || totalTotw >= 1 || totalMotm >= 1) {
          salaryFactor = 1.15; // 15% bonus
          primeFactor = 1.10;
          performanceTier = "EXCELLENT";
          performanceTierLabel = "مايسترو وسط متميز (+15%)";
          summaryAr = `لاعب الوسط صنع ${totalAssists} أهداف وسجل ${totalGoals} ونال ${totalMotm} جائزة رجل المباراة وتشكيلة الأسبوع.`;
          agentSpeech = `مايسترو خط الوسط يمتلك رؤية ثاقبة بـ ${totalAssists} أسيست و${totalGoals} أهداف مع تألقه في تشكيلة الأسبوع! قيمته الفنية كضابط لإيقاع الفريق تستحق عقداً مجزياً (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €).`;
        } else {
          salaryFactor = 0.90;
          performanceTier = "NORMAL";
          performanceTierLabel = "مردود متوسط في وسط الميدان";
          summaryAr = `لاعب الوسط يملك حضوراً ثابتاً في بناء الهجمات (${totalAssists} أسيست، ${totalGoals} أهداف).`;
          agentSpeech = `لاعب الوسط عنصر فعال في الربط وتدوير الكرة، وطلباتنا المالية واقعية وتحترم ضوابط النادي وسقف الـ 400K €.`;
        }

        if (totalRedCards >= 1) {
          salaryFactor = Math.max(0.45, salaryFactor - 0.10);
          summaryAr += " (خصم 10% إضافي بسبب البطاقة الحمراء).";
          agentSpeech += " مع استعدادنا لخصم إضافي نظراً لتلقيه بطاقة حمراء مكلفة هذا الموسم.";
        }
        break;
      }

      case "DEFENDER": {
        if (cleanSheets === 0 && totalTotw === 0 && totalMotm === 0) {
          salaryFactor = 0.60; // 40% discount
          primeFactor = 0.50;
          performanceTier = "POOR";
          performanceTierLabel = "ضعف دفاعي وغياب الكلين شيت (-40%)";
          summaryAr = `المنظومة الدفاعية عانت واستقبلت أهدافاً دون أي شباك نظيفة (0 كلين شيت). تم تخفيض الراتب بنسبة 40%.`;
          agentSpeech = `المدافع يدرك أن الخط الخلفي عانى واستقبل أهدافاً دون تحقيق نظافة الشباك المطلوبة (0 كلين شيت). لا نطلب عقداً كبيراً بل راتباً متواضعاً (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €) يتناسب مع ضرورة التطور الدفاعي.`;
        } else if (cleanSheets >= 2 || totalTotw >= 1 || totalMotm >= 1) {
          salaryFactor = 1.20; // 20% bonus
          primeFactor = 1.15;
          performanceTier = "EXCELLENT";
          performanceTierLabel = "صخرة دفاعية حصينة (+20%)";
          summaryAr = `المدافع قاد الخط الخلفي للحفاظ على نظافة الشباك في ${cleanSheets} مباريات واختير في تشكيلة الأسبوع.`;
          agentSpeech = `صخرة الدفاع كان ركيزة أساسية وساهم في الخروج بشباك نظيفة في ${cleanSheets} مباريات مع التواجد في تشكيلة الأسبوع! صلابته تستحق راتباً قوياً (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €) ضمن سقف البطولة.`;
        } else {
          salaryFactor = 0.90;
          performanceTier = "NORMAL";
          performanceTierLabel = "صلابة دفاعية مقبولة";
          summaryAr = `المدافع حقق ${cleanSheets} كلين شيت وقدم أداءً دفاعياً مستقراً.`;
          agentSpeech = `المدافع يقدم أداءً انضباطياً في التغطية، ومطالبنا معقولة وضمن حدود ميزانية النادي.`;
        }

        if (totalRedCards >= 1) {
          salaryFactor = Math.max(0.45, salaryFactor - 0.10);
          summaryAr += " (خصم 10% إضافي بسبب البطاقة الحمراء).";
          agentSpeech += " مع مراعاة خصم السلوك الانضباطي لتلقيه بطاقة حمراء.";
        }
        break;
      }

      case "GOALKEEPER": {
        if (cleanSheets === 0 && totalTotw === 0 && totalMotm === 0) {
          salaryFactor = 0.55; // 45% discount
          primeFactor = 0.45;
          performanceTier = "POOR";
          performanceTierLabel = "تراجع التصديات والكلين شيت (-45%)";
          summaryAr = `حارس المرمى استقبلت شباكه أهدافاً دون تحقيق أي كلين شيت. تم تخفيض الراتب بنسبة 45%.`;
          agentSpeech = `حارس المرمى مر بمرحلة صعبة واستقبلت شباكه أهدافاً دون تحقيق أي كلين شيت (0 شباك نظيفة). وكيل الحارس لا يبالغ في مطالبه المالية، ونطلب راتباً مناسباً (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €) يعكس الرغبة في تصحيح المسار.`;
        } else if (cleanSheets >= 2 || totalTotw >= 1 || totalMotm >= 1) {
          salaryFactor = 1.25; // 25% bonus
          primeFactor = 1.20;
          performanceTier = "EXCELLENT";
          performanceTierLabel = "حارس أمين وتصديات بطولية (+25%)";
          summaryAr = `حارس المرمى حافظ على نظافة الشباك في ${cleanSheets} مباريات ونال ${totalMotm} جائزة رجل المباراة. يستحق علاوة 25%.`;
          agentSpeech = `الحارس الأمين كان صمام الأمان بتصديات حاسمة وخرج بشباك نظيفة في ${cleanSheets} مباريات وحاز جائزة رجل المباراة! يستحق راتباً يعكس دوره كحامٍ لعرين الفريق (${Math.round(baseSalary * salaryFactor).toLocaleString("fr-MA")} €).`;
        } else {
          salaryFactor = 0.90;
          performanceTier = "NORMAL";
          performanceTierLabel = "حراسة مرمى مستقرة";
          summaryAr = `حارس المرمى خرج بـ ${cleanSheets} كلين شيت. الراتب متوازن.`;
          agentSpeech = `حارس المرمى يتمتع بالخبرة والتركيز، ومطالبنا المالية عادلة وتلتزم بسقف الـ 400 ألف يورو.`;
        }
        break;
      }
    }
  }

  // Jitter for variety (±3%)
  const jitter = 0.97 + Math.random() * 0.06;
  let salaryDemand = Math.round(baseSalary * salaryFactor * jitter);
  let primeDemand  = Math.round(basePrime * primeFactor * jitter);

  // Strict salary cap enforcement: between 0 and 400K € per season
  salaryDemand = Math.min(MAX_BOTOLA_SALARY, Math.max(MIN_BOTOLA_SALARY, salaryDemand));
  primeDemand  = Math.min(300_000, Math.max(5_000, primeDemand));

  const seasonsDemand = ovr >= 76 ? 2 : 1;
  const defaultRole: SquadRole = ovr >= 79 ? "CRUCIAL" : ovr >= 74 ? "IMPORTANT" : "ROTATION";

  const releaseClause = personality === "SHARK"
    ? Math.min(1_500_000, Math.round(primeDemand * 3))
    : personality === "PRAGMATIST"
    ? Math.min(3_000_000, Math.round(primeDemand * 5))
    : null;

  const agentMessages: Record<AgentPersonality, string> = {
    SHARK: agentSpeech || `مرحباً كوتش! موكلي يعلم قيمته السوقية جيداً. نطالب بمنحة توقيع قدرها ${primeDemand.toLocaleString("fr-MA")} €، مع دور ${defaultRole === "CRUCIAL" ? "أساسي لا يمس" : "مهم"} في التشكيلة لموسمين على الأقل وراتب سنوي ${salaryDemand.toLocaleString("fr-MA")} €.`,
    PRAGMATIST: agentSpeech || `مرحباً. موكلي منفتح على التفاوض، لكن نطالب بتقدير يليق بمكانته وتاريخه في البطولة ضمن سقف الرواتب المنطقي.`,
    LOYALIST: agentSpeech || `موكلي يحب هذا النادي كثيراً ويريد الاستمرار. طلباتنا معقولة وضمن حدود ميزانية النادي وسقف البطولة.`,
  };

  const performanceProfile: PlayerPerformanceProfile = {
    positionCategory: posCategory,
    categoryLabelAr: getCategoryLabelAr(posCategory),
    performanceTier,
    performanceTierLabel,
    goals: totalGoals,
    assists: totalAssists,
    cleanSheets,
    motmCount: totalMotm,
    totwCount: totalTotw,
    yellowCards: totalYellowCards,
    redCards: totalRedCards,
    clubMatchesPlayed,
    goalsConceded,
    adjustmentPercentage: Math.round((salaryFactor - 1) * 100),
    summaryAr,
  };

  return {
    primeSignature: primeDemand,
    seasonSalary: salaryDemand,
    contractSeasonsLeft: seasonsDemand,
    squadRole: defaultRole,
    releaseClause,
    agentName: pickAgentName(),
    agentPersonality: personality,
    agentPatience: 3,
    agentMessage: agentMessages[personality],
    performance: performanceProfile,
  };
}

/**
 * 2. Evaluate the manager's counter-offer and return the agent's response.
 *    Must be called per negotiation round. Patience decrements on poor offers.
 */
export function evaluateNegotiationOffer(
  demands: ContractDemands,
  offer: NegotiationOffer,
  currentPatience: number
): NegotiationResult {
  const strength = offerStrength(offer, demands);

  // ACCEPTED: offer is 90%+ of demands
  if (strength >= 0.90) {
    return {
      status: "ACCEPTED",
      agentPatience: currentPatience,
      agentMood: "HAPPY",
      agentMessage: "ممتاز! هذا العرض يعكس قيمة موكلي الحقيقية. نوافق على الشروط ونحن مستعدون للتوقيع! 🤝",
    };
  }

  // Last patience point: final warning
  if (currentPatience <= 1) {
    return {
      status: "BREAKDOWN",
      agentPatience: 0,
      agentMood: "ANGRY",
      agentMessage: "هذا العرض غير مقبول على الإطلاق. موكلي لن يستمر في هذه المفاوضات. سنبحث عن نادٍ يقدر مكانته! ❌",
    };
  }

  // COUNTER: offer is 70-89% – agent proposes a middle ground
  if (strength >= 0.70) {
    const counterPrime = Math.round(demands.primeSignature * 0.95);
    return {
      status: "COUNTER",
      agentPatience: currentPatience - 1,
      agentMood: "NEUTRAL",
      agentMessage: `العرض قريب لكنه لم يصل للحد المقبول. موكلي يقترح منحة توقيع لا تقل عن ${counterPrime.toLocaleString("fr-MA")} درهم كحد أدنى للتفاوض.`,
      counterDemands: {
        primeSignature: counterPrime,
        seasonSalary: Math.round(demands.seasonSalary * 0.95),
      },
    };
  }

  // REJECTED: offer below 70% – agent is frustrated
  return {
    status: "REJECTED",
    agentPatience: currentPatience - 1,
    agentMood: "FRUSTRATED",
    agentMessage: `هذا الرقم بعيد جداً عن الواقع. موكلي يشعر أنكم لا تقدرون قيمته. لدينا ${currentPatience - 1} فرصة أخرى للوصول لاتفاق.`,
  };
}

/**
 * 3. Finalize and sign the contract.
 *    - Saves contract terms to the Player record
 *    - Debits the primeSignature from the club budget (PRIME_DE_SIGNATURE transaction)
 *    - Sets contractSatisfaction to 100%
 */
export async function finalizeContractSigning(
  playerId: string,
  clubId: string,
  agreedTerms: NegotiationOffer
): Promise<SignedContract> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { fullName: true, pmbClubId: true },
  });

  if (!player) throw new Error("Player not found.");

  const result = await prisma.$transaction(async (tx) => {
    // Lock club budget safely
    const currentBudget = await lockClubBudget(tx, clubId);

    const primeAmount = new Prisma.Decimal(agreedTerms.primeSignature);

    if (currentBudget.lessThan(primeAmount)) {
      throw new Error("ميزانية النادي غير كافية لدفع منحة التوقيع. يرجى مراجعة الميزانية أولاً.");
    }

    // Debit prime de signature
    await applyBudgetTransaction(tx, {
      clubId,
      amount: primeAmount.negated(),
      currentBudget,
      type: BudgetTransactionType.PRIME_DE_SIGNATURE,
      description: `منحة توقيع: ${player.fullName} (عقد ${agreedTerms.contractSeasonsLeft} موسم)`,
      playerId,
    });

    // Update player contract fields and officially link to club squad
    const updatedPlayer = await tx.player.update({
      where: { id: playerId },
      data: {
        pmbClubId:            clubId,
        status:               "REGISTERED",
        primeSignature:       new Prisma.Decimal(agreedTerms.primeSignature),
        seasonSalary:         new Prisma.Decimal(agreedTerms.seasonSalary),
        contractSeasonsLeft:  agreedTerms.contractSeasonsLeft,
        squadRole:            agreedTerms.squadRole,
        releaseClause:        agreedTerms.releaseClause
          ? new Prisma.Decimal(agreedTerms.releaseClause)
          : null,
        contractSatisfaction: 100,
        lastNegotiatedAt:     new Date(),
      },
      select: { fullName: true },
    });

    const updatedClub = await tx.club.findUnique({
      where: { id: clubId },
      select: { budget: true },
    });

    return {
      playerId,
      playerName: updatedPlayer.fullName,
      primeSignature: agreedTerms.primeSignature,
      seasonSalary: agreedTerms.seasonSalary,
      contractSeasonsLeft: agreedTerms.contractSeasonsLeft,
      squadRole: agreedTerms.squadRole,
      releaseClause: agreedTerms.releaseClause,
      clubBudgetAfter: Number(updatedClub?.budget ?? 0),
    };
  });

  return result;
}

/**
 * 4. Get current contract summary for a player (used by the player list UI).
 */
export async function getPlayerContractSummary(playerId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      fullName: true,
      overallRating: true,
      position: true,
      photo: true,
      primeSignature: true,
      seasonSalary: true,
      contractSeasonsLeft: true,
      squadRole: true,
      releaseClause: true,
      contractSatisfaction: true,
      lastNegotiatedAt: true,
    },
  });

  if (!player) return null;

  return {
    ...player,
    primeSignature: Number(player.primeSignature),
    seasonSalary: Number(player.seasonSalary),
    releaseClause: player.releaseClause ? Number(player.releaseClause) : null,
    contractStatus:
      player.contractSeasonsLeft <= 0 ? "EXPIRED" :
      player.contractSeasonsLeft === 1 ? "FINAL_SEASON" :
      "ACTIVE",
  };
}

/**
 * 5. Collapse deal and refund 100% of auction bid fee when negotiations break down or manager walks away.
 *    - Refunds the auction winning bid 100% back to the club's budget.
 *    - Records AUCTION_BID_REFUND in ClubBudgetTransaction.
 *    - Restores the player to AVAILABLE status with null club.
 *    - Cancels the pending auction / transfer.
 */
export async function collapseAndRefundDeal(playerId: string, clubId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, fullName: true, pmbClubId: true },
  });

  if (!player) throw new Error("Player not found.");

  return await prisma.$transaction(async (tx) => {
    // 1. Check if there is an auction won by this club for this player
    const auction = await tx.auction.findFirst({
      where: {
        playerId,
        currentWinnerClubId: clubId,
        status: "COMPLETED",
      },
    });

    let refundedAmount = 0;

    if (auction) {
      refundedAmount = Number(auction.currentBid);
      const refundDecimal = new Prisma.Decimal(auction.currentBid);

      // Lock club budget safely and apply 100% full refund
      const currentBudget = await lockClubBudget(tx, clubId);

      await applyBudgetTransaction(tx, {
        clubId,
        amount: refundDecimal,
        currentBudget,
        type: BudgetTransactionType.AUCTION_BID_REFUND,
        description: `استرداد كامل لمبلغ المزاد (${player.fullName}) بسبب عدم الاتفاق على العقد الشخصي`,
        playerId,
      });

      // Cancel the auction
      await tx.auction.update({
        where: { id: auction.id },
        data: {
          status: "CANCELLED",
          currentWinnerClubId: null,
        },
      });

      // Player returns to Free Agents / Available market
      await tx.player.update({
        where: { id: playerId },
        data: {
          status: "AVAILABLE",
          pmbClubId: null,
        },
      });
    }

    // 2. Check if there is a club-to-club transfer pending personal terms
    const transfer = await tx.transfer.findFirst({
      where: {
        playerId,
        toClubId: clubId,
        status: "PENDING_PERSONAL_TERMS",
      },
    });

    if (transfer) {
      await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          status: "CANCELLED",
          notes: `${transfer.notes ? `${transfer.notes}\n` : ""}انهارت المفاوضات الشخصية مع اللاعب والوكيل. تم إلغاء الصفقة.`,
        },
      });
    }

    const updatedClub = await tx.club.findUnique({
      where: { id: clubId },
      select: { budget: true },
    });

    return {
      success: true,
      playerId,
      playerName: player.fullName,
      refundedAmount,
      clubBudgetAfter: Number(updatedClub?.budget ?? 0),
      message: refundedAmount > 0
        ? `تم إلغاء الصفقة واسترداد مبلغ ${refundedAmount.toLocaleString("fr-MA")} € إلى ميزانية النادي بالكامل.`
        : "تم إلغاء الصفقة وعودة اللاعب إلى فريقه.",
    };
  });
}

// ── Botola Pro Foreign Player Quota (Max 5 Non-Moroccan Players) ───────────────

export const BOTOLA_MAX_FOREIGN_PLAYERS = 5;

/**
 * Checks if a nationality is Moroccan or Local.
 */
export function isMoroccanNationality(nationality: string | null | undefined): boolean {
  if (!nationality) return false;
  const n = nationality.trim().toLowerCase();
  return (
    n.includes("moroc") ||
    n.includes("maroc") ||
    n === "ma" ||
    n.includes("مغرب")
  );
}

/**
 * Returns count of foreign players currently in a club's registered squad.
 */
export async function getClubForeignPlayerCount(clubId: string): Promise<number> {
  const squad = await prisma.player.findMany({
    where: {
      pmbClubId: clubId,
      status: "REGISTERED",
    },
    select: { nationality: true },
  });

  return squad.filter(p => !isMoroccanNationality(p.nationality)).length;
}

/**
 * Validates if a club can sign a player based on the 5 foreign player quota.
 */
export async function validateForeignQuota(
  clubId: string,
  playerNationality: string
): Promise<{ allowed: boolean; currentForeignCount: number; maxAllowed: number; message?: string }> {
  if (isMoroccanNationality(playerNationality)) {
    return { allowed: true, currentForeignCount: 0, maxAllowed: BOTOLA_MAX_FOREIGN_PLAYERS };
  }

  const currentForeignCount = await getClubForeignPlayerCount(clubId);
  if (currentForeignCount >= BOTOLA_MAX_FOREIGN_PLAYERS) {
    return {
      allowed: false,
      currentForeignCount,
      maxAllowed: BOTOLA_MAX_FOREIGN_PLAYERS,
      message: `قوانين الجامعة الملكية المغربية (FRMF): يمتلك ناديك حالياً ${currentForeignCount}/5 لاعبين أجانب (الحد الأقصى القانوني). لا يمكنك تسجيل لاعب أجنبي جديد إلا بعد فسخ عقد أو بيع لاعب أجنبي من تشكيلتك.`,
    };
  }

  return {
    allowed: true,
    currentForeignCount,
    maxAllowed: BOTOLA_MAX_FOREIGN_PLAYERS,
  };
}

// ── Contract Termination / Release with Severance Payout ─────────────────────

/**
 * 6. Get Contract Termination details & Agent settlement demand for release.
 */
export async function getContractTerminationDetails(playerId: string, clubId: string) {
  const player = await prisma.player.findFirst({
    where: { id: playerId, pmbClubId: clubId, status: "REGISTERED" },
    select: {
      id: true,
      fullName: true,
      position: true,
      nationality: true,
      seasonSalary: true,
      contractSeasonsLeft: true,
      overallRating: true,
      contractSatisfaction: true,
    },
  });

  if (!player) throw new Error("Player not found in your registered squad.");

  const isForeign = !isMoroccanNationality(player.nationality);
  const seasonsLeft = Math.max(1, player.contractSeasonsLeft);
  const annualSalary = Number(player.seasonSalary);
  const totalRemainingContractValue = annualSalary * seasonsLeft;

  // Goals check for performance impact on severance demand
  const goals = await prisma.throneCupMatchEvent.count({
    where: { playerId, type: "GOAL" },
  });

  const isForward = ["CF", "ST", "LWF", "RWF"].includes(player.position.toUpperCase());

  // Base severance demand percentage:
  // If striker scored 0 goals or player has low satisfaction/low playing time,
  // they are eager to leave and demand a much smaller severance (e.g. 25% - 35%)!
  // If star player, demand is 60% - 70%.
  let severancePercentage = 0.50;
  let reasonText = "";

  if (isForward && goals === 0) {
    severancePercentage = 0.25;
    reasonText = "نظراً لعدم تسجيل أهداف كافية هذا الموسم ورغبة اللاعب في المغادرة لخوض تجربة جديدة، يقبل الوكيل بتعويض فسخ رمزي ومنخفض (25% من المتبقي).";
  } else if (player.contractSatisfaction < 60) {
    severancePercentage = 0.35;
    reasonText = "اللاعب غير مرتاح في الفريق ويريد الرحيل، لذا يطلب تسوية ودية مخفضة لفسخ العقد فوراً.";
  } else if ((player.overallRating || 70) >= 78) {
    severancePercentage = 0.65;
    reasonText = "اللاعب صاحب قيمة فنية عالية وأساسي، ويطالب بتعويض منصف عن إنهاء عقده مبكراً.";
  } else {
    severancePercentage = 0.45;
    reasonText = "موكلي منفتح على إنهاء العقد بالتراضي مقابل تسوية مالية متوازنة.";
  }

  const requestedSeverance = Math.round(totalRemainingContractValue * severancePercentage);

  return {
    playerId: player.id,
    playerName: player.fullName,
    position: player.position,
    nationality: player.nationality,
    isForeign,
    annualSalary,
    seasonsLeft,
    totalRemainingContractValue,
    goals,
    severancePercentage: Math.round(severancePercentage * 100),
    requestedSeverance,
    reasonText,
    minAcceptableSeverance: Math.round(requestedSeverance * 0.70),
  };
}

/**
 * 7. Execute Contract Termination: pay severance, release player as Free Agent, update budget.
 */
export async function terminateContractWithSeverance(
  playerId: string,
  clubId: string,
  severanceAmount: number
) {
  const player = await prisma.player.findFirst({
    where: { id: playerId, pmbClubId: clubId, status: "REGISTERED" },
    select: { id: true, fullName: true, nationality: true },
  });

  if (!player) throw new Error("Player not found in your squad.");

  return await prisma.$transaction(async (tx) => {
    const currentBudget = await lockClubBudget(tx, clubId);

    if (severanceAmount > 0) {
      if (currentBudget.lessThan(severanceAmount)) {
        throw new Error("ميزانية النادي لا تكفي لدفع تعويض فسخ العقد المتفق عليه.");
      }

      await applyBudgetTransaction(tx, {
        clubId,
        amount: new Prisma.Decimal(severanceAmount).negated(),
        currentBudget,
        type: BudgetTransactionType.CONTRACT_TERMINATION_PAYOUT,
        description: `تسوية فسخ عقد بالتراضي: ${player.fullName}`,
        playerId,
      });
    }

    const updatedClub = await tx.club.findUnique({
      where: { id: clubId },
      select: { budget: true, name: true },
    });

    // Transfer player to Admin Custody for decision (Auction or Free Agent Market)
    await tx.player.update({
      where: { id: playerId },
      data: {
        pmbClubId: null,
        status: "AVAILABLE",
        adminCustodyStatus: "PENDING_ADMIN_DECISION",
        expiredFromClubId: clubId,
        expiredFromClubName: updatedClub?.name ?? "نادي بالبطولة",
        contractExpiredAt: new Date(),
        contractSeasonsLeft: 0,
        seasonSalary: 0,
        primeSignature: 0,
        releaseClause: null,
        contractSatisfaction: 80,
      },
    });

    const isForeign = !isMoroccanNationality(player.nationality);

    // Announce on Ultras
    UltrasSocialService.publishTransferAnnouncement({
      playerName: player.fullName,
      position: "Free Agent",
      overallRating: 75,
      feeEur: severanceAmount,
      fromClubName: "نادي بالبطولة",
      toClubName: "لاعب حر (Free Agent)",
      buyerClubId: clubId,
      transferType: "FREE_TRANSFER",
    }).catch(() => {});

    return {
      success: true,
      playerId,
      playerName: player.fullName,
      severancePaid: severanceAmount,
      clubBudgetAfter: Number(updatedClub?.budget ?? 0),
      isForeign,
      message: `تم فسخ عقد اللاعب ${player.fullName} بالتراضي بنجاح${severanceAmount > 0 ? ` ودفع تعويض قدره ${severanceAmount.toLocaleString("fr-MA")} €` : ""}. اللاعب أصبح الآن حراً في السوق${isForeign ? "، وتم تحرير مقعد للاعب أجنبي في الكوتة." : "."}`,
    };
  });
}


