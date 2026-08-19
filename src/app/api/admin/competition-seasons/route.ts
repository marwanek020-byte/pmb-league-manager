import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") return null;
  return session;
}

// GET /api/admin/competition-seasons
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const competitionSeasons = await prisma.competitionSeason.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      seasons: {
        include: {
          league: { select: { id: true, name: true, country: true } },
          _count: { select: { matches: true, classifications: true } },
        },
      },
      _count: { select: { matches: true } },
    },
  });

  return NextResponse.json({ competitionSeasons });
}

// POST /api/admin/competition-seasons
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name =
    typeof body?.name === "string" ? body.name.trim() : "";
  const format =
    body?.format === "SINGLE_ROUND_ROBIN"
      ? "SINGLE_ROUND_ROBIN"
      : "DOUBLE_ROUND_ROBIN";

  if (!name) {
    return NextResponse.json(
      { error: "Season name is required (e.g. 2026/2027)." },
      { status: 400 }
    );
  }

  try {
    const competitionSeason = await prisma.competitionSeason.create({
      data: { name, format },
    });
    return NextResponse.json({ competitionSeason }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A competition season with this name already exists." },
        { status: 409 }
      );
    }
    console.error("Create competition season failed:", error);
    return NextResponse.json(
      { error: "Could not create competition season." },
      { status: 500 }
    );
  }
}
