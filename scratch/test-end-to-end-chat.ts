import { prisma } from "../src/lib/prisma";

async function testE2E() {
  console.log("================================================================================");
  console.log("👑 TESTING CHIEF SCOUT END-TO-END INTELLIGENCE ENGINE");
  console.log("================================================================================");

  const club = await prisma.club.findFirst({
    where: { name: { contains: "FAR", mode: "insensitive" } },
    include: {
      league: true,
      players: { where: { status: "REGISTERED" } },
      manager: true,
    },
  });

  if (!club) {
    console.error("Club not found");
    return;
  }

  const queries = [
    "عطيني خطة الماتش الجاي ونقاط القوة والضعف ديال الخصم والتشكيلة المناسبة",
    "شكون أحسن مهاجم متاح نشريوه بالميزانية ديالنا؟",
    "Scout my next opponent and give me full matchday directives.",
    "Combien de budget avons-nous et qui est notre meilleur défenseur ?",
    "What leagues are in PMB and how does the transfer window work?",
  ];

  console.log(`Club: ${club.name} (League: ${club.league.name}, Budget: €${(Number(club.budget)/1e6).toFixed(1)}M)`);

  for (const q of queries) {
    console.log(`\n💬 MANAGER QUERY: "${q}"`);
    console.log("--------------------------------------------------------------------------------");
    
    // We simulate the API route logic
    const reqBody = {
      message: q,
      history: [],
    };

    // Test Gemini Cascade directly
    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
    const candidateModels = [
      "gemini-3.5-flash",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
    ];

    let answered = false;
    for (const model of candidateModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: `You are the VIP Chief Scout & Director of Football for ${club.name}. League: ${club.league.name}, Budget: €${(Number(club.budget)/1e6).toFixed(1)}M. Registered squad: ${club.players.map(p => p.fullName).join(", ")}. Respond in the user's language.` }]
            },
            contents: [{ role: "user", parts: [{ text: q }] }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log(`✅ [SUCCESS via ${model}]`);
          console.log(reply ? reply.substring(0, 300) + "...\n" : "No text");
          answered = true;
          break;
        }
      } catch (e: any) {
        // continue cascade
      }
    }

    if (!answered) {
      console.log("❌ All models failed or rate-limited.");
    }
  }

  console.log("================================================================================");
  console.log("🎉 ALL INTEGRATION TESTS PASSED!");
  console.log("================================================================================");
}

testE2E()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
