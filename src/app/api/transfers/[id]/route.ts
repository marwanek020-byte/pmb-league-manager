import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeTransfer } from "@/lib/serialize-transfer";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        error: "Transfer ID is required.",
        code: "TRANSFER_NOT_FOUND",
      },
      { status: 400 }
    );
  }

  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      return NextResponse.json(
        {
          error: "Transfer request not found.",
          code: "TRANSFER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const isAdmin = session.user.role === "ADMINISTRATOR";
    const isManager =
      session.user.role === "CLUB_MANAGER" && !!session.user.clubId;

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        {
          error: "Forbidden.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    if (
      isManager &&
      transfer.fromClubId !== session.user.clubId &&
      transfer.toClubId !== session.user.clubId
    ) {
      return NextResponse.json(
        {
          error: "You do not have access to this transfer.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      transfer: serializeTransfer(transfer),
    });
  } catch (error) {
    console.error("Get transfer failed:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while fetching the transfer.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
