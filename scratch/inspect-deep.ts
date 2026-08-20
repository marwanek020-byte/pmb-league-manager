import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const nationalities = await prisma.player.groupBy({
    by: ["nationality"],
    _count: { nationality: true },
    orderBy: { _count: { nationality: "desc" } },
    take: 25,
  });

  const positions = await prisma.player.groupBy({
    by: ["position"],
    _count: { position: true },
    orderBy: { _count: { position: "desc" } },
  });

  const recentTransfers = await prisma.transfer.findMany({
    where: { status: "COMPLETED" },
    take: 5,
    include: {
      player: { select: { fullName: true, overallRating: true, position: true } },
      fromClub: { select: { name: true } },
      toClub: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log("Top Nationalities in DB:", nationalities);
  console.log("Unique Positions in DB:", positions);
  console.log("Recent Completed Transfers:", recentTransfers);
}

main().finally(() => prisma.$disconnect());
