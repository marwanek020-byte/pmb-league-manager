import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: "botola-farrabat" },
    include: { club: { include: { league: true } } },
  });
  console.log("User:", user?.username, "Role:", user?.role, "Club:", user?.club?.name, "Club ID:", user?.clubId);
}

main().finally(() => prisma.$disconnect());
