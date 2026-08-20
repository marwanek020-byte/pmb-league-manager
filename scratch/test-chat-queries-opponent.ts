import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testOpponentScouting(message: string) {
  console.log(`\n========================================`);
  console.log(`QUERY: "${message}"`);
  console.log(`========================================`);

  const lower = message.toLowerCase().trim();
  const isOpponentQuery = /\b(opponent|next match|next game|fixture|scout next|scouting report|beat|vs)\b/i.test(lower);
  const scoutClubMatch = lower.match(/\b(?:scout|analyze|breakdown|examine|how to beat)\s+([a-z0-9\s]+?)(?:\s+(?:squad|team|players|best player|top scorer|assists))?$/i);

  console.log("isOpponentQuery:", isOpponentQuery, "scoutClubMatch:", scoutClubMatch ? scoutClubMatch[1] : null);

  let oppClub: any = null;
  if (scoutClubMatch) {
    const queryClubName = scoutClubMatch[1].trim();
    oppClub = await prisma.club.findFirst({
      where: {
        name: { contains: queryClubName, mode: "insensitive" },
      },
      include: {
        players: { where: { status: "REGISTERED" }, take: 4 },
      },
    });
  }

  if (oppClub) {
    console.log(`Found Club: ${oppClub.name} with ${oppClub.players.length} sample players:`, oppClub.players.map((p: any) => `${p.fullName} (${p.position})`));
  } else {
    console.log("No specific club found, would default to next match fixture or top league rival.");
  }
}

async function run() {
  await testOpponentScouting("Scout Chelsea");
  await testOpponentScouting("Analyze Newcastle squad");
  await testOpponentScouting("Scout next opponent");
}

run().finally(() => prisma.$disconnect());
