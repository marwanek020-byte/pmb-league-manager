import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  completeTransfer,
  TransferServiceError,
} from "@/lib/services/transfer-service";
import { serializeTransfer } from "@/lib/serialize-transfer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (
    !session ||
    session.user.role !== "ADMINISTRATOR" ||
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

  try {
    const transfer = await completeTransfer(session.user.id, id);

    return NextResponse.json({
      transfer: serializeTransfer(transfer),
    });
  } catch (error: unknown) {
    if (error instanceof TransferServiceError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "TRANSFER_NOT_FOUND" ||
            error.code === "USER_NOT_FOUND" ||
            error.code === "PLAYER_NOT_FOUND"
          ? 404
          : error.code === "INVALID_STATE" ||
            error.code === "OWNERSHIP_CONFLICT"
          ? 409
          : 400;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status }
      );
    }

    console.error("Complete transfer failed:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while completing the transfer.",
        code: "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
