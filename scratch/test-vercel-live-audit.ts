import fs from "fs";
import path from "path";

const BASE_URL = "https://pmb-league-manager-a5tqqysk6-pmb1.vercel.app";

async function runAudit() {
  console.log("=================================================================");
  console.log("🕵️ RUNNING COMPREHENSIVE LIVE AUDIT ON PMB AI CHIEF SCOUT");
  console.log("Target URL:", BASE_URL);
  console.log("=================================================================\n");

  // Step 1: Login to Vercel site to get session cookie
  console.log("1. Attempting login as botola-farrabat...");
  
  // Get CSRF Token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const setCookie = csrfRes.headers.get("set-cookie") || "";
  console.log("CSRF Token obtained:", csrfToken ? "✓" : "✗");

  // Post credentials
  const formParams = new URLSearchParams();
  formParams.append("username", "botola-farrabat");
  formParams.append("password", "PMB2026!");
  formParams.append("csrfToken", csrfToken);
  formParams.append("redirect", "false");
  formParams.append("json", "true");

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": setCookie,
    },
    body: formParams.toString(),
    redirect: "manual",
  });

  const sessionCookies = loginRes.headers.get("set-cookie") || setCookie;
  console.log("Login Status:", loginRes.status, "Cookies present:", !!sessionCookies);

  // Define All Test Questions from User Instructions
  const testQuestions = [
    // 2. Basic Questions
    { category: "Basic Squad", q: "Show me my squad." },
    { category: "Basic Positional", q: "What is my strongest position?" },
    { category: "Basic Positional", q: "What is my weakest position?" },
    { category: "Basic Player", q: "Who is my best player?" },
    { category: "Basic Transfer", q: "Who should I sign?" },
    { category: "Basic Transfer", q: "Who should I sell?" },
    { category: "Basic Analysis", q: "Analyze my squad." },

    // 3. Player Search
    { category: "Search Position", q: "Find goalkeepers." },
    { category: "Search Position", q: "Find defenders." },
    { category: "Search Position", q: "Find midfielders." },
    { category: "Search Position", q: "Find attackers." },
    { category: "Search Rating", q: "Find players rated 80+." },
    { category: "Search Price", q: "Find players under €10M." },
    { category: "Search Combined", q: "Find CBs rated 80+ under €15M." },
    { category: "Search Combined", q: "Find LWF players rated 82+." },
    { category: "Search Combined", q: "Find available CFs under €20M." },

    // 4. Nationality Search
    { category: "Nationality", q: "Show Moroccan players." },
    { category: "Nationality", q: "Show Algerian players." },
    { category: "Nationality", q: "Show Senegalese players." },
    { category: "Nationality", q: "Show French players." },
    { category: "Nationality Combined", q: "Find Moroccan CBs rated 80+." },
    { category: "Nationality Combined", q: "Find Brazilian attackers under €20M." },
    { category: "Nationality Combined", q: "Find French midfielders rated 82+." },

    // 5. Complex Natural Language
    { category: "Complex NLP", q: "Find me a Moroccan goalkeeper rated 80+ that I can afford." },
    { category: "Complex NLP", q: "Find me a fast winger under €15M." },
    { category: "Complex NLP", q: "Show me the best available striker for my budget." },
    { category: "Complex NLP", q: "Find a defender better than my current CB." },
    { category: "Complex NLP", q: "Find three cheap players who could improve my squad." },
    { category: "Complex NLP", q: "Find a young high-rated player." },
    { category: "Complex NLP", q: "Find the best value player available." },

    // 6. Budget Intelligence
    { category: "Budget", q: "What is my current budget?" },
    { category: "Budget", q: "What players can I afford?" },
    { category: "Budget", q: "Can I afford Player X?" },
    { category: "Budget", q: "What is the best player I can buy with my budget?" },
    { category: "Budget", q: "What if I spend €20M?" },
    { category: "Budget", q: "Give me three targets while keeping €10M in reserve." },

    // 8 & 9. Transfer Recommendations & Comparison
    { category: "Transfer Reasoning", q: "Why should I prioritize a striker?" },
    { category: "Transfer Alternatives", q: "Give me cheaper alternatives." },
    { category: "Player Comparison", q: "Compare Lionel Messi and Somaila Sidibe." },

    // 10. Next Opponent
    { category: "Opponent", q: "Who is my next opponent?" },
    { category: "Opponent", q: "Scout my next opponent." },
    { category: "Opponent", q: "How strong are they?" },
    { category: "Opponent", q: "Who are their best players?" },
    { category: "Opponent", q: "What is their weakest area?" },
    { category: "Opponent", q: "How should I play against them?" },

    // 11. Multi-Step Context
    { category: "Context Step 1", q: "Find me a CF under €15M." },
    { category: "Context Step 2", q: "Only Moroccan players." },
    { category: "Context Step 3", q: "Give me cheaper options." },
    { category: "Context Step 4", q: "Which one would you choose?" },

    // 12. Hallucinations Check
    { category: "Hallucination Check", q: "Find Kylian Mbappe in Raja Casablanca." },
    { category: "Hallucination Check", q: "Show me 99 rated Japanese defenders under 1M." },
    { category: "Hallucination Check", q: "Tell me the weather in Casablanca for our match." },
  ];

  const results: Array<{ category: string; q: string; reply: string; status: number }> = [];

  console.log(`\n2. Executing ${testQuestions.length} Live Test Queries...\n`);

  for (let i = 0; i < testQuestions.length; i++) {
    const item = testQuestions[i];
    process.stdout.write(`[${i + 1}/${testQuestions.length}] Testing: "${item.q}" ... `);

    try {
      const chatRes = await fetch(`${BASE_URL}/api/manager/scouting/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": sessionCookies,
        },
        body: JSON.stringify({ message: item.q }),
      });

      const data = await chatRes.json();
      const reply = data.reply || data.error || JSON.stringify(data);
      results.push({
        category: item.category,
        q: item.q,
        reply,
        status: chatRes.status,
      });

      console.log(`✓ (${chatRes.status}) - ${reply.length} chars`);
    } catch (err: any) {
      console.log(`✗ Error: ${err.message}`);
      results.push({
        category: item.category,
        q: item.q,
        reply: `Network/Fetch Error: ${err.message}`,
        status: 500,
      });
    }

    // Small delay to prevent rate limits
    await new Promise((r) => setTimeout(r, 600));
  }

  // Also fetch the full initial Scouting Audit payload
  console.log("\n3. Testing /api/manager/scouting initial audit endpoint...");
  const auditRes = await fetch(`${BASE_URL}/api/manager/scouting`, {
    headers: { "Cookie": sessionCookies },
  });
  const auditData = await auditRes.json();
  console.log("Audit Status:", auditRes.status);
  console.log("Audit Health Score:", auditData.audit?.healthScores?.overall);
  console.log("Audit Benchmarks:", !!auditData.leagueBenchmarks);
  console.log("Audit Match Plan:", !!auditData.nextOpponentReport?.matchPlan);

  // Save full results for detailed evaluation
  fs.writeFileSync(
    path.resolve(process.cwd(), "scratch/live-audit-results.json"),
    JSON.stringify({ auditPayload: auditData, chatResults: results }, null, 2),
    "utf-8"
  );

  console.log("\n✅ ALL LIVE QUERIES COMPLETED & RECORDED in scratch/live-audit-results.json!");
}

runAudit();
