import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyStrictCFQuery() {
  console.log("=================================================");
  console.log("🧪 TESTING STRICT CF / ST POSITIONAL FILTERING");
  console.log("=================================================");

  const cfFilter = { position: { in: ["CF", "ST", "cf", "st"] } };

  const [freeAgents, rivalPlayers] = await Promise.all([
    prisma.player.findMany({
      where: { status: "AVAILABLE", pmbClubId: null, ...cfFilter },
      orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
      take: 5,
    }),
    prisma.player.findMany({
      where: { status: "REGISTERED", ...cfFilter },
      orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
      take: 5,
      include: { pmbClub: { select: { name: true } } },
    }),
  ]);

  console.log(`\nFound ${freeAgents.length} Free Agent CFs:`);
  freeAgents.forEach((p) => console.log(`  • ${p.fullName} [${p.position.toUpperCase()}] - ${p.nationality}`));

  console.log(`\nFound ${rivalPlayers.length} Rival Club CFs:`);
  rivalPlayers.forEach((p) => console.log(`  • ${p.fullName} [${p.position.toUpperCase()}] - Club: ${p.pmbClub?.name}`));

  // Verify NONE of them are LB, GK, CB, etc.
  const allPositions = [...freeAgents, ...rivalPlayers].map((p) => p.position.toUpperCase());
  const invalid = allPositions.filter((pos) => pos !== "CF" && pos !== "ST");
  if (invalid.length === 0) {
    console.log("\n✅ PASS: 100% of returned players are strictly CF / ST!");
  } else {
    console.log(`\n❌ FAIL: Found non-CF positions: ${invalid.join(", ")}`);
  }
}

verifyStrictCFQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
