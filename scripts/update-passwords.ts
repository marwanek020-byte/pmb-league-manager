import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const NEW_PASSWORD = "PMB2026New!";

async function main() {
  console.log(`Starting password update...`);
  console.log(`Target: All Club Managers except BOTOLA PRO.`);
  console.log(`New password: ${NEW_PASSWORD}`);

  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

  // Fetch all club managers with their club and league information
  const users = await prisma.user.findMany({
    where: {
      role: Role.CLUB_MANAGER,
    },
    include: {
      club: {
        include: {
          league: true,
        },
      },
    },
    orderBy: [
      { club: { league: { name: "asc" } } },
      { username: "asc" },
    ],
  });

  const botolaUsers: typeof users = [];
  const targetUsers: typeof users = [];

  for (const user of users) {
    const leagueName = user.club?.league?.name || "";
    if (leagueName.toUpperCase().includes("BOTOLA")) {
      botolaUsers.push(user);
    } else {
      targetUsers.push(user);
    }
  }

  console.log(`Found ${users.length} total club managers:`);
  console.log(`- BOTOLA PRO managers (SKIPPED): ${botolaUsers.length}`);
  console.log(`- Non-BOTOLA managers (TO UPDATE): ${targetUsers.length}`);

  if (targetUsers.length === 0) {
    console.log("No non-Botola managers found. Exiting.");
    return;
  }

  // Update target users
  const targetUserIds = targetUsers.map((u) => u.id);

  const updateResult = await prisma.user.updateMany({
    where: {
      id: { in: targetUserIds },
    },
    data: {
      password: hashedPassword,
    },
  });

  console.log(`Updated ${updateResult.count} accounts in the database.`);

  // Group by league for summary
  const leagueCounts: Record<string, number> = {};
  for (const user of targetUsers) {
    const lName = user.club?.league?.name || "Unknown";
    leagueCounts[lName] = (leagueCounts[lName] || 0) + 1;
  }

  console.log("\nSummary of updated leagues:");
  for (const [league, count] of Object.entries(leagueCounts)) {
    console.log(`- ${league}: ${count} clubs updated`);
  }

  // Verification step
  console.log("\n--- VERIFICATION ---");
  const testTargetUser = await prisma.user.findUnique({
    where: { id: targetUsers[0].id },
    select: { username: true, password: true },
  });

  if (testTargetUser) {
    const matchNew = await bcrypt.compare(NEW_PASSWORD, testTargetUser.password);
    const matchOld = await bcrypt.compare("PMB2026!", testTargetUser.password);
    console.log(
      `Test Target Account (${testTargetUser.username}): New password valid? ${matchNew} | Old password valid? ${matchOld}`
    );
  }

  if (botolaUsers.length > 0) {
    const testBotolaUser = await prisma.user.findUnique({
      where: { id: botolaUsers[0].id },
      select: { username: true, password: true },
    });

    if (testBotolaUser) {
      const matchOldBotola = await bcrypt.compare("PMB2026!", testBotolaUser.password);
      const matchNewBotola = await bcrypt.compare(NEW_PASSWORD, testBotolaUser.password);
      console.log(
        `Test Botola Account (${testBotolaUser.username}): Old password valid? ${matchOldBotola} | New password valid? ${matchNewBotola}`
      );
    }
  }

  // Check admin
  const adminUser = await prisma.user.findUnique({
    where: { username: "admin" },
    select: { username: true, password: true },
  });
  if (adminUser) {
    const matchAdmin = await bcrypt.compare("PMBAdmin2026!", adminUser.password);
    console.log(`Admin Account (${adminUser.username}): Admin password valid? ${matchAdmin}`);
  }

  console.log("\nPassword update process completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error executing password update:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
