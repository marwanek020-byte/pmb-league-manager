import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function testFullGeminiScout() {
  console.log("=================================================");
  console.log("🤖 TESTING FULL GEMINI GROUNDED CHIEF SCOUT");
  console.log("=================================================\n");

  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
  const geminiApiKey = match ? match[1] : null;

  const club = await prisma.club.findFirst({
    where: { aiScoutEnabled: true },
    include: {
      league: true,
      players: { where: { status: "REGISTERED" }, orderBy: { overallRating: "desc" } },
    },
  });

  if (!club) {
    console.error("No club found");
    return;
  }

  console.log(`Club: ${club.name} | Budget: €${(Number(club.budget) / 1_000_000).toFixed(1)}M | Players: ${club.players.length}`);

  // Fetch upcoming match
  const upcomingMatch = await prisma.match.findFirst({
    where: { OR: [{ homeClubId: club.id }, { awayClubId: club.id }], status: "UPCOMING" },
    include: {
      homeClub: { include: { players: { where: { status: "REGISTERED" }, orderBy: { overallRating: "desc" } } } },
      awayClub: { include: { players: { where: { status: "REGISTERED" }, orderBy: { overallRating: "desc" } } } },
    },
  });

  const isHome = upcomingMatch ? upcomingMatch.homeClubId === club.id : true;
  const oppClub = upcomingMatch ? (isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub) : null;

  // Fetch free agents
  const freeAgents = await prisma.player.findMany({
    where: { status: "AVAILABLE", pmbClubId: null },
    take: 20,
    orderBy: { overallRating: "desc" },
  });

  const prompt = `You are the Chief Scout of "${club.name}" in PMB League.
Budget: €${(Number(club.budget) / 1_000_000).toFixed(1)}M.
Your Squad: ${club.players.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR, ${p.nationality})`).join(", ")}
${oppClub ? `Next Opponent: ${oppClub.name} with players: ${oppClub.players.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR)`).join(", ")}` : ""}
Available Free Agents in DB: ${freeAgents.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR, €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M, ${p.nationality})`).join(", ")}

CRITICAL RULE: Only talk about players in the list above.

Manager asks: "Give me a quick tactical plan on who is my best available target to strengthen my squad and why."`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await res.json();
  console.log("\n=================================================");
  console.log("🌟 GEMINI CHIEF SCOUT GROUNDED RESPONSE:");
  console.log("=================================================\n");
  console.log(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

testFullGeminiScout().finally(() => prisma.$disconnect());
