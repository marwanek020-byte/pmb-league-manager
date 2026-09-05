/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PMB LEAGUE MANAGER — STADIUM ECONOMY ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure JavaScript / TypeScript economic simulation modeling matchday revenues,
 * ticket price elasticity, VIP prestige dynamics, and exponential operating costs
 * ("The Big Stadium Trap") for the Moroccan Botola Pro.
 */

export interface StadiumVenueInfo {
  stadium: string;
  capacity: number;
}

export type MatchImportance = "regular" | "derby" | "decider";

export interface UltrasReactionResult {
  isBoycotting: boolean;
  communiqueString: string | null;
}

export interface MatchdayEconomyInput {
  clubIdentifier: string;
  standardPrice: number;
  vipPrice: number;
  teamForm: number; // 1 to 10
  matchImportance: MatchImportance;
  clubPrestige: number; // 1 to 100
  isBoycotting?: boolean;
  isThroneCupMatch?: boolean;
}

export interface MatchdayEconomyResult {
  club: string;
  stadium: string;
  capacities: {
    total: number;
    standard: number;
    vip: number;
  };
  attendance: {
    standard: number;
    vip: number;
    total: number;
    occupancyRatePercent: number;
    isSoldOut: boolean;
    isBoycotted: boolean;
  };
  finances: {
    ticketPrices: {
      standard: number;
      vip: number;
    };
    revenue: {
      standard: number;
      vip: number;
      grossTotal: number;
      cupBonus: number;
    };
    operatingCost: number;
    netProfit: number;
    isProfitable: boolean;
  };
  diagnostics: {
    formIndex: number;
    prestigeIndex: number;
    matchImportance: MatchImportance;
    bigStadiumTrapRisk: boolean;
    breakEvenStandardAttendance: number;
    isBoycotting: boolean;
  };
}

export class StadiumEconomyEngine {
  /**
   * Official 16 Botola Pro clubs, home stadiums, and certified capacities.
   * VIP capacity is dynamically derived as exactly 5% of total capacity for all venues.
   */
  static readonly BOTOLA_STADIUM_REGISTRY: Record<string, StadiumVenueInfo> = Object.freeze({
    "Raja Casablanca": {
      stadium: "Stade Mohammed V",
      capacity: 45891,
    },
    "Wydad AC": {
      stadium: "Stade Mohammed V",
      capacity: 45891,
    },
    "FAR Rabat": {
      stadium: "Stade Prince Moulay Abdellah",
      capacity: 53000,
    },
    "FUS Rabat": {
      stadium: "Stade Moulay Hassan",
      capacity: 12000,
    },
    "Maghreb Fez": {
      stadium: "Grand Stade de Fès",
      capacity: 45000,
    },
    "Berkane": {
      stadium: "Stade Municipal de Berkane",
      capacity: 10000,
    },
    "IR Tanger": {
      stadium: "Grand Stade de Tanger",
      capacity: 65000,
    },
    "Hassania Agadir": {
      stadium: "Grand Stade d'Agadir",
      capacity: 45480,
    },
    "Olympique Safi": {
      stadium: "Stade El Massira",
      capacity: 15000,
    },
    "Difaa El Jadidi": {
      stadium: "Stade El Abdi",
      capacity: 15000,
    },
    "Kawkab Marrakech": {
      stadium: "Grand Stade de Marrakech",
      capacity: 45240,
    },
    "COD Meknes": {
      stadium: "Stade d'Honneur de Meknès",
      capacity: 20000,
    },
    "Renaissance Zemamra": {
      stadium: "Stade Ahmed Choukri",
      capacity: 5000,
    },
    "Union Touarga": {
      stadium: "Stade Moulay Hassan",
      capacity: 12000,
    },
    "Dcheira": {
      stadium: "Stade Ahmed Fana",
      capacity: 5000,
    },
    "Yacoub El Mansour": {
      stadium: "Stade Municipal de Yacoub El Mansour",
      capacity: 5000,
    },
  });

  // VIP allotment across all venues (5%)
  static readonly VIP_CAPACITY_PERCENTAGE = 0.05;

  // Benchmark reference points for elasticity modeling
  static readonly BENCHMARKS = {
    STANDARD_PRICE_BASE: 12.0, // €12 baseline standard ticket
    VIP_PRICE_BASE: 80.0,      // €80 baseline VIP suite ticket
    STANDARD_ELASTICITY: 1.45,  // Sensitive to ticket price surges
    VIP_ELASTICITY: 0.55,       // Inelastic: VIPs care about status, not €10-€20 deltas
  };

  // Match importance multipliers
  static readonly MATCH_IMPORTANCE_FACTORS: Record<MatchImportance, { standardDemand: number; vipDemand: number }> = {
    regular: { standardDemand: 1.0, vipDemand: 1.0 },
    derby: { standardDemand: 1.75, vipDemand: 1.90 },   // Massive local hype (e.g. Casablanca / Capital Derby)
    decider: { standardDemand: 1.50, vipDemand: 1.65 }, // Title / Top 3 / Relegation crunch games
  };

  /**
   * Core simulation method: Calculates matchday attendance, revenues, and operating expenses.
   * Supports both object parameters and positional arguments.
   *
   * @param clubIdentifier - Club name (exact or case-insensitive) or options object
   * @param standardPrice - Ticket price for standard seats (€ or MAD equivalent)
   * @param vipPrice - Ticket price for VIP / Hospitality seats
   * @param teamForm - Recent form (1 = terrible losing slump, 10 = winning streak)
   * @param matchImportance - Match context tier ('regular', 'derby', 'decider')
   * @param clubPrestige - Historical & fan base standing (1 to 100)
   * @param isBoycotting - Ultras boycott active: forces standard attendance to 0 (VIP unaffected)
   */
  static calculateMatchday(
    clubIdentifierOrOptions: string | MatchdayEconomyInput,
    standardPrice?: number,
    vipPrice?: number,
    teamForm?: number,
    matchImportance?: MatchImportance,
    clubPrestige?: number,
    isBoycotting: boolean = false
  ): MatchdayEconomyResult {
    const input: MatchdayEconomyInput = typeof clubIdentifierOrOptions === "object" && clubIdentifierOrOptions !== null
      ? clubIdentifierOrOptions
      : {
          clubIdentifier: clubIdentifierOrOptions,
          standardPrice: standardPrice ?? this.BENCHMARKS.STANDARD_PRICE_BASE,
          vipPrice: vipPrice ?? this.BENCHMARKS.VIP_PRICE_BASE,
          teamForm: teamForm ?? 5,
          matchImportance: matchImportance ?? "regular",
          clubPrestige: clubPrestige ?? 50,
          isBoycotting: isBoycotting ?? false,
        };

    const {
      clubIdentifier,
      standardPrice: rawStandardPrice,
      vipPrice: rawVipPrice,
      teamForm: rawForm = 5,
      matchImportance: rawImportance = "regular",
      clubPrestige: rawPrestige = 50,
      isBoycotting: rawBoycotting = false,
      isThroneCupMatch = false,
    } = input;

    // ── 1. VALIDATE & RESOLVE CLUB VENUE ─────────────────────────────────────
    const venue = this._resolveClubVenue(clubIdentifier);
    if (!venue) {
      throw new Error(`[StadiumEconomyEngine] Unknown club identifier: "${clubIdentifier}".`);
    }

    const totalCapacity = venue.capacity;
    const vipCapacity = Math.floor(totalCapacity * this.VIP_CAPACITY_PERCENTAGE);
    const standardCapacity = totalCapacity - vipCapacity;

    // Normalize inputs
    const form = Math.max(1, Math.min(10, Number(rawForm) || 5));
    const prestige = Math.max(1, Math.min(100, Number(rawPrestige) || 50));
    const importanceKey: MatchImportance = (
      ["regular", "derby", "decider"].includes(rawImportance?.toLowerCase() as MatchImportance)
        ? rawImportance.toLowerCase()
        : "regular"
    ) as MatchImportance;
    const importance = this.MATCH_IMPORTANCE_FACTORS[importanceKey] || this.MATCH_IMPORTANCE_FACTORS.regular;

    const stdPrice = Math.max(1.0, Number(rawStandardPrice) || this.BENCHMARKS.STANDARD_PRICE_BASE);
    const vipPrc = Math.max(1.0, Number(rawVipPrice) || this.BENCHMARKS.VIP_PRICE_BASE);

    // ── 2. STANDARD SEAT ATTENDANCE (Price Elasticity + Fan Passion) ─────────
    // Team form scalar: losing streak (form 1) causes fan boycotts/slump (~0.20),
    // average form (form 5) is baseline (1.00), winning streak (form 10) surges to 1.55
    const formMultiplier = form <= 5
      ? 0.20 + ((form - 1) / 4) * 0.80
      : 1.00 + ((form - 5) / 5) * 0.55;

    // Club prestige provides a solid attendance floor
    const prestigeFactor = 0.35 + (prestige / 100) * 0.75;

    // Price elasticity: relative to standard benchmark price
    const priceRatio = this.BENCHMARKS.STANDARD_PRICE_BASE / stdPrice;
    const priceElasticityMultiplier = Math.pow(priceRatio, this.BENCHMARKS.STANDARD_ELASTICITY);

    // Baseline fan demand
    const baseStandardDemandRatio = 0.72;
    const rawStandardDemand = standardCapacity *
      baseStandardDemandRatio *
      formMultiplier *
      prestigeFactor *
      importance.standardDemand *
      priceElasticityMultiplier;

    // Step 2: If Ultras boycott is active, force standard attendance to 0
    const activeBoycott = Boolean(rawBoycotting);
    const calculatedStandardAttendance = Math.min(standardCapacity, Math.max(0, Math.round(rawStandardDemand)));
    const standardAttendance = activeBoycott ? 0 : calculatedStandardAttendance;

    // ── 3. VIP ATTENDANCE ("Glory Hunters" Dynamics) ─────────────────────────
    // VIPs care overwhelmingly about prestige and current hype, with low price elasticity.
    // VIP attendance remains completely unaffected by Ultras boycotts.
    const vipPrestigeWeight = Math.pow(prestige / 100, 1.8);
    const vipFormWeight = Math.pow(form / 10, 2.0);
    const gloryFactor = (vipPrestigeWeight * 0.60) + (vipFormWeight * 0.40);

    const vipPriceRatio = this.BENCHMARKS.VIP_PRICE_BASE / vipPrc;
    const vipPriceMultiplier = Math.pow(vipPriceRatio, this.BENCHMARKS.VIP_ELASTICITY);

    const rawVipDemand = vipCapacity *
      gloryFactor *
      importance.vipDemand *
      vipPriceMultiplier *
      1.15;

    const vipAttendance = Math.min(vipCapacity, Math.max(0, Math.round(rawVipDemand)));

    // ── 4. FINANCIAL LEDGER ──────────────────────────────────────────────────
    const totalAttendance = standardAttendance + vipAttendance;
    const overallOccupancyRate = Number(((totalAttendance / totalCapacity) * 100).toFixed(1));

    const standardRevenue = Math.round(standardAttendance * stdPrice);
    const vipRevenue = Math.round(vipAttendance * vipPrc);
    const totalGrossRevenue = standardRevenue + vipRevenue;

    // Throne Cup flat participation/TV bonus
    const cupBonus = this.calculateCupBonus(Boolean(isThroneCupMatch));

    // ── 5. THE BIG STADIUM TRAP (Exponential Operating Costs) ────────────────
    // Opening a 45k - 65k arena mandates massive municipal lease fees, police deployment,
    // fire safety marshals, floodlight arrays, turnstile crews, and turf maintenance.
    const operatingCost = this._calculateOperatingCost(totalCapacity);
    const netProfit = (totalGrossRevenue + cupBonus) - operatingCost;

    return {
      club: venue.clubName,
      stadium: venue.stadium,
      capacities: {
        total: totalCapacity,
        standard: standardCapacity,
        vip: vipCapacity,
      },
      attendance: {
        standard: standardAttendance,
        vip: vipAttendance,
        total: totalAttendance,
        occupancyRatePercent: overallOccupancyRate,
        isSoldOut: totalAttendance >= totalCapacity,
        isBoycotted: activeBoycott,
      },
      finances: {
        ticketPrices: {
          standard: stdPrice,
          vip: vipPrc,
        },
        revenue: {
          standard: standardRevenue,
          vip: vipRevenue,
          grossTotal: totalGrossRevenue,
          cupBonus,
        },
        operatingCost,
        netProfit,
        isProfitable: netProfit >= 0,
      },
      diagnostics: {
        formIndex: form,
        prestigeIndex: prestige,
        matchImportance: importanceKey,
        bigStadiumTrapRisk: totalCapacity >= 45000 && (form <= 3 || stdPrice > this.BENCHMARKS.STANDARD_PRICE_BASE * 1.5),
        breakEvenStandardAttendance: Math.max(0, Math.ceil((operatingCost - vipRevenue) / stdPrice)),
        isBoycotting: activeBoycott,
      },
    };
  }

  /**
   * 1. The Throne Cup Jackpot (كأس العرش).
   * Fixed flat TV / Participation bonus completely separate from ticket sales.
   *
   * @param isThroneCupMatch - Boolean indicating whether the fixture is a Throne Cup clash
   * @returns 4,000,000 € if true, 0 otherwise
   */
  static calculateCupBonus(isThroneCupMatch: boolean): number {
    return isThroneCupMatch === true ? 4000000 : 0;
  }

  /**
   * 2. Ultras Boycott & "The Dugout" Social Feed.
   *
   * Trigger: If teamForm is terrible (< 4) AND the manager sets standardPrice aggressively high (>= basePrice * 2.5).
   * Consequence: Returns an object with { isBoycotting: true, communiqueString: "..." }
   * with a fiery Arabic statement (بيان رسمي) attacking managerial greed and catastrophic results.
   * If not triggered, returns { isBoycotting: false, communiqueString: null }.
   *
   * @param teamForm - Current team form (1 to 10)
   * @param standardPrice - Configured ticket price for standard stands
   * @param basePrice - Benchmark standard ticket price (default 12)
   */
  static evaluateUltrasReaction(
    teamForm: number,
    standardPrice: number,
    basePrice: number = 12
  ): UltrasReactionResult {
    const formNum = Number(teamForm);
    const priceNum = Number(standardPrice);
    const baseNum = Number(basePrice) || this.BENCHMARKS.STANDARD_PRICE_BASE;

    const isFormTerrible = formNum < 4;
    const isPriceAggressive = priceNum >= baseNum * 2.5;

    if (isFormTerrible && isPriceAggressive) {
      return {
        isBoycotting: true,
        communiqueString: "بيان الكورفا: نتائج كارثية، هزائم متتالية، وإدارة جشعة ترفع أثمنة التذاكر! نعلن مقاطعة المباراة القادمة، التيرّان غيبقى خاوي.",
      };
    }

    return {
      isBoycotting: false,
      communiqueString: null,
    };
  }

  /**
   * Computes the exponential operating cost required to open and host a match.
   * Demonstrates "The Big Stadium Trap": large venues carry steep non-linear overheads.
   *
   * @param capacity - Stadium total seat capacity
   */
  static _calculateOperatingCost(capacity: number): number {
    const baseOverhead = 2000;
    const variablePerSeat = 0.60 * capacity;
    const capacityUnits = capacity / 10000;
    const exponentialBurden = 1450 * Math.pow(capacityUnits, 2.22);

    return Math.round(baseOverhead + variablePerSeat + exponentialBurden);
  }

  /**
   * Resolves club name variations to the registered venue configuration.
   */
  static _resolveClubVenue(identifier: string): (StadiumVenueInfo & { clubName: string }) | null {
    if (!identifier || typeof identifier !== "string") return null;

    const trimmed = identifier.trim();

    // 1. Direct exact lookup
    if (this.BOTOLA_STADIUM_REGISTRY[trimmed]) {
      return {
        clubName: trimmed,
        ...this.BOTOLA_STADIUM_REGISTRY[trimmed],
      };
    }

    // 2. Case-insensitive & slug lookup
    const cleanQuery = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [clubName, data] of Object.entries(this.BOTOLA_STADIUM_REGISTRY)) {
      const cleanTarget = clubName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanTarget === cleanQuery || cleanTarget.includes(cleanQuery) || cleanQuery.includes(cleanTarget)) {
        return {
          clubName,
          ...data,
        };
      }
    }

    return null;
  }
}

export default StadiumEconomyEngine;
