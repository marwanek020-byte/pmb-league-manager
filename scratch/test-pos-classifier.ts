import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getPositionCategory = (text: string) => {
  const t = text.toLowerCase();
  if (
    /\b(cf|st|striker|strikers|center forward|centre forward|buteur)\b/i.test(t) ||
    t.includes("مهاجم صريح") ||
    t.includes("رأس حربة") ||
    t.includes("راس حربة") ||
    t.includes("قناص") ||
    t.includes("مهاجم") ||
    t.includes("هجوم") ||
    t.includes("مهاجمين")
  ) {
    return "CF";
  }
  if (
    /\b(gk|goalkeeper|goalkeepers|keeper|keepers|gardien)\b/i.test(t) ||
    t.includes("حارس") ||
    t.includes("حارس مرمى") ||
    t.includes("كول")
  ) {
    return "GK";
  }
  if (
    /\b(cb|center back|centre back|défenseur central)\b/i.test(t) ||
    t.includes("قلب دفاع") ||
    t.includes("أكسيال") ||
    t.includes("سنترال")
  ) {
    return "CB";
  }
  return null;
};

async function testQueries() {
  console.log("=================================================");
  console.log("🧪 TESTING PRECISE POSITION CATEGORY CLASSIFIER");
  console.log("=================================================");

  const queries = [
    "أحسن مهاجم متاح نشريوه بالميزانية ديالنا",
    "أفضل رأس حربة بالميزانية",
    "Show me CF players",
    "حارس مرمى مغربي",
    "أكسيال وقلب دفاع",
  ];

  for (const q of queries) {
    const cat = getPositionCategory(q);
    console.log(`Query: "${q}" => Detected Position: [${cat}]`);
  }

  // Check database query for CF
  const cfPlayers = await prisma.player.findMany({
    where: {
      position: { in: ["CF", "ST", "cf", "st"] },
      status: "REGISTERED",
    },
    take: 4,
  });

  console.log("\nSample CF players found in database:");
  cfPlayers.forEach((p) => {
    console.log(`  • ${p.fullName} (${p.position}) - ${p.nationality}`);
  });
}

testQueries()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
