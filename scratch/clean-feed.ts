import { PrismaClient } from "@prisma/client";
import { UltrasSocialService } from "../src/lib/services/ultras-social-service";

const prisma = new PrismaClient();

async function cleanAndRegenerate() {
  console.log("Cleaning old posts with messy formatting...");
  await prisma.post.deleteMany({
    where: { content: { contains: "HERE WE GO" } },
  });

  const farClub = await prisma.club.findFirst({ where: { name: { contains: "FAR", mode: "insensitive" } } });
  if (farClub) {
    console.log("Regenerating clean transfer post...");
    await UltrasSocialService.publishTransferAnnouncement({
      playerName: "Abdelfettah Hadraf",
      position: "LWF",
      overallRating: 78,
      feeEur: 0,
      fromClubName: "West Ham",
      toClubName: farClub.name,
      buyerClubId: farClub.id,
      transferType: "PERMANENT",
    });
  }

  console.log("Feed refreshed with clean layout!");
}

cleanAndRegenerate().finally(() => prisma.$disconnect());
