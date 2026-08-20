import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testSearch(message: string) {
  console.log(`\n========================================`);
  console.log(`TEST QUERY: "${message}"`);
  console.log(`========================================`);

  const lower = message.toLowerCase().trim();

  let positionCategory: "GK" | "CB" | "LB" | "RB" | "DEF" | "DMF" | "CMF" | "AMF" | "MID" | "LWF" | "RWF" | "CF" | "ATT" | null = null;

  if (/\b(gk|goalkeeper|goalkeepers|keeper|keepers|gardien)\b/i.test(lower)) {
    positionCategory = "GK";
  } else if (/\b(cb|center back|centre back|center-back|centre-back)\b/i.test(lower)) {
    positionCategory = "CB";
  } else if (/\b(def|defender|defenders|defense|defence|backline)\b/i.test(lower)) {
    positionCategory = "DEF";
  } else if (/\b(cf|st|striker|strikers|forward|forwards|finisher)\b/i.test(lower)) {
    positionCategory = "CF";
  } else if (/\b(cmf|cm|mid|midfielder|midfielders|midfield)\b/i.test(lower)) {
    positionCategory = "MID";
  }

  let minRating: number | null = null;
  const ratingMatch = lower.match(/\b([789][0-9])\s*(?:\+|plus|over|higher|rating|\b)/i);
  if (ratingMatch && !/(\d+)\s*(?:m|million|k)/i.test(ratingMatch[0])) {
    const parsed = parseInt(ratingMatch[1], 10);
    if (parsed >= 70 && parsed <= 99) minRating = parsed;
  }

  const buildPosFilter = () => {
    if (!positionCategory) return undefined;
    switch (positionCategory) {
      case "GK":
        return { position: { contains: "gk", mode: "insensitive" as const } };
      case "CB":
        return { position: { contains: "cb", mode: "insensitive" as const } };
      case "DEF":
        return {
          OR: [
            { position: { contains: "cb", mode: "insensitive" as const } },
            { position: { contains: "lb", mode: "insensitive" as const } },
            { position: { contains: "rb", mode: "insensitive" as const } },
          ],
        };
      case "CF":
        return {
          OR: [
            { position: { contains: "cf", mode: "insensitive" as const } },
            { position: { contains: "st", mode: "insensitive" as const } },
          ],
        };
      case "MID":
        return {
          OR: [
            { position: { contains: "cmf", mode: "insensitive" as const } },
            { position: { contains: "dmf", mode: "insensitive" as const } },
            { position: { contains: "amf", mode: "insensitive" as const } },
          ],
        };
      default:
        return undefined;
    }
  };

  const posFilter = buildPosFilter();

  const freeAgentsWhere: any = { status: "AVAILABLE" };
  if (posFilter) Object.assign(freeAgentsWhere, posFilter);
  if (minRating) freeAgentsWhere.overallRating = { gte: minRating };

  const rivalWhere: any = { status: "REGISTERED" };
  if (posFilter) Object.assign(rivalWhere, posFilter);
  if (minRating) rivalWhere.overallRating = { gte: minRating };

  const [freeAgents, rivals] = await Promise.all([
    prisma.player.findMany({
      where: freeAgentsWhere,
      take: 5,
      select: { fullName: true, position: true, overallRating: true, status: true },
    }),
    prisma.player.findMany({
      where: rivalWhere,
      take: 5,
      select: { fullName: true, position: true, overallRating: true, status: true },
    }),
  ]);

  console.log(`Detected Position: ${positionCategory}, Min Rating: ${minRating}`);
  console.log(`Free Agents (${freeAgents.length}):`, freeAgents);
  console.log(`Rival Players (${rivals.length}):`, rivals);
}

async function run() {
  await testSearch("Show all available goalkeepers");
  await testSearch("Search for CB defenders with 80+ rating");
  await testSearch("Find strikers");
  await testSearch("Show midfielders");
}

run().finally(() => prisma.$disconnect());
