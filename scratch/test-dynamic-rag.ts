import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDynamicRAG() {
  console.log("Testing Dynamic Targeted SQL Search on all 422 players...\n");

  const query1 = "Find players from Hassania Agadir";
  const lower1 = query1.toLowerCase();

  const allClubs = await prisma.club.findMany({ select: { id: true, name: true } });
  const mentionedClub = allClubs.find((c) => lower1.includes(c.name.toLowerCase()));

  console.log(`Query: "${query1}"`);
  console.log(`Detected Club:`, mentionedClub?.name);

  if (mentionedClub) {
    const players = await prisma.player.findMany({
      where: { pmbClubId: mentionedClub.id },
      orderBy: { overallRating: "desc" },
    });
    console.log(`Found ${players.length} registered players in ${mentionedClub.name}:`);
    players.slice(0, 5).forEach((p) => {
      console.log(`- ${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR, ${p.nationality})`);
    });
  }

  const query2 = "Find Senegalese wingers under €10M";
  const lower2 = query2.toLowerCase();
  const targetedWhere2: any = {
    nationality: { contains: "Senegal", mode: "insensitive" },
    OR: [
      { position: { contains: "lwf", mode: "insensitive" } },
      { position: { contains: "rwf", mode: "insensitive" } },
      { position: { contains: "lw", mode: "insensitive" } },
      { position: { contains: "rw", mode: "insensitive" } },
    ],
  };

  const senegaleseWingers = await prisma.player.findMany({
    where: targetedWhere2,
    include: { pmbClub: { select: { name: true } } },
  });

  console.log(`\nQuery: "${query2}"`);
  console.log(`Found ${senegaleseWingers.length} Senegalese wingers across the entire database:`);
  senegaleseWingers.forEach((p) => {
    console.log(`- ${p.fullName} (${p.position}, ${p.overallRating ?? 75} OVR, Club: ${p.pmbClub?.name || "Free Agent"})`);
  });
}

testDynamicRAG().finally(() => prisma.$disconnect());
