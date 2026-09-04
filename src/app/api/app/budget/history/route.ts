import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBudgetHistory, getClubBudget } from "@/lib/services/budget-service";
import { serializeBudgetTransaction } from "@/lib/serialize-budget";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId;

    if (!clubId) {
      const farRabat = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
      });
      clubId = farRabat?.id || (await prisma.club.findFirst())?.id;
    }

    if (!clubId) {
      return NextResponse.json({ error: "No club found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

    const [club, budgetDecimal, result] = await Promise.all([
      prisma.club.findUnique({
        where: { id: clubId },
        select: { id: true, name: true, logo: true, budget: true },
      }),
      getClubBudget(clubId).catch(() => null),
      getBudgetHistory(clubId, page, pageSize),
    ]);

    const budget = budgetDecimal != null ? Number(budgetDecimal) : Number(club?.budget ?? 0);

    // Compute cumulative financial metrics across transactions for breakdown
    const allRecentTxns = await prisma.clubBudgetTransaction.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    let totalInflow = 0;
    let totalOutflow = 0;
    let rewardTotal = 0;
    let transferInTotal = 0;
    let transferOutTotal = 0;
    let auctionWinTotal = 0;

    allRecentTxns.forEach((tx) => {
      const val = Number(tx.amount);
      if (val > 0) totalInflow += val;
      else totalOutflow += Math.abs(val);

      if (tx.type === "COMPETITION_REWARD") rewardTotal += val;
      if (tx.type === "TRANSFER_IN") transferInTotal += val;
      if (tx.type === "TRANSFER_OUT") transferOutTotal += Math.abs(val);
      if (tx.type === "AUCTION_WIN") auctionWinTotal += Math.abs(val);
    });

    return NextResponse.json({
      club: {
        id: club?.id ?? clubId,
        name: club?.name ?? "Your Club",
        logo: club?.logo ?? null,
        budget,
      },
      metrics: {
        totalInflow,
        totalOutflow,
        rewardTotal,
        transferInTotal,
        transferOutTotal,
        auctionWinTotal,
      },
      transactions: result.transactions.map(serializeBudgetTransaction),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("Error in GET /api/app/budget/history:", error);
    return NextResponse.json({ error: "Failed to fetch budget history" }, { status: 500 });
  }
}
