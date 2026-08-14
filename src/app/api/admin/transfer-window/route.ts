import { NextResponse } from "next/server";
import { Prisma, TransferWindowAction } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const requestedPage = Number(searchParams.get("page"));
  const requestedPageSize = Number(searchParams.get("pageSize"));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 50)
      : 10;

  const [window, total, history] = await Promise.all([
    prisma.transferWindow.findUnique({ where: { id: "singleton" } }),
    prisma.transferWindowHistory.count(),
    prisma.transferWindowHistory.findMany({
      include: { changedBy: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json(
    { window, history, total, page, pageSize },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { isOpen?: boolean } | null;

  if (typeof body?.isOpen !== "boolean") {
    return NextResponse.json({ error: "isOpen must be a boolean" }, { status: 400 });
  }

  const isOpen = body.isOpen;
  const administratorId = session.user.id;

  const result = await prisma.$transaction(async (tx) => {
    // Ensure the singleton exists before locking it. Creating the default closed
    // state is not a state change, so it intentionally creates no history row.
    await tx.transferWindow.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    const rows = await tx.$queryRaw<{ id: string; isOpen: boolean }[]>(
      Prisma.sql`SELECT "id", "isOpen" FROM "TransferWindow" WHERE "id" = 'singleton' FOR UPDATE`
    );
    const current = rows[0];

    if (!current) {
      throw new Error("Transfer window singleton could not be locked.");
    }

    if (current.isOpen === isOpen) {
      return { window: current, history: null };
    }

    const window = await tx.transferWindow.update({
      where: { id: current.id },
      data: { isOpen },
    });

    const history = await tx.transferWindowHistory.create({
      data: {
        previousIsOpen: current.isOpen,
        newIsOpen: isOpen,
        action: isOpen ? TransferWindowAction.OPENED : TransferWindowAction.CLOSED,
        changedByUserId: administratorId,
      },
      include: { changedBy: { select: { username: true } } },
    });

    return { window, history };
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
