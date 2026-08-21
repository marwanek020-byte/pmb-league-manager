import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPolls() {
  const polls = await prisma.managerPoll.findMany({
    include: { options: true, votes: true },
  });
  console.log("Existing Manager Polls in DB:", JSON.stringify(polls, null, 2));
}

checkPolls().finally(() => prisma.$disconnect());
