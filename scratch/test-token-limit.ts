import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function testFullQuery() {
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

  const question = "How should I set up my squad against our next opponent?";

  // Fetch upcoming match
  const upcomingMatch = await prisma.match.findFirst({
    where: { OR: [{ homeClubId: club!.id }, { awayClubId: club!.id }], status: "UPCOMING" },
    include: {
      homeClub: { include: { players: { where: { status: "REGISTERED" }, orderBy: { overallRating: "desc" } } } },
      awayClub: { include: { players: { where: { status: "REGISTERED" }, orderBy: { overallRating: "desc" } } } },
    },
  });

  const isHome = upcomingMatch ? upcomingMatch.homeClubId === club!.id : true;
  const oppClub = upcomingMatch ? (isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub) : null;

  const systemPrompt = `You are the Chief Scout of "${club!.name}" in PMB League.
Budget: €${(Number(club!.budget) / 1_000_000).toFixed(1)}M.
Your Squad: ${club!.players.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR)`).join(", ")}
${oppClub ? `Next Opponent: ${oppClub.name} with players: ${oppClub.players.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR)`).join(", ")}` : ""}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    }
  );

  const data = await res.json();
  console.log("Full Output Length:", data.candidates?.[0]?.content?.parts?.[0]?.text.length);
  console.log("Output Ending:\n...", data.candidates?.[0]?.content?.parts?.[0]?.text.slice(-300));
}

testFullQuery().finally(() => prisma.$disconnect());
