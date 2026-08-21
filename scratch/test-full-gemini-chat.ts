import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { OpponentTacticalService } from "../src/lib/services/opponent-tactical-service";

async function testFullPrompt() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  let apiKey = "";
  for (const line of envContent.split("\n")) {
    if (line.startsWith("GEMINI_API_KEY=") || line.startsWith("GOOGLE_GEMINI_API_KEY=")) {
      apiKey = line.split("=")[1]?.trim().replace(/^["']|["']$/g, "") || "";
    }
  }

  const club = await prisma.club.findFirst({
    where: { name: { contains: "FAR", mode: "insensitive" } },
    include: {
      league: true,
      players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
      manager: { select: { username: true } },
    },
  }) || await prisma.club.findFirst({
    include: {
      league: true,
      players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
      manager: { select: { username: true } },
    },
  });

  if (!club) {
    console.error("No club found");
    return;
  }

  console.log("Found Club:", club.name, "Budget:", Number(club.budget));

  const [allLeagues, allClubs, upcomingMatch, opponentDossier, topFreeAgents, topRivalPlayers, activeAuctions] = await Promise.all([
    prisma.league.findMany({ select: { name: true, country: true } }),
    prisma.club.findMany({ select: { name: true, league: { select: { name: true } } } }),
    prisma.match.findFirst({
      where: { OR: [{ homeClubId: club.id }, { awayClubId: club.id }], status: "UPCOMING" },
      include: {
        homeClub: { include: { players: { where: { status: "REGISTERED" } }, manager: true } },
        awayClub: { include: { players: { where: { status: "REGISTERED" } }, manager: true } },
      },
    }),
    OpponentTacticalService.generatePreMatchDossier(club.id),
    prisma.player.findMany({ where: { status: "AVAILABLE", pmbClubId: null }, take: 20, orderBy: { overallRating: "desc" } }),
    prisma.player.findMany({ where: { status: "REGISTERED", pmbClubId: { not: club.id } }, take: 20, orderBy: { overallRating: "desc" }, include: { pmbClub: true } }),
    prisma.auction.findMany({ where: { status: "ACTIVE" }, include: { player: true }, take: 5 }),
  ]);

  const models = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.6-flash"];

  const userQuestion = "عطيني خطة الماتش الجاي ونقاط القوة والضعف ديال الخصم والتشكيلة المناسبة";

  const systemPrompt = `You are the VIP Chief Scout, Sporting Director, and Tactical Analyst of "${club.name}" in PMB League Manager.
You have direct access to the entire database:
- Club: ${club.name} (League: ${club.league.name}, Budget: €${(Number(club.budget)/1e6).toFixed(1)}M)
- Registered Squad: ${club.players.map(p => `${p.fullName} (${p.position}, ${p.overallRating} OVR)`).join(", ")}
- Upcoming Match: ${upcomingMatch ? `Playing vs ${upcomingMatch.homeClubId === club.id ? upcomingMatch.awayClub.name : upcomingMatch.homeClub.name} (Matchday ${upcomingMatch.matchday})` : "No match scheduled yet"}
- Opponent Dossier: Win Prob ${opponentDossier.simulationOutcome.winProbability}%, Danger Man: ${opponentDossier.tacticalPlan.keyThreat}, Weakness: ${opponentDossier.tacticalPlan.vulnerabilityZone}, Recommended Setup: ${opponentDossier.tacticalPlan.recommendedFormation}

Respond to the manager's question in Moroccan Darija / Arabic with extreme tactical detail, structured sections (🎯 خطة المباراة, ⚔️ تحليل الخصم, ⭐ أخطر اللاعبين, 📋 التشكيلة المقترحة), and zero raw markdown asterisks.`;

  for (const m of models) {
    try {
      console.log(`Trying model: ${m}...`);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userQuestion }] }],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log(`\n🎉 SUCCESS with ${m}!\nReply:\n`, data?.candidates?.[0]?.content?.parts?.[0]?.text);
        break;
      } else {
        console.log(`Failed with ${m}: ${res.status}`, data?.error?.message);
      }
    } catch (e: any) {
      console.log(`Exception with ${m}:`, e.message);
    }
  }
}

testFullPrompt()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
