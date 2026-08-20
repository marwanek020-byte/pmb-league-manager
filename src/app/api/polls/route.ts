import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/polls - Fetch active polls
export async function GET() {
  try {
    const session = await auth();

    const polls = await prisma.managerPoll.findMany({
      where: { isActive: true },
      include: {
        options: {
          orderBy: { voteCount: "desc" },
        },
        votes: session?.user?.id
          ? {
              where: { userId: session.user.id },
            }
          : false,
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedPolls = polls.map((poll) => {
      const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
      const userVotedOptionId =
        poll.votes && poll.votes.length > 0 ? poll.votes[0].optionId : null;

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        month: poll.month,
        totalVotes,
        userVotedOptionId,
        hasVoted: Boolean(userVotedOptionId),
        options: poll.options.map((opt) => ({
          id: opt.id,
          managerId: opt.managerId,
          managerName: opt.managerName,
          clubName: opt.clubName,
          clubLogo: opt.clubLogo,
          statement: opt.statement,
          voteCount: opt.voteCount,
          percentage:
            totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
        })),
      };
    });

    return NextResponse.json({ polls: enrichedPolls });
  } catch (error) {
    console.error("Error fetching polls:", error);
    return NextResponse.json({ error: "Failed to fetch polls" }, { status: 500 });
  }
}

// POST /api/polls - Create a new poll (Admin only)
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, month, options } = body;

    if (!title || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "Title and at least 2 manager options are required" },
        { status: 400 }
      );
    }

    const poll = await prisma.managerPoll.create({
      data: {
        title,
        description: description || null,
        month: month || new Date().toISOString().slice(0, 7),
        options: {
          create: options.map((opt: any) => ({
            managerId: opt.managerId,
            managerName: opt.managerName,
            clubName: opt.clubName,
            clubLogo: opt.clubLogo || null,
            statement: opt.statement || null,
          })),
        },
      },
      include: {
        options: true,
      },
    });

    return NextResponse.json({ success: true, poll });
  } catch (error) {
    console.error("Error creating poll:", error);
    return NextResponse.json({ error: "Failed to create poll" }, { status: 500 });
  }
}
