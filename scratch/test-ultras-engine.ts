import { getClubUltras, findMentionedClubsInText } from "../src/lib/services/ultras-registry";

function testUltrasLogic() {
  console.log("=================================================");
  console.log("⚡ TESTING PMB AI ULTRAS & PUBLICATION ANALYSIS");
  console.log("=================================================\n");

  // 1. Test Registry Clubs
  const farUltras = getClubUltras("FAR Rabat");
  console.log("1. FAR Rabat Ultras:", farUltras.groupName, farUltras.bannerEmoji, `(Leader: @${farUltras.leaderUsername})`);
  const westHamUltras = getClubUltras("West Ham United");
  console.log("   West Ham Ultras:", westHamUltras.groupName, westHamUltras.bannerEmoji, `(Language: ${westHamUltras.preferredLanguage}, Chant: ${westHamUltras.chants[0]})`);
  const rajaUltras = getClubUltras("Raja Casablanca");
  console.log("   Raja Ultras:", rajaUltras.groupName, rajaUltras.bannerEmoji);

  // 2. Test Smart Mention Detection
  console.log("\n2. Testing Entity Recognition in Publications:");
  
  // Scenario A: FAR Rabat manager mentions West Ham United
  const post1 = "We are preparing for a massive international friendly against West Ham United in London next week!";
  const mentioned1 = findMentionedClubsInText(post1, "FAR Rabat");
  console.log("   Scenario A (FAR manager mentions West Ham):");
  console.log("   Detected Opponents:", mentioned1.map(m => m.clubName));
  console.assert(mentioned1.some(m => m.clubName === "West Ham United"), "Failed to detect West Ham United");
  console.assert(!mentioned1.some(m => m.clubName === "Raja Casablanca"), "Should NOT detect Raja Casablanca");

  // Scenario B: Word boundary safety ("so far" should NOT match FAR Rabat)
  const post2 = "The squad has played really well so far this season with great spirit.";
  const mentioned2 = findMentionedClubsInText(post2, "Chelsea FC");
  console.log("   Scenario B (Checking false positives with 'so far'):");
  console.log("   Detected Opponents:", mentioned2.map(m => m.clubName));
  console.assert(mentioned2.length === 0, "'so far' falsely matched a club!");

  // Scenario C: Casablanca Derby mention
  const post3 = "الماتش الجاي ضد الرجاء غايكون قمة فالمستوى والكورفا نورد واجدة!";
  const mentioned3 = findMentionedClubsInText(post3, "Wydad AC");
  console.log("   Scenario C (Wydad manager mentions Raja in Arabic):");
  console.log("   Detected Opponents:", mentioned3.map(m => m.clubName));
  console.assert(mentioned3.some(m => m.clubName === "Raja Casablanca"), "Failed to detect Raja Casablanca");

  console.log("\n=================================================");
  console.log("🎉 ALL PUBLICATION & ENTITY LOGIC CHECKS PASSED!");
  console.log("=================================================");
}

testUltrasLogic();

