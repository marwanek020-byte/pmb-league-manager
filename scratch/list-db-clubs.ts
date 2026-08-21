import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function listAllClubs() {
  const leagues = await prisma.league.findMany({
    include: {
      clubs: {
        select: {
          id: true,
          name: true,
          logo: true,
          manager: {
            select: { username: true },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  console.log("=========================================");
  console.log("🏆 ALL CLUBS IN YOUR DATABASE (BY LEAGUE)");
  console.log("=========================================\n");

  for (const l of leagues) {
    console.log(`📌 LEAGUE: ${l.name} (${l.country}) — ${l.clubs.length} Clubs`);
    l.clubs.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.name} (Manager: @${c.manager?.username || "unassigned"})`);
    });
    console.log("");
  }
}

listAllClubs().finally(() => prisma.$disconnect());
