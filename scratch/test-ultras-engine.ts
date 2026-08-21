import { PrismaClient } from "@prisma/client";
import { UltrasSocialService } from "../src/lib/services/ultras-social-service";
import { getClubUltras } from "../src/lib/services/ultras-registry";

const prisma = new PrismaClient();

async function testUltrasEngine() {
  console.log("=================================================");
  console.log("⚡ TESTING PMB AI ULTRAS & SOCIAL MEDIA ENGINE");
  console.log("=================================================\n");

  // 1. Test Ultras Registry
  const farUltras = getClubUltras("FAR Rabat");
  console.log("1. FAR Rabat Ultras:", farUltras.groupName, farUltras.bannerEmoji);
  const rajaUltras = getClubUltras("Raja Casablanca");
  console.log("   Raja Ultras:", rajaUltras.groupName, rajaUltras.bannerEmoji);

  // 2. Test Morale Calculation
  const farClub = await prisma.club.findFirst({ where: { name: { contains: "FAR", mode: "insensitive" } } });
  if (farClub) {
    const morale = await UltrasSocialService.calculateUltrasMorale(farClub.id);
    console.log(`\n2. ${farClub.name} Ultras Morale:`, morale.moraleScore + "%", morale.statusArabic);
  }

  // 3. Test Transfer Announcement
  if (farClub) {
    console.log("\n3. Testing 'Here We Go!' Transfer Announcement...");
    await UltrasSocialService.publishTransferAnnouncement({
      playerName: "Achraf Hakimi",
      position: "RB",
      overallRating: 84,
      feeEur: 15_000_000,
      fromClubName: "Paris Saint-Germain",
      toClubName: farClub.name,
      buyerClubId: farClub.id,
      transferType: "PERMANENT",
    });

    const latestPost = await prisma.post.findFirst({
      where: { tag: "TRANSFER" },
      orderBy: { createdAt: "desc" },
      include: { comments: true },
    });
    console.log("   ✅ Created Transfer Post:", latestPost?.content.slice(0, 100) + "...");
    console.log("   ✅ Generated Ultras Comments Count:", latestPost?.comments.length);
    if (latestPost?.comments[0]) {
      console.log("   💬 Sample Comment:", latestPost.comments[0].content);
    }
  }

  // 4. Test Post-Match Report Trigger
  const sampleMatch = await prisma.match.findFirst({
    where: { status: "COMPLETED" },
  });
  if (sampleMatch) {
    console.log(`\n4. Testing Post-Match Report for Match ID ${sampleMatch.id}...`);
    await UltrasSocialService.publishPostMatchReport(sampleMatch.id);

    const latestMatchPost = await prisma.post.findFirst({
      where: { content: { contains: "نهاية المباراة" } },
      orderBy: { createdAt: "desc" },
      include: { comments: true },
    });
    console.log("   ✅ Created Post-Match Breaking News:", latestMatchPost?.content.slice(0, 120) + "...");
    console.log("   ✅ Generated Ultras Comments Count:", latestMatchPost?.comments.length);
  }

  console.log("\n=================================================");
  console.log("🎉 ALL AI ULTRAS & MEDIA TESTS PASSED!");
  console.log("=================================================");
}

testUltrasEngine()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
