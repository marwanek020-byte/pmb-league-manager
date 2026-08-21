import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
const geminiApiKey = match ? match[1] : null;

async function executeScoutChat(clubId: string, message: string, history: Array<{ role: string; text: string }> = []) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      league: true,
      players: {
        where: { status: "REGISTERED" },
        orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
      },
    },
  });

  if (!club) throw new Error("Club not found");

  const budgetEur = (Number(club.budget) / 1_000_000).toFixed(1);

  // 1. Fetch upcoming fixture & opponent
  const upcomingMatch = await prisma.match.findFirst({
    where: {
      OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
      status: "UPCOMING",
    },
    orderBy: { matchday: "asc" },
    include: {
      homeClub: {
        include: {
          manager: { select: { username: true } },
          players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
        },
      },
      awayClub: {
        include: {
          manager: { select: { username: true } },
          players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
        },
      },
      season: {
        include: { competitionSeason: true },
      },
    },
  });

  let opponentDataSummary = "No upcoming match fixture scheduled.";
  if (upcomingMatch) {
    const isHome = upcomingMatch.homeClubId === club.id;
    const oppClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
    const oppPlayers = oppClub.players.map(
      (p) => `${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating ?? "N/A"} OVR, ${p.nationality})`
    );

    const [oppGoals, oppAssists] = await Promise.all([
      prisma.matchEvent.findMany({
        where: { clubId: oppClub.id, type: "GOAL" },
        include: { player: { select: { fullName: true, position: true } } },
      }),
      prisma.matchEvent.findMany({
        where: { clubId: oppClub.id, OR: [{ type: "ASSIST" }, { assistPlayerId: { not: null } }] },
        include: {
          assistPlayer: { select: { fullName: true, position: true } },
          player: { select: { fullName: true, position: true } },
        },
      }),
    ]);

    const goalCounts: Record<string, number> = {};
    for (const e of oppGoals) {
      if (e.player) goalCounts[e.player.fullName] = (goalCounts[e.player.fullName] || 0) + 1;
    }

    const assistCounts: Record<string, number> = {};
    for (const e of oppAssists) {
      const p = e.assistPlayer || (e.type === "ASSIST" ? e.player : null);
      if (p) assistCounts[p.fullName] = (assistCounts[p.fullName] || 0) + 1;
    }

    opponentDataSummary = `
- Opponent Club: ${oppClub.name} (Manager: @${oppClub.manager?.username ?? "None"})
- Matchday: ${upcomingMatch.matchday} (${isHome ? "Playing at HOME 🏠" : "Playing AWAY ✈️"})
- Competition: ${upcomingMatch.season?.competitionSeason?.name || "League Match"}
- Opponent Roster (${oppPlayers.length} players):
  ${oppPlayers.join(", ")}
- Opponent Top Goalscorers in PMB: ${Object.entries(goalCounts).map(([n, g]) => `${n} (${g} goals)`).join(", ") || "None yet"}
- Opponent Top Playmakers in PMB: ${Object.entries(assistCounts).map(([n, a]) => `${n} (${a} assists)`).join(", ") || "None yet"}
`;
  }

  // 2. Fetch Market Samples (Free Agents & Rival players)
  const [freeAgentsSample, rivalSample] = await Promise.all([
    prisma.player.findMany({
      where: { status: "AVAILABLE", pmbClubId: null },
      orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
      take: 40,
    }),
    prisma.player.findMany({
      where: { status: "REGISTERED", pmbClubId: { not: club.id } },
      orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
      take: 35,
      include: { pmbClub: { select: { name: true } } },
    }),
  ]);

  const freeAgentsList = freeAgentsSample.map(
    (p) => `${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating ?? 75} OVR, €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M, ${p.nationality})`
  ).join("\n  ");

  const rivalPlayersList = rivalSample.map(
    (p) => `${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating ?? 75} OVR, €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M, Club: ${p.pmbClub?.name}, ${p.nationality})`
  ).join("\n  ");

  const mySquadList = club.players.map(
    (p) => `${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating ?? 75} OVR, ${p.nationality})`
  ).join("\n  ");

  const systemPrompt = `You are the VIP Chief Scout & Sporting Director of "${club.name}" in PMB League Manager.
You are in a direct conversation with your club manager.

=== LIVE IN-GAME DATABASE SNAPSHOT ===
YOUR CLUB:
- Club Name: ${club.name}
- League: ${club.league.name}
- Transfer Budget: €${budgetEur}M
- Current Registered Squad (${club.players.length} players):
  ${mySquadList}

NEXT OPPONENT & FIXTURE:
${opponentDataSummary}

IN-GAME TRANSFER MARKET POOL (AVAILABLE IN POSTGRESQL):
Free Agents (Instant Sign):
  ${freeAgentsList}

Rival Club Players (Transfer/Loan Prospects):
  ${rivalPlayersList}

=== STRICT OPERATING GUIDELINES ===
1. GROUNDING MANDATE: You are strictly restricted to the players, ratings, statistics, and clubs listed above from the in-game database. NEVER mention real-world squad memberships or players not found in this data.
2. In this universe, whatever club a player is listed under in the data is their true club.
3. Be professional, tactical, budget-conscious, and decisive like an elite Director of Football.
4. If asked about nationality (e.g. Moroccan, French, Brazilian, Senegalese), filter by the exact nationality listed in the data.
5. If asked about tactics against the opponent, analyze their actual registered players and top scorers shown above and suggest specific formations and marking duties.
6. Format your response cleanly using bold markdown, bullet points, and relevant emojis.
`;

  const contents: any[] = [];
  if (history.length > 0) {
    for (const h of history) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      });
    }
  }
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    throw new Error(`Gemini error: ${geminiRes.status} ${await geminiRes.text()}`);
  }

  const geminiData = await geminiRes.json();
  return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
}

async function runComprehensiveAudit() {
  const club = await prisma.club.findFirst({
    where: { name: { contains: "FAR Rabat", mode: "insensitive" } },
  });

  if (!club) throw new Error("FAR Rabat club not found");

  const testSuite = [
    // 2. Basic Questions
    { id: "BQ-1", cat: "Basic Questions", q: "Show me my squad." },
    { id: "BQ-2", cat: "Basic Questions", q: "What is my strongest position?" },
    { id: "BQ-3", cat: "Basic Questions", q: "What is my weakest position?" },
    { id: "BQ-4", cat: "Basic Questions", q: "Who is my best player?" },
    { id: "BQ-5", cat: "Basic Questions", q: "Who should I sign?" },
    { id: "BQ-6", cat: "Basic Questions", q: "Who should I sell?" },
    { id: "BQ-7", cat: "Basic Questions", q: "Analyze my squad." },

    // 3. Player Search
    { id: "PS-1", cat: "Player Search", q: "Find goalkeepers." },
    { id: "PS-2", cat: "Player Search", q: "Find defenders." },
    { id: "PS-3", cat: "Player Search", q: "Find midfielders." },
    { id: "PS-4", cat: "Player Search", q: "Find attackers." },
    { id: "PS-5", cat: "Player Search", q: "Find players rated 80+." },
    { id: "PS-6", cat: "Player Search", q: "Find players under €10M." },
    { id: "PS-7", cat: "Player Search", q: "Find available players." },
    { id: "PS-8", cat: "Player Search", q: "Find CBs rated 80+ under €15M." },
    { id: "PS-9", cat: "Player Search", q: "Find LWF players rated 82+." },
    { id: "PS-10", cat: "Player Search", q: "Find available CFs under €20M." },

    // 4. Nationality Search
    { id: "NS-1", cat: "Nationality Search", q: "Show Moroccan players." },
    { id: "NS-2", cat: "Nationality Search", q: "Show Algerian players." },
    { id: "NS-3", cat: "Nationality Search", q: "Show Senegalese players." },
    { id: "NS-4", cat: "Nationality Search", q: "Show French players." },
    { id: "NS-5", cat: "Nationality Search", q: "Find Moroccan CBs rated 80+." },
    { id: "NS-6", cat: "Nationality Search", q: "Find Brazilian attackers under €20M." },
    { id: "NS-7", cat: "Nationality Search", q: "Find French midfielders rated 82+." },

    // 5. Complex NLP Search
    { id: "NLP-1", cat: "Complex NLP", q: "Find me a Moroccan goalkeeper rated 80+ that I can afford." },
    { id: "NLP-2", cat: "Complex NLP", q: "Find me a fast winger under €15M." },
    { id: "NLP-3", cat: "Complex NLP", q: "Show me the best available striker for my budget." },
    { id: "NLP-4", cat: "Complex NLP", q: "Find a defender better than my current CB." },
    { id: "NLP-5", cat: "Complex NLP", q: "Find three cheap players who could improve my squad." },
    { id: "NLP-6", cat: "Complex NLP", q: "Find a young high-rated player." },
    { id: "NLP-7", cat: "Complex NLP", q: "Find the best value player available." },

    // 6. Budget Intelligence
    { id: "BI-1", cat: "Budget Intelligence", q: "What is my current budget?" },
    { id: "BI-2", cat: "Budget Intelligence", q: "What players can I afford?" },
    { id: "BI-3", cat: "Budget Intelligence", q: "Can I afford Somaila Sidibe?" },
    { id: "BI-4", cat: "Budget Intelligence", q: "What is the best player I can buy with my budget?" },
    { id: "BI-5", cat: "Budget Intelligence", q: "What if I spend €20M?" },
    { id: "BI-6", cat: "Budget Intelligence", q: "Give me three targets while keeping €10M in reserve." },

    // 8. Transfer Recommendations & Comparison
    { id: "TR-1", cat: "Transfer Recommendations", q: "Why should I prioritize a striker?" },
    { id: "TR-2", cat: "Transfer Recommendations", q: "Give me cheaper alternatives." },
    { id: "TR-3", cat: "Player Comparison", q: "Compare Lionel Messi and Somaila Sidibe." },

    // 10. Next Opponent
    { id: "NO-1", cat: "Next Opponent", q: "Who is my next opponent?" },
    { id: "NO-2", cat: "Next Opponent", q: "Scout my next opponent." },
    { id: "NO-3", cat: "Next Opponent", q: "How strong are they?" },
    { id: "NO-4", cat: "Next Opponent", q: "Who are their best players?" },
    { id: "NO-5", cat: "Next Opponent", q: "What is their weakest area?" },
    { id: "NO-6", cat: "Next Opponent", q: "How should I play against them?" },

    // 12. Hallucinations Check
    { id: "HAL-1", cat: "Hallucination Check", q: "Find Kylian Mbappe in Raja Casablanca." },
    { id: "HAL-2", cat: "Hallucination Check", q: "Show me 99 rated Japanese defenders under 1M." },
    { id: "HAL-3", cat: "Hallucination Check", q: "Tell me the weather in Casablanca for our match." },
  ];

  const auditLog: Array<{ id: string; cat: string; q: string; response: string }> = [];

  console.log(`Starting execution of ${testSuite.length} tests against FAR Rabat...`);

  for (let i = 0; i < testSuite.length; i++) {
    const test = testSuite[i];
    process.stdout.write(`[${i + 1}/${testSuite.length}] ${test.id} (${test.cat}): "${test.q}" ... `);

    try {
      const response = await executeScoutChat(club.id, test.q);
      auditLog.push({ id: test.id, cat: test.cat, q: test.q, response });
      console.log(`✓ (${response.length} chars)`);
    } catch (e: any) {
      console.log(`✗ Failed: ${e.message}`);
      auditLog.push({ id: test.id, cat: test.cat, q: test.q, response: `ERROR: ${e.message}` });
    }

    await new Promise((r) => setTimeout(r, 750));
  }

  // Multi-step conversation test
  console.log("\nTesting Multi-Step Conversation Context...");
  const multiStepHistory: Array<{ role: string; text: string }> = [];
  const multiStepQuestions = [
    "Find me a CF under €15M.",
    "Only Moroccan players.",
    "Give me cheaper options.",
    "Which one would you choose?",
  ];

  const multiStepLog: Array<{ step: number; q: string; response: string }> = [];
  for (let i = 0; i < multiStepQuestions.length; i++) {
    const q = multiStepQuestions[i];
    process.stdout.write(`MultiStep [${i + 1}/4]: "${q}" ... `);
    const resp = await executeScoutChat(club.id, q, multiStepHistory);
    multiStepLog.push({ step: i + 1, q, response: resp });
    multiStepHistory.push({ role: "user", text: q });
    multiStepHistory.push({ role: "model", text: resp });
    console.log(`✓ (${resp.length} chars)`);
    await new Promise((r) => setTimeout(r, 750));
  }

  fs.writeFileSync(
    path.resolve(process.cwd(), "scratch/audit-results-full.json"),
    JSON.stringify({ singleQueries: auditLog, multiStep: multiStepLog }, null, 2),
    "utf-8"
  );

  console.log("\n✅ FULL AUDIT TEST SUITE COMPLETED! Results saved to scratch/audit-results-full.json");
}

runComprehensiveAudit().finally(() => prisma.$disconnect());
