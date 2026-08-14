import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  rejectTransfer,
  TransferServiceError,
} from "@/lib/services/transfer-service";
import { serializeTransfer } from "@/lib/serialize-transfer";

type RejectBody = {
  reason?: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (
    !session ||
    session.user.role !== "CLUB_MANAGER" ||
    !session.user.id
  ) {
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

  const body = (await req.json().catch(() => null)) as RejectBody | null;

  const reason = body?.reason?.trim();

  try {
    const transfer = await rejectTransfer(
      session.user.id,
      id,
      reason
    );

    return NextResponse.json({
      transfer: serializeTransfer(transfer),
    });
  } catch (error: unknown) {
    if (error instanceof TransferServiceError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "TRANSFER_NOT_FOUND"
          ? 404
          : error.code === "INVALID_STATE"
          ? 409
          : error.code === "USER_NOT_FOUND"
          ? 404
          : 400;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status }
      );
    }

    console.error("Reject transfer failed:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while rejecting the transfer.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}