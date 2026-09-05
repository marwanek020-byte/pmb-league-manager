import { NegotiationMathEngine } from "../src/lib/services/NegotiationMathEngine";

function runTests() {
  console.log("===============================================================================");
  console.log("  PMB LEAGUE MANAGER — NEGOTIATION MATH ENGINE (v4.0) VERIFICATION SUITE");
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

  const baseDemands = {
    seasonSalary: 200000,
    primeSignature: 100000,
    contractSeasonsLeft: 3,
    squadRole: "IMPORTANT",
    releaseClause: 800000,
  };

  // TEST 1: Cross-Compensation (Lower wage + High bonus)
  {
    const offer = {
      seasonSalary: 160000, // 80% of wage demand
      primeSignature: 190000, // +90k extra bonus
      contractSeasonsLeft: 3,
      squadRole: "IMPORTANT",
      releaseClause: 800000,
    };
    const result = NegotiationMathEngine.evaluateOffer({
      demands: baseDemands,
      offer,
      currentPatience: 3,
      playerLeverage: 1.0,
      clubPrestige: 50,
    });

    assert(
      "Test 1: Cross-Compensation (bonus surplus covers wage deficit)",
      result.evaluation.crossCompensationApplied === true && (result.status === "ACCEPTED" || result.status === "COUNTER"),
      result
    );
  }

  // TEST 2: Hypocrisy Detection (Promoted KEY role + Low salary)
  {
    const offer = {
      seasonSalary: 130000, // only 65% of demand
      primeSignature: 50000,
      contractSeasonsLeft: 3,
      squadRole: "KEY", // Promoted to Key Player!
      releaseClause: 800000,
    };
    const result = NegotiationMathEngine.evaluateOffer({
      demands: baseDemands,
      offer,
      currentPatience: 3,
      playerLeverage: 1.0,
    });

    assert(
      "Test 2: Hypocrisy Detection triggers penalty and call-out dialogue",
      result.evaluation.hypocrisyDetected === true && result.agentMessage.includes("نجم الفريق"),
      result
    );
  }

  // TEST 3: Stepping-Stone Wonderkid Ambition (Age <= 21, Release Clause Removed)
  {
    const offer = {
      seasonSalary: 250000, // Generous salary!
      primeSignature: 150000,
      contractSeasonsLeft: 3,
      squadRole: "IMPORTANT",
      releaseClause: null, // Removed release clause!
    };
    const result = NegotiationMathEngine.evaluateOffer({
      demands: baseDemands,
      offer,
      currentPatience: 3,
      playerAge: 19, // Wonderkid!
      playerLeverage: 1.2,
    });

    assert(
      "Test 3: Wonderkid fatal walkout when release clause is removed",
      result.status === "BREAKDOWN" && result.evaluation.breakdownReason === "WONDERKID_EUROPEAN_AMBITION_BLOCKED",
      result
    );
  }

  // TEST 4: Time-Wasting & Micro-Increment Punisher
  {
    const previousOffers = [
      { seasonSalary: 150000, primeSignature: 60000, contractSeasonsLeft: 3, squadRole: "IMPORTANT", releaseClause: 800000 },
      { seasonSalary: 150050, primeSignature: 60000, contractSeasonsLeft: 3, squadRole: "IMPORTANT", releaseClause: 800000 }, // +50€
    ];
    const currentOffer = {
      seasonSalary: 150100, // +50€ micro-bump again
      primeSignature: 60000,
      contractSeasonsLeft: 3,
      squadRole: "IMPORTANT",
      releaseClause: 800000,
    };
    const result = NegotiationMathEngine.evaluateOffer({
      demands: baseDemands,
      offer: currentOffer,
      previousOffers,
      currentPatience: 3,
    });

    assert(
      "Test 4: Micro-increment penalty drains patience by 2 points and warns",
      result.agentPatience <= 1 && (result.agentMessage.includes("ميكروسكوبية") || result.agentMessage.includes("إهانة")),
      result
    );
  }

  // TEST 5: Ultimatum Round (currentPatience === 1)
  {
    const offer = {
      seasonSalary: 165000,
      primeSignature: 75000,
      contractSeasonsLeft: 3,
      squadRole: "IMPORTANT",
      releaseClause: 800000,
    };
    const result = NegotiationMathEngine.evaluateOffer({
      demands: baseDemands,
      offer,
      currentPatience: 1, // Final round!
      playerLeverage: 1.0,
    });

    assert(
      "Test 5: Take-It-Or-Leave-It Redline Ultimatum triggered on patience === 1",
      result.isUltimatum === true && result.agentMessage.includes("Take It or Leave It"),
      result
    );
  }

  // TEST 6: Prestige Scaling (Elite vs Relegation)
  {
    const offer = {
      seasonSalary: 185000,
      primeSignature: 90000,
      contractSeasonsLeft: 3,
      squadRole: "IMPORTANT",
      releaseClause: 800000,
    };
    const eliteResult = NegotiationMathEngine.evaluateOffer({
      demands: baseDemands,
      offer,
      currentPatience: 3,
      clubPrestige: 90, // Elite champion club
    });
    const relegationResult = NegotiationMathEngine.evaluateOffer({
      demands: baseDemands,
      offer,
      currentPatience: 3,
      clubPrestige: 25, // Relegation battler
    });

    assert(
      "Test 6: Elite club receives prestige discount higher score than relegation battler",
      eliteResult.evaluation.offerScore > relegationResult.evaluation.offerScore &&
      relegationResult.agentMessage.includes("الهبوط"),
      { elite: eliteResult.evaluation.offerScore, relegation: relegationResult.evaluation.offerScore }
    );
  }

  // TEST 7: Deadline Day / Positional Urgency
  {
    const offer = {
      seasonSalary: 180000,
      primeSignature: 50000, // Skimping on signing bonus
      contractSeasonsLeft: 3,
      squadRole: "IMPORTANT",
      releaseClause: 800000,
    };
    const urgentResult = NegotiationMathEngine.evaluateOffer({
      demands: baseDemands,
      offer,
      currentPatience: 3,
      clubUrgency: true, // Deadline day!
    });

    assert(
      "Test 7: Deadline Day extortion resists bonus cuts and calls out ticking clock",
      urgentResult.counterDemands?.primeSignature! >= baseDemands.primeSignature &&
      urgentResult.agentMessage.includes("نافذة الانتقالات"),
      urgentResult
    );
  }

  console.log(`\n===============================================================================`);
  console.log(`  VERIFICATION RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log(`===============================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
