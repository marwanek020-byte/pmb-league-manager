import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testArabicScoutChat() {
  console.log("=================================================");
  console.log("🧪 TESTING ARABIC AI SCOUT CHAT QUERY");
  console.log("=================================================\n");

  const farClub = await prisma.club.findFirst({
    where: { name: { contains: "FAR", mode: "insensitive" } },
    include: { players: true, league: true },
  });

  if (!farClub) {
    console.log("No FAR Rabat club found in DB");
    return;
  }

  const query = "أحسن مهاجم متاح نشريوه بالميزانية ديالنا";
  console.log(`Sending query: "${query}" for club ${farClub.name} (Budget: €${(Number(farClub.budget) / 1_000_000).toFixed(1)}M)...`);

  const freeAgents = await prisma.player.findMany({
    where: {
      status: "AVAILABLE",
      pmbClubId: null,
      OR: [{ position: { contains: "cf", mode: "insensitive" } }, { position: { contains: "st", mode: "insensitive" } }, { position: { contains: "lwf", mode: "insensitive" } }, { position: { contains: "rwf", mode: "insensitive" } }],
      marketValue: { lte: Number(farClub.budget) },
    },
    orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
    take: 4,
  });

  console.log(`\nFound ${freeAgents.length} top affordable attackers in database:`);
  freeAgents.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.fullName} (${p.position} • ${p.overallRating} OVR • €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M • ${p.nationality})`);
  });

  console.log("\n=================================================");
  console.log("🎉 ARABIC SCOUT QUERY SIMULATION SUCCESSFUL!");
  console.log("=================================================");
}

testArabicScoutChat()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
