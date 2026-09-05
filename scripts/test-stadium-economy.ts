import { StadiumEconomyEngine } from "../src/lib/services/stadium-economy-engine";

function runVerificationSuite() {
  console.log("===============================================================================");
  console.log("  PMB LEAGUE MANAGER — STADIUM ECONOMY ENGINE VERIFICATION SUITE");
  console.log("===============================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, details?: any) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (details) console.error("   Details:", details);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: BOTOLA PRO 16 CLUBS & CAPACITIES REGISTRY
  // ─────────────────────────────────────────────────────────────────────────────
  const registry = StadiumEconomyEngine.BOTOLA_STADIUM_REGISTRY;
  const clubKeys = Object.keys(registry);

  assert("Test 1.1: Exactly 16 Botola Pro clubs configured", clubKeys.length === 16, { count: clubKeys.length });

  const expectedVenues: Record<string, { stadium: string; capacity: number }> = {
    "Raja Casablanca": { stadium: "Stade Mohammed V", capacity: 45891 },
    "Wydad AC": { stadium: "Stade Mohammed V", capacity: 45891 },
    "FAR Rabat": { stadium: "Stade Prince Moulay Abdellah", capacity: 53000 },
    "FUS Rabat": { stadium: "Stade Moulay Hassan", capacity: 12000 },
    "Maghreb Fez": { stadium: "Grand Stade de Fès", capacity: 45000 },
    "Berkane": { stadium: "Stade Municipal de Berkane", capacity: 10000 },
    "IR Tanger": { stadium: "Grand Stade de Tanger", capacity: 65000 },
    "Hassania Agadir": { stadium: "Grand Stade d'Agadir", capacity: 45480 },
    "Olympique Safi": { stadium: "Stade El Massira", capacity: 15000 },
    "Difaa El Jadidi": { stadium: "Stade El Abdi", capacity: 15000 },
    "Kawkab Marrakech": { stadium: "Grand Stade de Marrakech", capacity: 45240 },
    "COD Meknes": { stadium: "Stade d'Honneur de Meknès", capacity: 20000 },
    "Renaissance Zemamra": { stadium: "Stade Ahmed Choukri", capacity: 5000 },
    "Union Touarga": { stadium: "Stade Moulay Hassan", capacity: 12000 },
    "Dcheira": { stadium: "Stade Ahmed Fana", capacity: 5000 },
    "Yacoub El Mansour": { stadium: "Stade Municipal de Yacoub El Mansour", capacity: 5000 },
  };

  let allCapacitiesMatch = true;
  for (const [club, expected] of Object.entries(expectedVenues)) {
    const entry = registry[club];
    if (!entry || entry.capacity !== expected.capacity || entry.stadium !== expected.stadium) {
      allCapacitiesMatch = false;
      console.error(`Mismatch for ${club}:`, entry, "Expected:", expected);
    }
  }
  assert("Test 1.2: All 16 clubs have certified stadiums & exact capacities", allCapacitiesMatch);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: VIP CAPACITY ALLOTMENT (5%)
  // ─────────────────────────────────────────────────────────────────────────────
  const tangerResult = StadiumEconomyEngine.calculateMatchday("IR Tanger", 12, 80, 5, "regular", 50);
  const expectedTangerVip = Math.floor(65000 * 0.05); // 3250
  assert(
    "Test 2.1: VIP capacity is dynamically calculated as exactly 5% of total (IR Tanger: 3,250 of 65,000)",
    tangerResult.capacities.vip === expectedTangerVip && tangerResult.capacities.standard === (65000 - expectedTangerVip),
    tangerResult.capacities
  );

  const zemamraResult = StadiumEconomyEngine.calculateMatchday("Renaissance Zemamra", 12, 80, 5, "regular", 50);
  const expectedZemamraVip = Math.floor(5000 * 0.05); // 250
  assert(
    "Test 2.2: VIP capacity for small venue (Zemamra: 250 of 5,000)",
    zemamraResult.capacities.vip === expectedZemamraVip && zemamraResult.capacities.standard === 4750,
    zemamraResult.capacities
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: PRICE ELASTICITY & FORM SENSITIVITY
  // ─────────────────────────────────────────────────────────────────────────────
  // Form comparison (good form vs bad form with same ticket price)
  const rajaGoodForm = StadiumEconomyEngine.calculateMatchday("Raja Casablanca", 12, 80, 9, "regular", 85);
  const rajaPoorForm = StadiumEconomyEngine.calculateMatchday("Raja Casablanca", 12, 80, 2, "regular", 85);
  assert(
    "Test 3.1: Form significantly increases attendance (Form 9 attendance > Form 2 attendance)",
    rajaGoodForm.attendance.total > rajaPoorForm.attendance.total * 1.5,
    { goodForm: rajaGoodForm.attendance.total, poorForm: rajaPoorForm.attendance.total }
  );

  // Price sensitivity (cheap vs expensive standard tickets)
  const safiCheap = StadiumEconomyEngine.calculateMatchday("Olympique Safi", 8, 80, 6, "regular", 60);
  const safiExpensive = StadiumEconomyEngine.calculateMatchday("Olympique Safi", 25, 80, 6, "regular", 60);
  assert(
    "Test 3.2: Standard attendance exhibits strong price elasticity (Cheap standard ticket draws more fans)",
    safiCheap.attendance.standard > safiExpensive.attendance.standard * 1.8,
    { cheap: safiCheap.attendance.standard, expensive: safiExpensive.attendance.standard }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: DERBY / DECIDER MATCH IMPORTANCE MULTIPLIER
  // ─────────────────────────────────────────────────────────────────────────────
  const wydadRegular = StadiumEconomyEngine.calculateMatchday("Wydad AC", 15, 90, 7, "regular", 88);
  const wydadDerby = StadiumEconomyEngine.calculateMatchday("Wydad AC", 15, 90, 7, "derby", 88);
  assert(
    "Test 4.1: Derby match multiplies demand significantly",
    wydadDerby.attendance.total > wydadRegular.attendance.total,
    { regular: wydadRegular.attendance.total, derby: wydadDerby.attendance.total }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: VIP "GLORY HUNTERS" DYNAMICS
  // ─────────────────────────────────────────────────────────────────────────────
  // VIPs desert when prestige and form collapse
  const farHighPrestigeGoodForm = StadiumEconomyEngine.calculateMatchday("FAR Rabat", 12, 100, 8, "regular", 90);
  const farLowPrestigeSlump = StadiumEconomyEngine.calculateMatchday("FAR Rabat", 12, 100, 1, "regular", 20);
  assert(
    "Test 5.1: VIP attendance collapses when club prestige & form crater",
    farHighPrestigeGoodForm.attendance.vip > farLowPrestigeSlump.attendance.vip * 5,
    { high: farHighPrestigeGoodForm.attendance.vip, collapsed: farLowPrestigeSlump.attendance.vip }
  );

  // VIP price inelasticity: doubling VIP price has moderate impact compared to standard
  const vipPricedLow = StadiumEconomyEngine.calculateMatchday("Maghreb Fez", 12, 60, 7, "regular", 70);
  const vipPricedHigh = StadiumEconomyEngine.calculateMatchday("Maghreb Fez", 12, 120, 7, "regular", 70);
  const vipRetentionRate = vipPricedHigh.attendance.vip / vipPricedLow.attendance.vip;
  assert(
    "Test 5.2: VIP attendance is relatively inelastic to price (retention remains healthy even at 2x price)",
    vipRetentionRate > 0.60,
    { vipRetentionRate: (vipRetentionRate * 100).toFixed(1) + "%" }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 6: "THE BIG STADIUM TRAP" (EXPONENTIAL OPERATING COSTS)
  // ─────────────────────────────────────────────────────────────────────────────
  // Large club (IR Tanger, 65k capacity) on losing streak (form 1, low prestige 30) with overpriced ticket (€35)
  const tangerTrapMatch = StadiumEconomyEngine.calculateMatchday("IR Tanger", 35, 120, 1, "regular", 30);
  assert(
    "Test 6.1: Big Stadium Trap triggers negative netProfit on 65,000 capacity stadium during losing streak & overpriced tickets",
    tangerTrapMatch.finances.netProfit < 0,
    {
      revenue: tangerTrapMatch.finances.revenue.grossTotal,
      operatingCost: tangerTrapMatch.finances.operatingCost,
      netProfit: tangerTrapMatch.finances.netProfit,
      attendance: tangerTrapMatch.attendance.total,
    }
  );

  // Large club (Maghreb Fez, 45k capacity) on slump (form 1, prestige 30) with overpriced ticket (€35)
  const fezTrapMatch = StadiumEconomyEngine.calculateMatchday("Maghreb Fez", 35, 120, 1, "regular", 30);
  assert(
    "Test 6.2: 45k stadium (Grand Stade de Fès) can also fall into Big Stadium Trap (negative net profit on losing streak)",
    fezTrapMatch.finances.netProfit < 0,
    {
      revenue: fezTrapMatch.finances.revenue.grossTotal,
      operatingCost: fezTrapMatch.finances.operatingCost,
      netProfit: fezTrapMatch.finances.netProfit,
    }
  );

  // Small club (Renaissance Zemamra, 5,000 capacity) under the exact same terrible slump (form 1, prestige 30, €25 ticket)
  const zemamraSmallMatch = StadiumEconomyEngine.calculateMatchday("Renaissance Zemamra", 25, 80, 1, "regular", 30);
  assert(
    "Test 6.3: Small 5k stadium (Zemamra) maintains very low operating risk (operating cost is modest, ~€4,850)",
    zemamraSmallMatch.finances.operatingCost < 8000,
    { operatingCost: zemamraSmallMatch.finances.operatingCost }
  );

  // Operating cost comparison: 65k venue vs 5k venue
  const tangerCost = tangerTrapMatch.finances.operatingCost;
  const zemamraCost = zemamraSmallMatch.finances.operatingCost;
  assert(
    "Test 6.4: Operating cost is superlinear/exponential (65k venue cost > 15x of 5k venue cost)",
    tangerCost > zemamraCost * 15,
    { tangerCost, zemamraCost, ratio: (tangerCost / zemamraCost).toFixed(2) }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 7: FLEXIBLE API (OBJECT PARAMETERS + POSITIONAL ARGS)
  // ─────────────────────────────────────────────────────────────────────────────
  const objCallResult = StadiumEconomyEngine.calculateMatchday({
    clubIdentifier: "Raja Casablanca",
    standardPrice: 15,
    vipPrice: 90,
    teamForm: 8,
    matchImportance: "derby",
    clubPrestige: 92,
  });
  assert("Test 7.1: Options object argument invocation works seamlessly", objCallResult.attendance.total > 0 && objCallResult.finances.netProfit > 0);

  // Case-insensitive / partial club name resolution
  const fuzzyCallResult = StadiumEconomyEngine.calculateMatchday("raja", 12, 80, 7, "regular", 85);
  assert("Test 7.2: Fuzzy & case-insensitive club lookup ('raja' resolves to Raja Casablanca)", fuzzyCallResult.club === "Raja Casablanca");

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 8: THE THRONE CUP JACKPOT (calculateCupBonus)
  // ─────────────────────────────────────────────────────────────────────────────
  const cupBonusTrue = StadiumEconomyEngine.calculateCupBonus(true);
  const cupBonusFalse = StadiumEconomyEngine.calculateCupBonus(false);

  assert("Test 8.1: Throne Cup match awards fixed 4,000,000 € bonus", cupBonusTrue === 4000000, { cupBonusTrue });
  assert("Test 8.2: Non-cup match returns 0 € bonus", cupBonusFalse === 0, { cupBonusFalse });

  const cupMatchResult = StadiumEconomyEngine.calculateMatchday({
    clubIdentifier: "Berkane",
    standardPrice: 12,
    vipPrice: 80,
    teamForm: 7,
    matchImportance: "decider",
    clubPrestige: 75,
    isThroneCupMatch: true,
  });
  assert(
    "Test 8.3: calculateMatchday includes 4,000,000 € Throne Cup bonus in financial ledger",
    cupMatchResult.finances.revenue.cupBonus === 4000000 && cupMatchResult.finances.netProfit > 4000000,
    cupMatchResult.finances
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 9: ULTRAS BOYCOTT & THE DUGOUT SOCIAL FEED (evaluateUltrasReaction)
  // ─────────────────────────────────────────────────────────────────────────────
  // Trigger condition: teamForm < 4 AND standardPrice >= basePrice * 2.5 (e.g. form 2, price 30 >= 12 * 2.5)
  const boycottReaction = StadiumEconomyEngine.evaluateUltrasReaction(2, 30, 12);
  const expectedCommunique = "بيان الكورفا: نتائج كارثية، هزائم متتالية، وإدارة جشعة ترفع أثمنة التذاكر! نعلن مقاطعة المباراة القادمة، التيرّان غيبقى خاوي.";

  assert(
    "Test 9.1: Ultras Boycott triggers on terrible form (< 4) and aggressive pricing (>= 2.5x base)",
    boycottReaction.isBoycotting === true && boycottReaction.communiqueString === expectedCommunique,
    boycottReaction
  );

  // Non-trigger 1: High price but great team form (fans tolerate price hike when winning)
  const winningReaction = StadiumEconomyEngine.evaluateUltrasReaction(8, 30, 12);
  assert(
    "Test 9.2: Ultras do NOT boycott if team form is good (form 8 >= 4)",
    winningReaction.isBoycotting === false && winningReaction.communiqueString === null,
    winningReaction
  );

  // Non-trigger 2: Terrible form but loyal fan-friendly ticket price (e.g. 10 €)
  const cheapReaction = StadiumEconomyEngine.evaluateUltrasReaction(2, 10, 12);
  assert(
    "Test 9.3: Ultras do NOT boycott if manager keeps prices affordable (< 2.5x base)",
    cheapReaction.isBoycotting === false && cheapReaction.communiqueString === null,
    cheapReaction
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 10: INTEGRATION OF ULTRAS BOYCOTT INTO calculateMatchday
  // ─────────────────────────────────────────────────────────────────────────────
  // When isBoycotting === true, standard attendance must drop to 0, VIP unaffected
  const normalWydad = StadiumEconomyEngine.calculateMatchday("Wydad AC", 15, 90, 7, "regular", 88, false);
  const boycottedWydad = StadiumEconomyEngine.calculateMatchday("Wydad AC", 15, 90, 7, "regular", 88, true);

  assert(
    "Test 10.1: isBoycotting forces standard attendance to exactly 0",
    boycottedWydad.attendance.standard === 0 && normalWydad.attendance.standard > 20000,
    { boycottedStandard: boycottedWydad.attendance.standard, normalStandard: normalWydad.attendance.standard }
  );

  assert(
    "Test 10.2: VIP attendance remains unaffected during Ultras boycott",
    boycottedWydad.attendance.vip === normalWydad.attendance.vip && boycottedWydad.attendance.vip > 0,
    { boycottedVip: boycottedWydad.attendance.vip, normalVip: normalWydad.attendance.vip }
  );

  // Ultras boycott triggered during slump (form 2, price 30, prestige 60)
  const boycottedSlump = StadiumEconomyEngine.calculateMatchday("Wydad AC", 30, 90, 2, "regular", 60, true);
  assert(
    "Test 10.3: Standard revenue collapses to 0 and large stadium suffers heavy net loss during boycott slump",
    boycottedSlump.finances.revenue.standard === 0 && boycottedSlump.finances.netProfit < 0,
    {
      standardRevenue: boycottedSlump.finances.revenue.standard,
      vipRevenue: boycottedSlump.finances.revenue.vip,
      operatingCost: boycottedSlump.finances.operatingCost,
      netProfit: boycottedSlump.finances.netProfit,
    }
  );

  console.log("\n===============================================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log("===============================================================================\n");

  if (passed === total) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! The StadiumEconomyEngine is fully verified.");
  } else {
    process.exit(1);
  }
}

runVerificationSuite();
