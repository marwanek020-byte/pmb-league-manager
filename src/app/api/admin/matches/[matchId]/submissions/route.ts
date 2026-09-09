import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchEventType, MatchSubmissionStatus, BudgetTransactionType, Prisma } from "@prisma/client";
import { applyMatchRewards } from "@/lib/services/match-reward-service";
import { applyMatchdayRevenue } from "@/lib/services/matchday-revenue-service";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

export const dynamic = "force-dynamic";

// ── GET /api/admin/matches/[matchId]/submissions ─────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
    }

    const submissions = await prisma.matchSubmission.findMany({
      where: { matchId: params.matchId },
      include: {
        submittingClub: { select: { id: true, name: true, logo: true } },
        screenshots: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ submissions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load match submissions." },
      { status: 500 }
    );
  }
}

// ── PATCH /api/admin/matches/[matchId]/submissions ───────────────────────────
// Approves a manager submission (finalizes match) or rejects it with optional fine
export async function PATCH(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
    }

    const body = await req.json();
    const { submissionId, action, manualFine, adminNotes } = body;

    if (!submissionId || !action) {
      return NextResponse.json(
        { error: "submissionId and action (APPROVE | REJECT) are required." },
        { status: 400 }
      );
    }

    const submission = await prisma.matchSubmission.findUnique({
      where: { id: submissionId },
      include: {
        match: true,
      },
    });

    if (!submission || submission.matchId !== params.matchId) {
      return NextResponse.json({ error: "Submission not found for this match." }, { status: 404 });
    }

    if (action === "REJECT") {
      // If admin specified an additional manual disciplinary fine (e.g. 10M or 20M)
      if (manualFine && typeof manualFine === "number" && manualFine > 0) {
        await prisma.$transaction(async (tx) => {
          const currentBudget = await lockClubBudget(tx, submission.submittingClubId);
          await applyBudgetTransaction(tx, {
            clubId: submission.submittingClubId,
            amount: new Prisma.Decimal(-manualFine),
            currentBudget,
            type: BudgetTransactionType.ADMIN_ADJUSTMENT,
            description: `🚨 DISCIPLINARY PENALTY: -€${(manualFine / 1_000_000).toFixed(0)}M manual fine by League Administrator for falsified match submission in Matchday ${submission.match.matchday}. ${adminNotes || ""}`.trim(),
            matchId: params.matchId,
          });
        });
      }

      const updated = await prisma.matchSubmission.update({
        where: { id: submissionId },
        data: {
          status: MatchSubmissionStatus.REJECTED_MANUAL,
          adminNotes: adminNotes || "Rejected by administrator during verification.",
          reviewedAt: new Date(),
          reviewedById: session.user.id,
        },
      });

      return NextResponse.json({ success: true, submission: updated, action: "REJECTED" });
    }

    if (action === "APPROVE") {
      // Finalize the match using the submission's extracted goals & score
      const homeGoals = submission.homeGoals;
      const awayGoals = submission.awayGoals;
      const events = (submission.events as any[]) || [];

      await prisma.$transaction(async (tx) => {
        // 1. Update Match record
        await tx.match.update({
          where: { id: params.matchId },
          data: {
            homeGoals,
            awayGoals,
            status: "COMPLETED",
          },
        });

        // 2. Clear old events and create extracted events
        await tx.matchEvent.deleteMany({ where: { matchId: params.matchId } });

        if (events.length > 0) {
          await tx.matchEvent.createMany({
            data: events.map((ev) => ({
              matchId: params.matchId,
              clubId: ev.clubId,
              playerId: ev.playerId,
              assistPlayerId: ev.assistPlayerId || null,
              type: (ev.type as MatchEventType) || MatchEventType.GOAL,
              minute: typeof ev.minute === "number" ? ev.minute : null,
            })),
          });
        }

        // 3. Rewards & Revenue
        await applyMatchRewards(
          tx,
          params.matchId,
          submission.match.homeClubId,
          submission.match.awayClubId,
          homeGoals,
          awayGoals
        );

        await applyMatchdayRevenue(tx, params.matchId);

        // 4. Update submission status
        await tx.matchSubmission.update({
          where: { id: submissionId },
          data: {
            status: MatchSubmissionStatus.APPROVED,
            adminNotes: adminNotes || "Approved and finalized by League Administrator.",
            reviewedAt: new Date(),
            reviewedById: session.user.id,
          },
        });
      });

      return NextResponse.json({
        success: true,
        action: "APPROVED",
        homeGoals,
        awayGoals,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process match submission action." },
      { status: 500 }
    );
  }
}
