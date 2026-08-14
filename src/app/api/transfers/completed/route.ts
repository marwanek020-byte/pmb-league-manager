import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeTransfer } from "@/lib/serialize-transfer";

export async function GET(req: Request) {
  const session = await auth();

  if (!session || !session.user.id) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "FORBIDDEN",
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);

  const page = Math.max(
    Number(searchParams.get("page") ?? "1"),
    1
  );

  const pageSize = Math.min(
    Math.max(Number(searchParams.get("pageSize") ?? "20"), 1),
    100
  );

  const skip = (page - 1) * pageSize;

  const isAdmin = session.user.role === "ADMINISTRATOR";
  const clubId = session.user.clubId;

  if (!isAdmin && (!clubId || session.user.role !== "CLUB_MANAGER")) {
    return NextResponse.json(
      {
        error: "Forbidden.",
        code: "FORBIDDEN",
      },
      { status: 403 }
    );
  }

  const where = {
    status: "COMPLETED" as const,
    ...(isAdmin
      ? {}
      : {
          OR: [
            { fromClubId: clubId! },
            { toClubId: clubId! },
          ],
        }),
  };

  try {
    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        orderBy: {
          completedAt: "desc",
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
    console.error("Get completed transfers failed:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while fetching completed transfers.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
