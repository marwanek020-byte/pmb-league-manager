import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const availablePlayers = await prisma.player.findMany({
    where: { status: "AVAILABLE" },
    select: {
      fullName: true,
      position: true,
      overallRating: true,
      marketValue: true,
      pmbClubId: true,
    },
  });
  console.log("ALL AVAILABLE PLAYERS (16 total):", availablePlayers);
}

main().finally(() => prisma.$disconnect());
