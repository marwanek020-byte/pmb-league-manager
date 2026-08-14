import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeTransfer } from "@/lib/serialize-transfer";

export async function GET(req: Request) {
  const session = await auth();

  if (
    !session ||
    session.user.role !== "CLUB_MANAGER" ||
    !session.user.clubId
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "FORBIDDEN",
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status")?.trim() || undefined;

  const page = Math.max(
    Number(searchParams.get("page") ?? "1"),
    1
  );

  const pageSize = Math.min(
    Math.max(Number(searchParams.get("pageSize") ?? "50"), 1),
    50
  );

  const skip = (page - 1) * pageSize;

  const where = {
    fromClubId: session.user.clubId,
    ...(status ? { status: status as any } : {}),
  };

  try {
    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
      }),

      prisma.transfer.count({
        where,
      }),
    ]);

    return NextResponse.json({
      transfers: transfers.map(serializeTransfer),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Failed to load outgoing transfers:", error);

    return NextResponse.json(
      {
        error: "Failed to load outgoing transfers.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}