import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TeamOfTheMonthService } from "@/lib/services/team-of-month-service";

export const dynamic = "force-dynamic";

// GET /api/polls - Fetch active polls
export async function GET() {
  try {
    const session = await auth();

    const globalPoll = await TeamOfTheMonthService.getOrGenerateMonthlyPoll(session?.user?.id);
    if (globalPoll) {
      return NextResponse.json({ polls: [globalPoll] });
    }

    return NextResponse.json({ polls: [] });
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
