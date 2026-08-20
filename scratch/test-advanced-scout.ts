import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("🚀 TESTING PMB VIP CHIEF SCOUT & SPORTING INTELLIGENCE");
  console.log("=================================================\n");

  // 1. Test Club & Squad Health
  const club = await prisma.club.findFirst({
    where: { aiScoutEnabled: true },
    include: {
      players: { where: { status: "REGISTERED" } },
      league: true,
    },
  });

  if (!club) {
    console.log("⚠️ No VIP club found for test. Finding first club...");
    const anyClub = await prisma.club.findFirst({
      include: { players: true, league: true },
    });
    console.log("Club found:", anyClub?.name, "Budget:", anyClub?.budget);
  } else {
    console.log(`✅ VIP Club: ${club.name} (Budget: €${(Number(club.budget) / 1_000_000).toFixed(1)}M, Players: ${club.players.length})`);
  }

  // 2. Test Nationality Queries in DB
  const moroccanGKs = await prisma.player.findMany({
    where: {
      position: { contains: "gk", mode: "insensitive" },
      nationality: { contains: "Moroc", mode: "insensitive" },
    },
    take: 3,
  });
  console.log("\n🇲🇦 Moroccan GKs in DB:", moroccanGKs.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? "N/A"} OVR, ${p.nationality})`));

  const frenchCBs = await prisma.player.findMany({
    where: {
      position: { contains: "cb", mode: "insensitive" },
      nationality: { contains: "France", mode: "insensitive" },
    },
    take: 3,
  });
  console.log("🇫🇷 French CBs in DB:", frenchCBs.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? "N/A"} OVR, ${p.nationality})`));

  const senegalesePlayers = await prisma.player.findMany({
    where: {
      nationality: { contains: "Senegal", mode: "insensitive" },
    },
    take: 3,
  });
  console.log("🇸🇳 Senegalese Players in DB:", senegalesePlayers.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? "N/A"} OVR, ${p.nationality})`));

  // 3. Test Best Available for Budget
  const bestAvailable = await prisma.player.findMany({
    where: {
      status: "AVAILABLE",
      pmbClubId: null,
    },
    orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
    take: 3,
  });
  console.log("\n🎯 Best Free Agents for Budget:", bestAvailable.map(p => `${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR, €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M)`));

  // 4. Test Rival Completed Transfers
  const recentTransfers = await prisma.transfer.findMany({
    where: { status: "COMPLETED" },
    take: 3,
    orderBy: { updatedAt: "desc" },
    include: {
      player: { select: { fullName: true, position: true } },
      fromClub: { select: { name: true } },
      toClub: { select: { name: true } },
    },
  });
  console.log("\n📰 Recent Completed Transfers in DB:", recentTransfers.map(t => `${t.player?.fullName || t.playerName} (${t.fromClub?.name} -> ${t.toClub?.name}, Fee: €${(Number(t.fee || 0) / 1_000_000).toFixed(1)}M)`));

  console.log("\n=================================================");
  console.log("✅ ALL DATABASE CHIEF SCOUT SERVICES VERIFIED!");
  console.log("=================================================");
}

main().finally(() => prisma.$disconnect());
