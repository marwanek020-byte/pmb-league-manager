import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingPoll = await prisma.managerPoll.findFirst({
    where: { isActive: true },
  });

  if (!existingPoll) {
    // Find sample clubs/managers
    const clubs = await prisma.club.findMany({
      take: 4,
      include: { manager: true },
    });

    const candidates = [
      {
        managerId: clubs[0]?.manager?.id || "admin-marwane",
        managerName: clubs[0]?.manager?.username || "Amine (FAR Rabat)",
        clubName: clubs[0]?.name || "AS FAR Rabat",
        clubLogo: clubs[0]?.logo || null,
        statement: "4 Matches Unbeaten & +8 Goal Difference",
        voteCount: 14,
      },
      {
        managerId: clubs[1]?.manager?.id || "admin-hamza",
        managerName: clubs[1]?.manager?.username || "Waled (Raja Casablanca)",
        clubName: clubs[1]?.name || "Raja CA",
        clubLogo: clubs[1]?.logo || null,
        statement: "Clean Sheets in 3 consecutive fixtures",
        voteCount: 11,
      },
      {
        managerId: clubs[2]?.manager?.id || "admin-oussama",
        managerName: clubs[2]?.manager?.username || "Alae (Wydad AC)",
        clubName: clubs[2]?.name || "Wydad AC",
        clubLogo: clubs[2]?.logo || null,
        statement: "Historic 4-1 Derby Masterclass victory",
        voteCount: 19,
      },
      {
        managerId: clubs[3]?.manager?.id || "admin-hamzaben",
        managerName: clubs[3]?.manager?.username || "Youssef (Real Madrid)",
        clubName: clubs[3]?.name || "Real Madrid CF",
        clubLogo: clubs[3]?.logo || null,
        statement: "Spectacular comeback from 0-2 down",
        voteCount: 8,
      },
    ];

    await prisma.managerPoll.create({
      data: {
        title: "🏆 Manager of the Month — August 2026",
        description: "Cast your vote for the most tactically dominant manager across the PMB Leagues this month. The winner earns a €1,000,000 Transfer Boost & Golden MOTM Badge!",
        month: "2026-08",
        isActive: true,
        options: {
          create: candidates,
        },
      },
    });

    console.log("Seeded sample Dugout MOTM Poll!");
  } else {
    console.log("Active poll already exists.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
