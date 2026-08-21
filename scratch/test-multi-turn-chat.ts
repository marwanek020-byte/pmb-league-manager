import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function testMultiTurn() {
  console.log("=================================================");
  console.log("🧠 TESTING MULTI-TURN CONVERSATION MEMORY");
  console.log("=================================================\n");

  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
  const geminiApiKey = match ? match[1] : null;

  const club = await prisma.club.findFirst({
    where: { name: { contains: "FAR Rabat", mode: "insensitive" } },
    include: {
      league: true,
      players: { where: { status: "REGISTERED" } },
    },
  });

  const freeAgents = await prisma.player.findMany({
    where: { status: "AVAILABLE", pmbClubId: null },
    take: 30,
    orderBy: { overallRating: "desc" },
  });

  const systemPrompt = `You are the Chief Scout of "${club!.name}" in PMB League.
Budget: €${(Number(club!.budget) / 1_000_000).toFixed(1)}M.
Your Squad: ${club!.players.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR, ${p.nationality})`).join(", ")}
Available Free Agents: ${freeAgents.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR, €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M, ${p.nationality})`).join(", ")}`;

  const conversation = [
    "Find me a CF under €15M.",
    "Only Moroccan players.",
    "Which one would you choose for my starting lineup?",
  ];

  const history: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < conversation.length; i++) {
    const q = conversation[i];
    console.log(`\n💬 [Turn ${i + 1}] Manager: "${q}"`);

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const h of history) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      });
    }
    contents.push({ role: "user", parts: [{ text: q }] });

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
          }),
        }
      );

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || data.error?.message || "No response";
      console.log(`🤖 AI Scout:\n${reply.slice(0, 300)}...`);

      history.push({ role: "user", content: q });
      history.push({ role: "assistant", content: reply });
    } catch (err: any) {
      console.error("Turn failed:", err.message);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
}

testMultiTurn().finally(() => prisma.$disconnect());
