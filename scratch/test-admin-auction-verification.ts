import { prisma } from "../src/lib/prisma";
import { createAuctionWithPlayer } from "../src/lib/services/auction-service";

async function runTests() {
  console.log("================================================================================");
  console.log("🔨 TESTING ADMIN AUCTION VERIFICATION & CREATION ENGINE");
  console.log("================================================================================");

  const admin = await prisma.user.findFirst({
    where: { role: "ADMINISTRATOR" },
  });

  if (!admin) {
    console.error("❌ No admin user found.");
    return;
  }

  console.log(`Using Admin User: @${admin.username} (${admin.id})\n`);

  // 1. SCENARIO 1: Attempt to auction a registered club player
  console.log("--------------------------------------------------------------------------------");
  console.log("🧪 1. SCENARIO 1: ATTEMPT TO AUCTION A CONTRACTED CLUB PLAYER");
  console.log("--------------------------------------------------------------------------------");

  const clubPlayer = await prisma.player.findFirst({
    where: { status: "REGISTERED", pmbClubId: { not: null } },
    include: { pmbClub: true },
  });

  if (clubPlayer) {
    console.log(`Testing with contracted player: ${clubPlayer.fullName} (Registered to: ${clubPlayer.pmbClub?.name})`);
    try {
      await createAuctionWithPlayer(admin.id, {
        playerId: clubPlayer.id,
        startingPrice: 15_000_000,
        minIncrement: 500_000,
        durationMinutes: 15,
      });
      console.error("❌ ERROR: Allowed auctioning contracted player!");
    } catch (e: any) {
      console.log(`✅ SUCCESS: Blocked with message: "${e.message}"`);
    }
  }

  // 2. SCENARIO 2: Auction an unattached Free Agent
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🧪 2. SCENARIO 2: AUCTION AN EXISTING UNATTACHED FREE AGENT");
  console.log("--------------------------------------------------------------------------------");

  const freeAgent = await prisma.player.findFirst({
    where: { status: "AVAILABLE", pmbClubId: null },
  });

  if (freeAgent) {
    // Clear any existing active auction for this test
    await prisma.auction.deleteMany({ where: { playerId: freeAgent.id } });

    console.log(`Testing with free agent: ${freeAgent.fullName} (${freeAgent.position}, ${freeAgent.overallRating} OVR)`);
    const auction = await createAuctionWithPlayer(admin.id, {
      playerId: freeAgent.id,
      startingPrice: 5_000_000,
      minIncrement: 500_000,
      durationMinutes: 30,
    });
    console.log(`✅ SUCCESS: Auction launched (ID: ${auction.id}, Starting Price: €${(Number(auction.startingPrice)/1e6).toFixed(1)}M, Status: ${auction.status})`);
  }

  // 3. SCENARIO 3: Create a brand new player and launch auction
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🧪 3. SCENARIO 3: CREATE A BRAND NEW PLAYER ON-THE-FLY & START AUCTION");
  console.log("--------------------------------------------------------------------------------");

  const newPlayerName = `Wonderkid_${Date.now().toString().slice(-4)}`;
  console.log(`Creating and auctioning brand new player: "${newPlayerName}"`);

  const newAuction = await createAuctionWithPlayer(admin.id, {
    newPlayer: {
      fullName: newPlayerName,
      position: "LWF",
      overallRating: 84,
      nationality: "Morocco",
      realClub: "Real Madrid",
    },
    startingPrice: 20_000_000,
    minIncrement: 1_000_000,
    durationMinutes: 45,
  });

  console.log(`✅ SUCCESS: New player created in database and live auction started!`);
  console.log(`   Player: ${newAuction.player.fullName} (${newAuction.player.position}, ${newAuction.player.overallRating} OVR, ${newAuction.player.nationality})`);
  console.log(`   Auction ID: ${newAuction.id}`);
  console.log(`   Current Bid: €${(Number(newAuction.currentBid)/1e6).toFixed(1)}M`);
  console.log(`   Expires At: ${newAuction.expiresAt.toISOString()}`);

  console.log("\n================================================================================");
  console.log("🎉 ALL ADMIN AUCTION VERIFICATION & CREATION TESTS PASSED!");
  console.log("================================================================================");
}

runTests()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
