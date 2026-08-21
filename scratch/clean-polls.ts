import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanOldPolls() {
  console.log("Cleaning fake unplayed mock polls...");
  await (prisma as any).managerPollVote.deleteMany({});
  await (prisma as any).managerPollOption.deleteMany({});
  await (prisma as any).managerPoll.deleteMany({});
  console.log("Deleted old mock polls successfully!");
}

cleanOldPolls().finally(() => prisma.$disconnect());
