/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PMB LEAGUE MANAGER — NEGOTIATION MATH ENGINE (v4.0 - GRANDMASTER EDITION)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure mathematical & behavioral simulation for virtual football contract bargaining.
 * 
 * Mechanics Included:
 * 1. Smart Offer Evaluation & Non-linear Financial Cross-Compensation
 * 2. Hypocrisy Detection (Role vs. Wage Mismatch Punisher)
 * 3. Stepping-Stone Wonderkid Ambition (Sub-21 European Escape Clause)
 * 4. Hidden Deal-Breakers (Unyielding Redlines with Subtle Clues)
 * 5. Club Prestige & Relegation Tax Scaling
 * 6. "Take It or Leave It" Redline Ultimatum (when patience === 1)
 * 7. Deadline Day / Positional Desperation Multiplier
 * 8. Rival Market Pressure (Competing Bids Gazumping Leverage)
 * 9. Club Legend / Homegrown Loyalty Discount
 * 10. Time-Wasting & Micro-Increment Penalty Detection
 * 11. Negotiation Momentum & Velocity Bonus
 */

export interface ContractDemandsPayload {
  primeSignature: number;
  seasonSalary: number;
  contractSeasonsLeft: number;
  squadRole?: string;
  releaseClause?: number | null;
  goalBonus?: number;
  cleanSheetBonus?: number;
  trophyBonus?: number;
  agentPersonality?: "SHARK" | "PRAGMATIST" | "LOYALIST" | "FAMILY_MEMBER";
  performance?: any;
}

export interface NegotiationOfferPayload {
  primeSignature: number;
  seasonSalary: number;
  contractSeasonsLeft: number;
  squadRole?: string;
  releaseClause?: number | null;
  goalBonus?: number;
  cleanSheetBonus?: number;
  trophyBonus?: number;
}

export interface NegotiationEvaluationParams {
  demands: ContractDemandsPayload;
  offer: NegotiationOfferPayload;
  previousOffers?: NegotiationOfferPayload[];
  currentPatience?: number;
  playerLeverage?: number;
  playerAge?: number;
  clubPrestige?: number;
  clubUrgency?: boolean | number;
  rivalOffersCount?: number;
  isHomegrownOrLoyal?: boolean;
  hiddenDealBreaker?: "MUST_HAVE_RELEASE_CLAUSE" | "MAX_2_YEARS" | "HIGH_BONUS" | "NO_BENCH_ROLE" | null;
  agentPersonality?: "SHARK" | "PRAGMATIST" | "LOYALIST" | "FAMILY_MEMBER";
}

export interface NegotiationEngineResult {
  status: "ACCEPTED" | "COUNTER" | "BREAKDOWN";
  agentPatience: number;
  agentMood: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  agentMessage: string;
  isUltimatum?: boolean;
  counterDemands?: Partial<NegotiationOfferPayload>;
  evaluation: {
    offerScore: number;
    breakdown?: {
      salaryScore: number;
      bonusScore: number;
      incentiveScore?: number;
      lengthScore: number;
      clauseScore: number;
    };
    prestigeFactor?: number;
    urgencyActive?: boolean;
    rivalsCompeting?: number;
    hypocrisyDetected?: boolean;
    wonderkidRuleActive?: boolean;
    dealBreakerTriggered?: boolean;
    crossCompensationApplied?: boolean;
    breakdownReason?: string;
    appliedPrestigeTax?: boolean;
    prestigeDiscountApplied?: boolean;
    loyaltyDiscountApplied?: boolean;
  };
}

export class NegotiationMathEngine {
  static WEIGHTS = {
    SALARY: 0.45,
    SIGNING_BONUS: 0.25,
    PERFORMANCE_BONUSES: 0.10,
    LENGTH: 0.12,
    RELEASE_CLAUSE: 0.08,
  };

  static BONUS_TO_SALARY_UTILITY = 0.85;
  static SALARY_TO_BONUS_UTILITY = 0.70;
  static PERFORMANCE_BONUS_REALIZATION_RATE = 0.60;

  static INSULT_THRESHOLD = 0.52;
  static MICRO_INCREASE_THRESHOLD = 0.025; // 2.5%
  static MICRO_INCREASE_MAX_COUNT = 2;

  /**
   * Evaluates a contract offer submitted by the manager against agent demands.
   */
  static evaluateOffer(params: NegotiationEvaluationParams): NegotiationEngineResult {
    const {
      demands,
      offer,
      previousOffers = [],
      currentPatience = 3,
      playerLeverage = 1.0,
      playerAge = 25,
      clubPrestige = 50,
      clubUrgency = false,
      rivalOffersCount = 0,
      isHomegrownOrLoyal = false,
      hiddenDealBreaker = null,
      agentPersonality = demands.agentPersonality || "PRAGMATIST",
    } = params;

    // ── 1. INPUT NORMALIZATION ────────────────────────────────────────────────
    const leverage = Math.max(0.4, Math.min(2.4, Number(playerLeverage) || 1.0));
    const age = Math.max(15, Math.min(42, Number(playerAge) || 25));
    const prestige = Math.max(1, Math.min(100, Number(clubPrestige) || 50));
    const urgency = typeof clubUrgency === "number"
      ? Math.max(0, Math.min(1, clubUrgency))
      : (clubUrgency ? 1.0 : 0.0);
    const rivals = Math.max(0, Math.min(5, Number(rivalOffersCount) || 0));
    const personality = this._getPersonalityProfile(agentPersonality);
    const isUltimatumRound = currentPatience <= 1;

    // ── 2. PRESTIGE, RIVAL & LOYALTY MODIFIERS ─────────────────────────────────
    let prestigeFactor = prestige >= 50
      ? 1.0 - ((prestige - 50) / 50) * 0.10
      : 1.0 + ((50 - prestige) / 50) * 0.20;

    const loyaltyDiscount = isHomegrownOrLoyal ? 0.88 : 1.0;
    const rivalDemandMultiplier = 1.0 + (rivals * 0.055);

    const effectiveDemands: ContractDemandsPayload = {
      ...demands,
      seasonSalary: Math.round(demands.seasonSalary * prestigeFactor * loyaltyDiscount * rivalDemandMultiplier),
      primeSignature: Math.round(demands.primeSignature * (urgency > 0 ? (1 + urgency * 0.12) : prestigeFactor) * rivalDemandMultiplier),
      goalBonus: demands.goalBonus || 0,
      cleanSheetBonus: demands.cleanSheetBonus || 0,
      trophyBonus: demands.trophyBonus || 0,
    };

    // ── 3. HYPOCRISY & AGE ARCHETYPE EVALUATIONS ──────────────────────────────
    const hypocrisyCheck = this._detectHypocrisy(offer, effectiveDemands);
    const isWonderkid = age <= 21 && leverage >= 1.05;
    const isVeteran = age >= 32;
    const wonderkidCheck = this._checkWonderkidAmbition(isWonderkid, offer, demands);
    const dealBreakerCheck = this._checkDealBreaker(hiddenDealBreaker, offer, effectiveDemands);

    // ── 4. INSTANT INSULT & LOWBALL PUNISHER ───────────────────────────────────
    const packageMetrics = this._calculateTotalPackage(offer, effectiveDemands);
    const rawRatio = packageMetrics.offerTotal / Math.max(1, packageMetrics.demandsTotal);
    const adjustedInsultFloor = this.INSULT_THRESHOLD * (1 + (leverage - 1.0) * 0.18 + rivals * 0.04 + urgency * 0.06);

    if (rawRatio < adjustedInsultFloor) {
      return {
        status: "BREAKDOWN",
        agentPatience: 0,
        agentMood: "ANGRY",
        agentMessage: rivals > 0
          ? `عرض مهين ومخجل! لدينا ${rivals} عروض رسمية جاهزة تفوق هذا الرقم بكثير. المفاوضات معكم انتهت نهائياً!`
          : (prestige < 40
              ? "عرض ضعيف لا يليق بلاعب محترف. تلعبون على تفادي الهبوط وتعرضون هذه الفتات؟ لن نوقع معكم أبداً!"
              : "هذا العرض استخفاف صارخ بقيمة اللاعب ومكانته. موكلي يرفض إكمال أي جلسة معكم. انتهت المفاوضات!"),
        evaluation: {
          offerScore: Math.round(rawRatio * 100),
          breakdownReason: "INSULTING_LOWBALL",
        },
      };
    }

    if (wonderkidCheck.fatal) {
      return {
        status: "BREAKDOWN",
        agentPatience: 0,
        agentMood: "ANGRY",
        agentMessage: wonderkidCheck.message!,
        evaluation: {
          offerScore: Math.round(rawRatio * 100),
          breakdownReason: "WONDERKID_EUROPEAN_AMBITION_BLOCKED",
        },
      };
    }

    // ── 5. TIME-WASTING / MICRO-INCREMENT CHECK ───────────────────────────────
    const timeWasting = this._detectTimeWasting(offer, previousOffers);
    if (timeWasting.isWasting) {
      const remainingPatience = Math.max(0, currentPatience - 2);
      if (remainingPatience <= 0) {
        return {
          status: "BREAKDOWN",
          agentPatience: 0,
          agentMood: "ANGRY",
          agentMessage: urgency > 0
            ? "نافذة الانتقالات تغلق وأنتم تماطلون بزيادات رمزية بائسة! لن نكون لعبة في يدكم، انتهت المفاوضات!"
            : "هذا أسلوب تفاوضي غير جاد بإضافة مبالغ تافهة في كل جولة. موكلي يرفض التعامل معكم مجدداً!",
          evaluation: {
            offerScore: Math.round(rawRatio * 100),
            breakdownReason: "TIME_WASTING_MICRO_BUMPS",
          },
        };
      }
    }

    // ── 6. NEGOTIATION MOMENTUM ANALYSIS ──────────────────────────────────────
    const momentum = this._analyzeMomentum(offer, previousOffers, effectiveDemands);

    // ── 7. MULTI-FACTOR UTILITY SCORING ───────────────────────────────────────
    const scoreResult = this._scoreOffer({
      offer,
      demands: effectiveDemands,
      urgency,
      isVeteran,
      personality,
      hypocrisyPenalty: hypocrisyCheck.penalty,
      wonderkidPenalty: wonderkidCheck.penalty,
      dealBreakerPenalty: dealBreakerCheck.penalty,
      momentumBonus: momentum.scoreBonus,
    });
    const finalScore = scoreResult.totalScore;

    let baseAcceptThreshold = 0.90;
    if (isHomegrownOrLoyal) baseAcceptThreshold -= 0.04;
    if (rivals > 0) baseAcceptThreshold += (rivals * 0.025);
    if (urgency > 0) baseAcceptThreshold += (urgency * 0.035);

    const acceptanceThreshold = Math.min(
      0.97,
      Math.max(0.79, baseAcceptThreshold + (leverage - 1.0) * 0.08 + personality.thresholdShift)
    );

    // ── CASE A: ACCEPTED ──────────────────────────────────────────────────────
    if (finalScore >= acceptanceThreshold && !dealBreakerCheck.violated && !hypocrisyCheck.isHypocrisy) {
      let acceptMessage = "عرض ممتاز ومحترم يفي بكافة شروطنا المالية والرياضية. نحن جاهزون لتوقيع العقد فوراً! 🤝";
      if (isHomegrownOrLoyal) {
        acceptMessage = "ابن النادي يعود لبيته! وافقنا على العرض محبةً في قميص الفريق وجماهيره الوفية. مستعدون للتوقيع فوراً! 🤝❤️";
      } else if (prestige >= 75) {
        acceptMessage = "المشروع الرياضي لناديكم وتاريخه الكبير حسما القرار. موكلي فخور بالانضمام إليكم ومستعد للتوقيع! 🤝🏆";
      }

      return {
        status: "ACCEPTED",
        agentPatience: currentPatience,
        agentMood: "HAPPY",
        agentMessage: acceptMessage,
        evaluation: {
          offerScore: Math.round(finalScore * 100),
          appliedPrestigeTax: prestige < 45,
          prestigeDiscountApplied: prestige >= 65,
          loyaltyDiscountApplied: isHomegrownOrLoyal,
          crossCompensationApplied: scoreResult.crossCompensationApplied,
        },
      };
    }

    // ── CASE B: BREAKDOWN / PATIENCE DRAIN ────────────────────────────────────
    // If currentPatience <= 0, negotiations are already dead
    if (currentPatience <= 0) {
      return {
        status: "BREAKDOWN",
        agentPatience: 0,
        agentMood: "ANGRY",
        agentMessage: rivals > 0
          ? `بينما كنتم تترددون، اتفقنا مبدئياً مع أحد الأندية المنافسة التي قدرت قيمة اللاعب. المفاوضات أُغلقت!`
          : "استنفذتم جميع الفرص ولم تقدموا عرضاً مقنعاً. موكلي سيتجه نحو عروض أخرى أكثر جدية!",
        evaluation: {
          offerScore: Math.round(finalScore * 100),
          breakdownReason: "PATIENCE_EXHAUSTED",
        },
      };
    }

    // Determine next patience
    let nextPatience = currentPatience;
    if (isUltimatumRound) {
      // In the ultimatum round (patience === 1), agent holds the line with the non-negotiable Redline Demand
      nextPatience = 1;
    } else {
      let patienceDrain = 1;
      if (timeWasting.isWasting) patienceDrain += 1;
      if (dealBreakerCheck.violated) patienceDrain += 1;
      if (hypocrisyCheck.isHypocrisy) patienceDrain += 1;
      if (rivals >= 2) patienceDrain += 1;
      nextPatience = Math.max(1, currentPatience - patienceDrain);
    }

    // ── CASE C: DYNAMIC COUNTER-OFFER / ULTIMATUM ─────────────────────────────
    let counterOffer: Partial<NegotiationOfferPayload>;
    let isRedlineUltimatum = false;

    if (isUltimatumRound) {
      counterOffer = this._generateRedlineUltimatum({
        demands: effectiveDemands,
        offer,
        urgency,
        leverage,
        isWonderkid,
        hiddenDealBreaker,
      });
      isRedlineUltimatum = true;
    } else {
      counterOffer = this._generateAdaptiveCounter({
        demands: effectiveDemands,
        offer,
        leverage,
        urgency,
        rivals,
        isWonderkid,
        isVeteran,
        hiddenDealBreaker,
        personality,
        scoreBreakdown: scoreResult.breakdown,
        patience: nextPatience,
        momentumPositive: momentum.isPositive,
      });
    }

    const isClose = finalScore >= (acceptanceThreshold - 0.11);
    const agentMood = (isRedlineUltimatum || hypocrisyCheck.isHypocrisy || dealBreakerCheck.violated) 
      ? "ANGRY" 
      : (isClose ? "NEUTRAL" : "FRUSTRATED");

    const agentMessage = this._craftFeedbackMessage({
      isUltimatum: isRedlineUltimatum,
      urgency,
      prestige,
      rivals,
      isClose,
      isHomegrown: isHomegrownOrLoyal,
      hypocrisyMsg: hypocrisyCheck.isHypocrisy ? hypocrisyCheck.message : null,
      wonderkidMsg: wonderkidCheck.message,
      dealBreakerHint: dealBreakerCheck.violated ? dealBreakerCheck.hint : null,
      momentumMsg: momentum.dialogueNotice,
      counterOffer,
      nextPatience,
      timeWastingWarn: timeWasting.warnMicro,
    });

    return {
      status: "COUNTER",
      agentPatience: nextPatience,
      agentMood,
      agentMessage,
      isUltimatum: isRedlineUltimatum,
      counterDemands: counterOffer,
      evaluation: {
        offerScore: Math.round(finalScore * 100),
        breakdown: scoreResult.breakdown,
        prestigeFactor: Number(prestigeFactor.toFixed(2)),
        urgencyActive: urgency > 0,
        rivalsCompeting: rivals,
        hypocrisyDetected: hypocrisyCheck.isHypocrisy,
        wonderkidRuleActive: isWonderkid,
        dealBreakerTriggered: dealBreakerCheck.violated,
        crossCompensationApplied: scoreResult.crossCompensationApplied,
      },
    };
  }

  // ── PRIVATE MATHEMATICAL SUBROUTINES ───────────────────────────────────────

  static _scoreOffer({
    offer,
    demands,
    urgency,
    isVeteran,
    personality,
    hypocrisyPenalty,
    wonderkidPenalty,
    dealBreakerPenalty,
    momentumBonus,
  }: {
    offer: NegotiationOfferPayload;
    demands: ContractDemandsPayload;
    urgency: number;
    isVeteran: boolean;
    personality: any;
    hypocrisyPenalty: number;
    wonderkidPenalty: number;
    dealBreakerPenalty: number;
    momentumBonus: number;
  }) {
    const years = Math.max(1, offer.contractSeasonsLeft || demands.contractSeasonsLeft || 1);
    
    let rawSalaryRatio = offer.seasonSalary / Math.max(1, demands.seasonSalary);
    let rawBonusRatio = offer.primeSignature / Math.max(1, demands.primeSignature);
    let crossCompApplied = false;

    // 1. Cross-compensation
    const salaryDeficit = Math.max(0, demands.seasonSalary - offer.seasonSalary);
    const bonusSurplus = Math.max(0, offer.primeSignature - demands.primeSignature);

    if (salaryDeficit > 0 && bonusSurplus > 0) {
      const annualizedBonusUtility = (bonusSurplus * this.BONUS_TO_SALARY_UTILITY) / years;
      const salaryCovered = Math.min(salaryDeficit, annualizedBonusUtility);
      rawSalaryRatio = (offer.seasonSalary + salaryCovered) / demands.seasonSalary;
      crossCompApplied = true;
    } else if (offer.seasonSalary > demands.seasonSalary && offer.primeSignature < demands.primeSignature) {
      const archetypeResistance = personality.name === "SHARK" ? 0.40 : 1.0;
      const urgencyResistance = (1.0 - (urgency * 0.45));
      const bonusDeficit = demands.primeSignature - offer.primeSignature;
      const totalSalarySurplus = (offer.seasonSalary - demands.seasonSalary) * years;
      const bonusCovered = Math.min(bonusDeficit, totalSalarySurplus * this.SALARY_TO_BONUS_UTILITY * urgencyResistance * archetypeResistance);
      rawBonusRatio = (offer.primeSignature + bonusCovered) / demands.primeSignature;
      crossCompApplied = true;
    }

    // 2. Performance Bonuses Valuation (EV)
    const offerBonusEV = (
      (offer.goalBonus || 0) +
      (offer.cleanSheetBonus || 0) +
      (offer.trophyBonus || 0)
    ) * this.PERFORMANCE_BONUS_REALIZATION_RATE;

    const demandBonusEV = (
      (demands.goalBonus || 0) +
      (demands.cleanSheetBonus || 0) +
      (demands.trophyBonus || 0)
    ) * this.PERFORMANCE_BONUS_REALIZATION_RATE;

    const bonusRatio = demandBonusEV > 0 
      ? Math.min(1.30, offerBonusEV / demandBonusEV) 
      : (offerBonusEV > 0 ? 1.15 : 1.0);

    // 3. Release Clause Alignment
    let clauseScore = 1.0;
    if (demands.releaseClause && demands.releaseClause > 0) {
      if (!offer.releaseClause) {
        clauseScore = 0.65;
      } else {
        const clauseRatio = offer.releaseClause / demands.releaseClause;
        clauseScore = clauseRatio > 1.4 ? Math.max(0.70, 1.0 - (clauseRatio - 1.0) * 0.18) : 1.05;
      }
    }

    // 4. Contract Length Alignment
    const lengthDiff = offer.contractSeasonsLeft - demands.contractSeasonsLeft;
    let lengthScore = 1.0;
    if (isVeteran) {
      lengthScore = lengthDiff < 0 ? Math.max(0.60, 1.0 + lengthDiff * 0.22) : Math.min(1.15, 1.0 + lengthDiff * 0.08);
    } else {
      lengthScore = lengthDiff < 0 ? Math.max(0.68, 1.0 + lengthDiff * 0.16) : Math.min(1.08, 1.0 + lengthDiff * 0.04);
    }

    // 5. Total Weighted Scoring
    const weights = this.WEIGHTS;
    let totalScore = (
      (Math.min(1.25, rawSalaryRatio) * weights.SALARY) +
      (Math.min(1.30, rawBonusRatio) * weights.SIGNING_BONUS) +
      (bonusRatio * weights.PERFORMANCE_BONUSES) +
      (lengthScore * weights.LENGTH) +
      (clauseScore * weights.RELEASE_CLAUSE)
    );

    const totalPenalties = hypocrisyPenalty + wonderkidPenalty + dealBreakerPenalty;
    totalScore = Math.max(0.20, (totalScore * (1.0 - totalPenalties)) + momentumBonus);

    return {
      totalScore,
      crossCompensationApplied: crossCompApplied,
      breakdown: {
        salaryScore: Math.round(rawSalaryRatio * 100),
        bonusScore: Math.round(rawBonusRatio * 100),
        incentiveScore: Math.round(bonusRatio * 100),
        lengthScore: Math.round(lengthScore * 100),
        clauseScore: Math.round(clauseScore * 100),
      },
    };
  }

  static _generateRedlineUltimatum({
    demands,
    offer,
    urgency,
    leverage,
    isWonderkid,
    hiddenDealBreaker,
  }: {
    demands: ContractDemandsPayload;
    offer: NegotiationOfferPayload;
    urgency: number;
    leverage: number;
    isWonderkid: boolean;
    hiddenDealBreaker: string | null;
  }): Partial<NegotiationOfferPayload> {
    const redline = { ...demands };
    const slack = (0.022 / leverage);

    redline.seasonSalary = Math.round(demands.seasonSalary * (1 - slack));

    if (urgency > 0 || hiddenDealBreaker === "HIGH_BONUS") {
      redline.primeSignature = Math.round(demands.primeSignature);
    } else {
      redline.primeSignature = Math.round(demands.primeSignature * (1 - slack));
    }

    if (isWonderkid || hiddenDealBreaker === "MUST_HAVE_RELEASE_CLAUSE") {
      redline.releaseClause = demands.releaseClause || Math.round(demands.seasonSalary * 3.5);
    }

    if (hiddenDealBreaker === "MAX_2_YEARS") {
      redline.contractSeasonsLeft = Math.min(2, demands.contractSeasonsLeft);
    }

    redline.seasonSalary = Math.round(redline.seasonSalary / 1000) * 1000;
    redline.primeSignature = Math.round(redline.primeSignature / 1000) * 1000;

    return redline;
  }

  static _generateAdaptiveCounter({
    demands,
    offer,
    leverage,
    urgency,
    rivals,
    isWonderkid,
    isVeteran,
    hiddenDealBreaker,
    personality,
    scoreBreakdown,
    patience,
    momentumPositive,
  }: {
    demands: ContractDemandsPayload;
    offer: NegotiationOfferPayload;
    leverage: number;
    urgency: number;
    rivals: number;
    isWonderkid: boolean;
    isVeteran: boolean;
    hiddenDealBreaker: string | null;
    personality: any;
    scoreBreakdown: any;
    patience: number;
    momentumPositive: boolean;
  }): Partial<NegotiationOfferPayload> {
    const rivalConcessionBrake = Math.max(0.40, 1.0 - (rivals * 0.20));
    const momentumMultiplier = momentumPositive ? 1.25 : 1.0;
    const baseConcession = (0.07 / leverage) * personality.concessionFactor * rivalConcessionBrake * momentumMultiplier;
    const finalConcession = Math.min(0.18, baseConcession * (patience === 1 ? 1.4 : 1.0));

    const counter = { ...demands };

    if (personality.name === "SHARK" || urgency > 0.4 || hiddenDealBreaker === "HIGH_BONUS") {
      counter.primeSignature = demands.primeSignature;
      const salaryGap = demands.seasonSalary - offer.seasonSalary;
      counter.seasonSalary = Math.round(demands.seasonSalary - (salaryGap * (finalConcession * 0.5)));
    } else {
      const salaryGap = demands.seasonSalary - offer.seasonSalary;
      const bonusGap = demands.primeSignature - offer.primeSignature;

      if (scoreBreakdown.salaryScore >= 95 && scoreBreakdown.bonusScore < 85) {
        counter.seasonSalary = Math.round(Math.max(offer.seasonSalary, demands.seasonSalary * (1 - finalConcession * 0.4)));
        counter.primeSignature = Math.round(offer.primeSignature + bonusGap * (0.60 * leverage));
      } else {
        counter.seasonSalary = Math.round(demands.seasonSalary - (salaryGap * finalConcession));
        counter.primeSignature = Math.round(demands.primeSignature - (bonusGap * finalConcession));
      }
    }

    if (isWonderkid || hiddenDealBreaker === "MUST_HAVE_RELEASE_CLAUSE") {
      counter.releaseClause = demands.releaseClause || Math.round(demands.seasonSalary * 3.5);
    }

    if (hiddenDealBreaker === "MAX_2_YEARS") {
      counter.contractSeasonsLeft = Math.min(2, demands.contractSeasonsLeft);
    }

    if (isVeteran && offer.contractSeasonsLeft < demands.contractSeasonsLeft) {
      counter.contractSeasonsLeft = demands.contractSeasonsLeft;
    }

    counter.seasonSalary = Math.round(counter.seasonSalary / 1000) * 1000;
    counter.primeSignature = Math.round(counter.primeSignature / 1000) * 1000;

    return counter;
  }

  static _detectHypocrisy(offer: NegotiationOfferPayload, demands: ContractDemandsPayload) {
    const roleHierarchy: Record<string, number> = { KEY: 4, IMPORTANT: 3, SQUAD: 2, PROSPECT: 1 };
    const offeredRoleRank = roleHierarchy[offer.squadRole || ""] || 2;
    const demandedRoleRank = roleHierarchy[demands.squadRole || ""] || 3;
    const salaryRatio = offer.seasonSalary / Math.max(1, demands.seasonSalary);

    if (offeredRoleRank >= 3 && offeredRoleRank > demandedRoleRank && salaryRatio < 0.75) {
      return {
        isHypocrisy: true,
        penalty: 0.22,
        message: `أنت تعرض على موكلي دور "${offer.squadRole === "KEY" ? "نجم الفريق الأول (Key Player)" : "لاعب أساسي"}" براتب لاعب احتياطي! هل تظننا أغبياء؟`,
      };
    }

    if (offeredRoleRank === 4 && salaryRatio < 0.70) {
      return {
        isHypocrisy: true,
        penalty: 0.25,
        message: `دور نجم الفريق يتطلب راتباً يليق بنجم الفريق! لا يمكن أن تحمّل موكلي مسؤولية النادي براتب منخفض كهذا.`,
      };
    }

    return { isHypocrisy: false, penalty: 0.0, message: null };
  }

  static _checkWonderkidAmbition(isWonderkid: boolean, offer: NegotiationOfferPayload, demands: ContractDemandsPayload) {
    if (!isWonderkid) return { fatal: false, penalty: 0.0, message: null };
    const baselineClause = demands.releaseClause || (demands.seasonSalary * 4);

    if (!offer.releaseClause) {
      return {
        fatal: true,
        penalty: 1.0,
        message: `موكلي موهبة صاعدة ولديه طموح الاحتراف الأوروبي. إزالة الشرط الجزائي تعني حبس مستقبله، ولن نوقع معكم بدون شرط جزائي يضمن خروجه لأوروبا بأي ثمن!`,
      };
    }

    if (offer.releaseClause > baselineClause * 2.0) {
      return {
        fatal: false,
        penalty: 0.28,
        message: `الشرط الجزائي المعروض (${offer.releaseClause.toLocaleString("fr-MA")} €) مبالغ فيه ويهدف لتقييد موكلي. لن نقبل بمبلغ تعجيزي يمنع الأندية الأوروبية من ضمه!`,
      };
    }

    return { fatal: false, penalty: 0.0, message: null };
  }

  static _checkDealBreaker(hiddenDealBreaker: string | null, offer: NegotiationOfferPayload, demands: ContractDemandsPayload) {
    if (!hiddenDealBreaker) return { violated: false, penalty: 0.0, hint: null };

    switch (hiddenDealBreaker) {
      case "MUST_HAVE_RELEASE_CLAUSE":
        if (!offer.releaseClause) {
          return {
            violated: true,
            penalty: 0.25,
            hint: "نحن لا نهتم بتفاصيل الراتب بقدر ما نصرّ بشكل قاطع على وجود شرط جزائي لحماية اللاعب...",
          };
        }
        break;

      case "MAX_2_YEARS":
        if (offer.contractSeasonsLeft > 2) {
          return {
            violated: true,
            penalty: 0.25,
            hint: "مدة العقد الطويلة غير مقبولة تماماً لموكلي في هذه المرحلة من مسيرته...",
          };
        }
        break;

      case "HIGH_BONUS":
        if (offer.primeSignature < demands.primeSignature * 0.90) {
          return {
            violated: true,
            penalty: 0.22,
            hint: "السيولة الفورية ومنحة التوقيع هي أولويتنا الأولى، ولن نتساهل في قيمتها...",
          };
        }
        break;

      case "NO_BENCH_ROLE":
        if (offer.squadRole === "SQUAD" || offer.squadRole === "PROSPECT") {
          return {
            violated: true,
            penalty: 0.28,
            hint: "موكلي يرفض الجلوس على دكة البدلاء، دوره في الملعب خط أحمر لا نقاش فيه...",
          };
        }
        break;
    }

    return { violated: false, penalty: 0.0, hint: null };
  }

  static _analyzeMomentum(
    currentOffer: NegotiationOfferPayload,
    previousOffers: NegotiationOfferPayload[],
    demands: ContractDemandsPayload
  ) {
    if (!previousOffers || previousOffers.length < 1) {
      return { isPositive: false, scoreBonus: 0.0, dialogueNotice: null };
    }

    const lastOffer = previousOffers[previousOffers.length - 1];
    const prevSalaryGap = demands.seasonSalary - lastOffer.seasonSalary;
    const currentSalaryGap = demands.seasonSalary - currentOffer.seasonSalary;
    const closedGap = prevSalaryGap - currentSalaryGap;

    if (prevSalaryGap > 0 && (closedGap / prevSalaryGap) >= 0.35) {
      return {
        isPositive: true,
        scoreBonus: 0.04,
        dialogueNotice: "نلاحظ رغبتكم الحقيقية في التوصل لحل بتقديم قفزة إيجابية في الأرقام، وهذا يشجعنا على المرونة معكم.",
      };
    }

    return { isPositive: false, scoreBonus: 0.0, dialogueNotice: null };
  }

  static _detectTimeWasting(
    currentOffer: NegotiationOfferPayload,
    previousOffers: NegotiationOfferPayload[]
  ) {
    if (!previousOffers || previousOffers.length < 1) {
      return { isWasting: false, warnMicro: false };
    }

    const lastOffer = previousOffers[previousOffers.length - 1];
    const prevTotal = (lastOffer.seasonSalary * (lastOffer.contractSeasonsLeft || 1)) + lastOffer.primeSignature;
    const currTotal = (currentOffer.seasonSalary * (currentOffer.contractSeasonsLeft || 1)) + currentOffer.primeSignature;

    const delta = currTotal - prevTotal;
    if (delta <= 0) return { isWasting: true, warnMicro: false, reason: "REGRESSIVE" };

    const percentageDelta = prevTotal > 0 ? (delta / prevTotal) : 0;
    const isMicro = percentageDelta < this.MICRO_INCREASE_THRESHOLD && delta < 500;

    if (isMicro) {
      if (previousOffers.length >= 2) {
        const secondLast = previousOffers[previousOffers.length - 2];
        const secondLastTotal = (secondLast.seasonSalary * (secondLast.contractSeasonsLeft || 1)) + secondLast.primeSignature;
        if ((prevTotal - secondLastTotal) / secondLastTotal < this.MICRO_INCREASE_THRESHOLD) {
          return { isWasting: true, warnMicro: true };
        }
      }
      return { isWasting: false, warnMicro: true };
    }

    return { isWasting: false, warnMicro: false };
  }

  static _calculateTotalPackage(offer: NegotiationOfferPayload, demands: ContractDemandsPayload) {
    const offerTotal = (offer.seasonSalary * Math.max(1, offer.contractSeasonsLeft || 1)) + (offer.primeSignature || 0);
    const demandsTotal = (demands.seasonSalary * Math.max(1, demands.contractSeasonsLeft || 1)) + (demands.primeSignature || 0);
    return { offerTotal, demandsTotal };
  }

  static _craftFeedbackMessage({
    isUltimatum,
    urgency,
    prestige,
    rivals,
    isClose,
    isHomegrown,
    hypocrisyMsg,
    wonderkidMsg,
    dealBreakerHint,
    momentumMsg,
    counterOffer,
    nextPatience,
    timeWastingWarn,
  }: {
    isUltimatum: boolean;
    urgency: number;
    prestige: number;
    rivals: number;
    isClose: boolean;
    isHomegrown: boolean;
    hypocrisyMsg: string | null;
    wonderkidMsg: string | null;
    dealBreakerHint: string | null;
    momentumMsg: string | null;
    counterOffer: Partial<NegotiationOfferPayload>;
    nextPatience: number;
    timeWastingWarn: boolean;
  }) {
    if (timeWastingWarn) {
      return `تحذير شديد: هذه الزيادات الميكروسكوبية إهانة لوقتنا! قدموا عرضاً حقيقياً أو ننسحب فوراً من القاعة!`;
    }

    if (hypocrisyMsg) return `${hypocrisyMsg} (فرص متبقية: ${nextPatience})`;
    if (dealBreakerHint) return `${dealBreakerHint} عدّلوا شروطكم وفق ذلك إن أردتم إتمام الصفقة. (فرص متبقية: ${nextPatience})`;
    if (wonderkidMsg) return `${wonderkidMsg} (فرص متبقية: ${nextPatience})`;

    if (isUltimatum) {
      return `🚨 إنذار نهائي (Take It or Leave It): هذا هو عرضنا الأخير غير القابل للنقاش (${counterOffer.seasonSalary?.toLocaleString("fr-MA")} € راتب / ${counterOffer.primeSignature?.toLocaleString("fr-MA")} € منحة). إما التوقيع الفوري أو نغادر طاولة المفاوضات نهائياً!`;
    }

    if (rivals > 0) {
      return `⚠️ تنبيه هام: لدينا ${rivals} أندية منافسة تضغط للتعاقد مع موكلي وتقدم أرقاماً متفوقة. لن نخفض مطالبنا عن (${counterOffer.seasonSalary?.toLocaleString("fr-MA")} € راتب / ${counterOffer.primeSignature?.toLocaleString("fr-MA")} € منحة). احسموا موقفكم قبل أن يختار نادياً آخر! (فرص: ${nextPatience})`;
    }

    if (urgency > 0.5) {
      return `⏳ نعلم جيداً ضيق الوقت واقتراب إغلاق نافذة الانتقالات وحاجتكم الماسة للاعب! لن نتنازل عن منحة التوقيع (${counterOffer.primeSignature?.toLocaleString("fr-MA")} €). ادفعوها لحسم الصفقة قبل فوات الأوان! (فرص: ${nextPatience})`;
    }

    if (momentumMsg) {
      return `${momentumMsg} عرضنا المعدل هو: ${counterOffer.seasonSalary?.toLocaleString("fr-MA")} € راتب سنوي. (فرص متبقية: ${nextPatience})`;
    }

    if (isHomegrown) {
      return `موكلي يقدر علاقته التاريخية مع هذا النادي وجماهيره العريضة، لكنه يطلب تقديراً عادلاً: ${counterOffer.seasonSalary?.toLocaleString("fr-MA")} € سنوياً لإنهاء الاتفاق ودياً. (فرص متبقية: ${nextPatience})`;
    }

    if (prestige < 38) {
      return `موكلي يقبل التحدي رغم وضعية النادي الصعبة، لكنه يطلب تعويضاً مالياً عادلاً يغطي مخاطرة الهبوط: ${counterOffer.seasonSalary?.toLocaleString("fr-MA")} € سنوياً كحد أدنى. (فرص: ${nextPatience})`;
    }

    if (isClose) {
      return `نحن على بُعد خطوة صغيرة من الاتفاق. قدمنا هذا التنازل الوسطي (${counterOffer.seasonSalary?.toLocaleString("fr-MA")} € راتب / ${counterOffer.primeSignature?.toLocaleString("fr-MA")} € منحة) لحسم الأمور ودياً. (فرص متبقية: ${nextPatience})`;
    }

    return `العرض لا يزال بعيداً عن تطلعات اللاعب. راجعنا الأرقام وهذا هو الحد المقبول للتفاوض: ${counterOffer.seasonSalary?.toLocaleString("fr-MA")} € راتب سنوي. (فرص متبقية: ${nextPatience})`;
  }

  static _getPersonalityProfile(personality: string) {
    switch (personality) {
      case "SHARK":
        return { name: "SHARK", concessionFactor: 0.60, thresholdShift: 0.04 };
      case "FAMILY_MEMBER":
        return { name: "FAMILY_MEMBER", concessionFactor: 0.85, thresholdShift: 0.02 };
      case "LOYALIST":
        return { name: "LOYALIST", concessionFactor: 1.35, thresholdShift: -0.04 };
      case "PRAGMATIST":
      default:
        return { name: "PRAGMATIST", concessionFactor: 1.00, thresholdShift: 0.00 };
    }
  }
}
