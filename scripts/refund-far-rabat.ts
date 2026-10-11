import { PrismaClient, BudgetTransactionType, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const club = await prisma.club.findFirst({
    where: { name: { contains: "FAR" } },
  });

  if (!club) {
    throw new Error("FAR Rabat club not found");
  }

  const refundAmount = new Prisma.Decimal("7000000");
  const newBudget = new Prisma.Decimal(club.budget.toString()).plus(refundAmount);

  await prisma.$transaction(async (tx) => {
    await tx.club.update({
      where: { id: club.id },
      data: { budget: newBudget },
    });

    await tx.clubBudgetTransaction.create({
      data: {
        clubId: club.id,
        amount: refundAmount,
        balanceAfter: newBudget,
        type: BudgetTransactionType.ADMIN_ADJUSTMENT,
        description: "Refund: Reversal of cross-league TOTW deductions (Serie A cross-talk refund)",
      },
    });
  });

  console.log(`Successfully restored €7,000,000 to FAR Rabat (${club.name}). New Budget: €${newBudget.toString()}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
