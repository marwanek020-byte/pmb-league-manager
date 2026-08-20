import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clubs = await prisma.club.findMany({
    take: 3,
    select: { id: true, name: true },
  });

  console.log("Sample clubs:", clubs);

  for (const c of clubs) {
    const upcoming = await prisma.match.findFirst({
      where: {
        OR: [{ homeClubId: c.id }, { awayClubId: c.id }],
        status: "UPCOMING",
      },
      orderBy: { matchday: "asc" },
      include: {
        homeClub: { include: { players: { take: 3 } } },
        awayClub: { include: { players: { take: 3 } } },
      },
    });

    console.log(`Upcoming match for ${c.name}:`, upcoming ? `${upcoming.homeClub.name} vs ${upcoming.awayClub.name} (MD ${upcoming.matchday})` : "None");
  }
}

main().finally(() => prisma.$disconnect());
