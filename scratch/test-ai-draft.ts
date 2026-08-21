import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDraft() {
  const farClub = await prisma.club.findFirst({
    where: { name: { contains: "FAR", mode: "insensitive" } },
    include: { manager: true },
  });

  if (!farClub) {
    console.log("No FAR club found");
    return;
  }

  console.log("Testing AI Draft Assistant in Moroccan Darija...");
  const res = await fetch("http://localhost:3000/api/social/ai-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "DERBY_HYPE",
      language: "AR",
      customNote: "Match against Raja Casablanca",
    }),
  }).catch(() => null);

  console.log("Draft endpoint test complete.");
}

testDraft().finally(() => prisma.$disconnect());
