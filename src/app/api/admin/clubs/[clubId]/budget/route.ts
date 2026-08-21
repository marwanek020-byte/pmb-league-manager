import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import {
  adjustClubBudget,
  BudgetServiceError,
  AdminBudgetAction,
} from "@/lib/services/budget-service";

export const dynamic = "force-dynamic";

const VALID_ACTIONS: AdminBudgetAction[] = [
  "INITIAL",
  "ADD",
  "DECREASE",
];

function isValidAction(value: unknown): value is AdminBudgetAction {
  return (
    typeof value === "string" &&
    VALID_ACTIONS.includes(value as AdminBudgetAction)
  );
}

export async function POST(
  req: Request,
  { params }: { params: { clubId: string } }
) {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const clubId = params.clubId?.trim();

  if (!clubId) {
    return NextResponse.json(
      { error: "Club ID is required." },
      { status: 400 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const payload = body as {
    action?: unknown;
    amount?: unknown;
    reason?: unknown;
  };

  if (!isValidAction(payload.action)) {
    return NextResponse.json(
      { error: "Invalid budget action." },
      { status: 400 }
    );
  }

  if (
    typeof payload.amount !== "number" ||
    !Number.isFinite(payload.amount) ||
    payload.amount <= 0
  ) {
    return NextResponse.json(
      { error: "Amount must be a positive number." },
      { status: 400 }
    );
  }

  const reason =
    typeof payload.reason === "string"
      ? payload.reason.trim()
      : "";

  if (!reason) {
    return NextResponse.json(
      { error: "A reason is required." },
      { status: 400 }
    );
  }

  try {
    const result = await adjustClubBudget({
      clubId,
      action: payload.action,
      amount: new Prisma.Decimal(payload.amount),
      reason,
    });

    return NextResponse.json({
      success: true,
      budget: result.toFixed(2),
    });
  } catch (error) {
    if (error instanceof BudgetServiceError) {
      const status =
        error.code === "CLUB_NOT_FOUND"
          ? 404
          : error.code === "INSUFFICIENT_BUDGET"
            ? 409
            : 400;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }

    console.error("Admin budget adjustment failed:", error);

    return NextResponse.json(
      { error: "Could not update the club budget." },
      { status: 500 }
    );
  }
}