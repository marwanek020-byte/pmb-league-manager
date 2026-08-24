import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TeamOfTheMonthService } from "@/lib/services/team-of-month-service";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

// GET /api/admin/totm
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // 1. Fetch AI monthly performance across all clubs (last 4 rounds)
    const rankedClubs = await TeamOfTheMonthService.calculateMonthlyPerformance();

    // 2. Fetch active poll if any
    const activePoll = await (prisma as any).managerPoll.findFirst({
      where: { month: currentMonth, isActive: true },
      include: {
        options: { orderBy: { voteCount: "desc" } },
      },
    });

    // 3. Fetch past completed polls
    const pastPolls = await (prisma as any).managerPoll.findMany({
      where: { isActive: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        options: { orderBy: { voteCount: "desc" } },
      },
    });

    return NextResponse.json({
      currentMonth,
      topNominees: rankedClubs.slice(0, 4),
      allRankedClubs: rankedClubs,
      activePoll,
      pastPolls,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/totm:", error);
    return NextResponse.json({ error: "Failed to fetch TOTM admin data" }, { status: 500 });
  }
}

// POST /api/admin/totm
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, pollId } = body;

    if (action === "nominate") {
      const result = await TeamOfTheMonthService.nominateTop4Teams();
      return NextResponse.json({
        success: true,
        message: "Successfully analyzed last 4 rounds and opened voting for Top 4 clubs!",
        poll: result.poll,
        nominees: result.top4Candidates,
      });
    }

    if (action === "finalize") {
      const result = await TeamOfTheMonthService.resolveAndAwardWinner(pollId);
      return NextResponse.json({
        success: true,
        message: "Successfully finalized Team of the Month and distributed €53,000,000 in prizes!",
        result,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'nominate' or 'finalize'." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in POST /api/admin/totm:", error);
    return NextResponse.json({ error: error.message || "Failed to process TOTM action" }, { status: 500 });
  }
}
