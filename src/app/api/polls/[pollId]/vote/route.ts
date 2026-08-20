import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/polls/[pollId]/vote
export async function POST(
  req: Request,
  { params }: { params: { pollId: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json({ error: "optionId is required" }, { status: 400 });
    }

    const poll = await prisma.managerPoll.findUnique({
      where: { id: params.pollId },
      include: {
        options: true,
      },
    });

    if (!poll || !poll.isActive) {
      return NextResponse.json({ error: "Poll not found or inactive" }, { status: 404 });
    }

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      return NextResponse.json({ error: "Option not found in this poll" }, { status: 404 });
    }

    // Check if already voted
    const existingVote = await prisma.managerPollVote.findUnique({
      where: {
        pollId_userId: {
          pollId: params.pollId,
          userId: session.user.id,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json({ error: "You have already voted in this poll" }, { status: 400 });
    }

    // Cast vote atomically
    await prisma.$transaction(async (tx) => {
      await tx.managerPollVote.create({
        data: {
          pollId: params.pollId,
          optionId,
          userId: session.user.id,
        },
      });

      await tx.managerPollOption.update({
        where: { id: optionId },
        data: {
          voteCount: { increment: 1 },
        },
      });
    });

    // Return updated poll
    const updatedPoll = await prisma.managerPoll.findUnique({
      where: { id: params.pollId },
      include: {
        options: { orderBy: { voteCount: "desc" } },
      },
    });

    const totalVotes =
      updatedPoll?.options.reduce((sum, opt) => sum + opt.voteCount, 0) || 0;

    return NextResponse.json({
      success: true,
      poll: {
        ...updatedPoll,
        totalVotes,
        userVotedOptionId: optionId,
        hasVoted: true,
        options: updatedPoll?.options.map((opt) => ({
          ...opt,
          percentage:
            totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
        })),
      },
    });
  } catch (error) {
    console.error("Error voting in poll:", error);
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
  }
}
