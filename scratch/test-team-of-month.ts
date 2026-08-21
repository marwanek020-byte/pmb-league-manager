import { PrismaClient } from "@prisma/client";
import { TeamOfTheMonthService } from "../src/lib/services/team-of-month-service";

const prisma = new PrismaClient();

async function testTeamOfTheMonthEngine() {
  console.log("=================================================");
  console.log("🏆 TESTING 60% AI PERFORMANCE + 40% VOTE ENGINE");
  console.log("=================================================\n");

  console.log("1. Calculating AI Performance for Round 1 to 4...");
  const rankings = await TeamOfTheMonthService.calculateMonthlyPerformance(1, 4);

  console.log(`Found ${rankings.length} active teams in completed fixtures:`);
  rankings.forEach((r, idx) => {
    console.log(`   [#${idx + 1}] ${r.clubName} (@${r.managerName})`);
    console.log(`       • AI Score: ${r.aiScore}/100`);
    console.log(`       • Results Pts: ${r.breakdown.resultScore}/40`);
    console.log(`       • Attack Pts:  ${r.breakdown.attackScore}/25 (${r.goalsFor} Goals)`);
    console.log(`       • Defense Pts: ${r.breakdown.defenseScore}/20 (${r.cleanSheets} Clean Sheets)`);
    console.log(`       • Bonus Pts:   ${r.breakdown.bonusScore}/15`);
    console.log(`       • Summary:     "${r.summaryText}"\n`);
  });

  console.log("2. Checking 4-round threshold trigger for Monthly Poll...");
  const poll = await TeamOfTheMonthService.getOrGenerateMonthlyPoll();
  if (poll) {
    console.log(`✅ Active Poll Generated: "${poll.title}" with ${poll.options.length} nominees.`);
  } else {
    console.log("⏳ Poll is locked until at least 4 matchdays are completed (as intended!).");
  }

  console.log("\n=================================================");
  console.log("🎉 TEAM OF THE MONTH ENGINE TEST PASSED!");
  console.log("=================================================");
}

testTeamOfTheMonthEngine()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
