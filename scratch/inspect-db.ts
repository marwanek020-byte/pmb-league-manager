import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const totalPlayers = await prisma.player.count();
  const availableCount = await prisma.player.count({ where: { status: "AVAILABLE" } });
  const registeredCount = await prisma.player.count({ where: { status: "REGISTERED" } });

  const samplePlayers = await prisma.player.findMany({
    take: 20,
    select: {
      fullName: true,
      position: true,
      overallRating: true,
      realClub: true,
      status: true,
    },
  });

  const goalkeepers = await prisma.player.findMany({
    where: {
      position: { contains: "GK", mode: "insensitive" },
    },
    take: 10,
    select: {
      fullName: true,
      position: true,
      overallRating: true,
      realClub: true,
      status: true,
    },
  });

  console.log("TOTAL PLAYERS:", totalPlayers);
  console.log("AVAILABLE:", availableCount, "REGISTERED:", registeredCount);
  console.log("SAMPLE PLAYERS:", samplePlayers);
  console.log("GOALKEEPERS FOUND:", goalkeepers);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
