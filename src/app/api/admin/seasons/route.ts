import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    return null;
  }

  return session;
}

// GET /api/admin/seasons
export async function GET() {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seasons = await prisma.season.findMany({
    orderBy: [
      { createdAt: "desc" },
    ],
    include: {
      league: {
        select: {
          id: true,
          name: true,
          country: true,
        },
      },
      _count: {
        select: {
          classifications: true,
        },
      },
    },
  });

  return NextResponse.json({ seasons });
}

// POST /api/admin/seasons
export async function POST(req: Request) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const leagueId =
    typeof body?.leagueId === "string" ? body.leagueId.trim() : "";

  const name =
    typeof body?.name === "string" ? body.name.trim() : "";

  const startDate =
    typeof body?.startDate === "string" && body.startDate
      ? new Date(body.startDate)
      : null;

  const endDate =
    typeof body?.endDate === "string" && body.endDate
      ? new Date(body.endDate)
      : null;

  if (!leagueId) {
    return NextResponse.json(
      { error: "League is required." },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: "Season name is required." },
      { status: 400 }
    );
  }

  if (startDate && Number.isNaN(startDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid start date." },
      { status: 400 }
    );
  }

  if (endDate && Number.isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid end date." },
      { status: 400 }
    );
  }

  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json(
      { error: "End date cannot be before start date." },
      { status: 400 }
    );
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json(
      { error: "League not found." },
      { status: 404 }
    );
  }

  try {
    const season = await prisma.season.create({
      data: {
        leagueId,
        name,
        startDate,
        endDate,
        status: "DRAFT",
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
    });

    return NextResponse.json({ season }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A season with this name already exists for this league.",
        },
        { status: 409 }
      );
    }

    console.error("Create season failed:", error);

    return NextResponse.json(
      { error: "Could not create season." },
      { status: 500 }
    );
  }
}