import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

export const dynamic = "force-dynamic";

const REWARD_AMOUNT = 200000; // €200,000 / $200k per ad view
const MAX_DAILY_ADS = 10;     // 10 ads per 24 hours
const AD_PREFIX = "📺 Daily Sponsor Video Ad Reward";

async function getManagerClub() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return null;
  }
  return { session, clubId: session.user.clubId };
}

// GET /api/manager/rewards/ad — Status of remaining daily ads
export async function GET() {
  const authData = await getManagerClub();
  if (!authData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = authData;
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const viewsInLast24h = await prisma.clubBudgetTransaction.count({
      where: {
        clubId,
        description: { startsWith: AD_PREFIX },
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    const remainingViews = Math.max(0, MAX_DAILY_ADS - viewsInLast24h);

    return NextResponse.json({
      success: true,
      viewsInLast24h,
      maxDailyViews: MAX_DAILY_ADS,
      remainingViews,
      rewardPerView: REWARD_AMOUNT,
      canWatch: remainingViews > 0,
    });
  } catch (error: any) {
    console.error("Failed to fetch ad reward status:", error);
    return NextResponse.json({ error: "Failed to fetch ad reward status." }, { status: 500 });
  }
}

// POST /api/manager/rewards/ad — Claim €200,000 for an ad view
export async function POST() {
  const authData = await getManagerClub();
  if (!authData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = authData;
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const viewsInLast24h = await tx.clubBudgetTransaction.count({
        where: {
          clubId,
          description: { startsWith: AD_PREFIX },
          createdAt: { gte: twentyFourHoursAgo },
        },
      });

      if (viewsInLast24h >= MAX_DAILY_ADS) {
        throw new Error(`Daily ad limit reached. You can watch up to ${MAX_DAILY_ADS} ads every 24 hours.`);
      }

      // Lock club budget to prevent race conditions
      const currentBudget = await lockClubBudget(tx as any, clubId);
      const adNumber = viewsInLast24h + 1;

      // Apply double-entry budget transaction
      await applyBudgetTransaction(tx as any, {
        clubId,
        amount: new Prisma.Decimal(REWARD_AMOUNT),
        currentBudget,
        type: "COMPETITION_REWARD",
        description: `${AD_PREFIX} #${adNumber} (+€200,000)`,
      });

      const updatedClub = await tx.club.findUnique({
        where: { id: clubId },
        select: { budget: true, name: true },
      });

      return {
        reward: REWARD_AMOUNT,
        newBalance: updatedClub?.budget ?? currentBudget.plus(REWARD_AMOUNT),
        adNumber,
        remainingViews: MAX_DAILY_ADS - adNumber,
      };
    });

    return NextResponse.json({
      success: true,
      message: `🎉 €200,000 successfully added to your club budget! (${result.remainingViews} ads remaining today)`,
      ...result,
    });
  } catch (error: any) {
    console.error("Failed to claim ad reward:", error);
    return NextResponse.json(
      { error: error.message || "Failed to claim ad reward." },
      { status: 400 }
    );
  }
}
