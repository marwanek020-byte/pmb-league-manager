import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBudgetHistory } from "@/lib/services/budget-service";
import { serializeBudgetTransaction } from "@/lib/serialize-budget";

export const dynamic = "force-dynamic";

export async function GET(
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

  const { searchParams } = new URL(req.url);

  const page = Math.max(
    1,
    Number(searchParams.get("page") ?? "1") || 1
  );

  const pageSize = Math.min(
    50,
    Math.max(
      1,
      Number(searchParams.get("pageSize") ?? "20") || 20
    )
  );

  try {
    const result = await getBudgetHistory(
      clubId,
      page,
      pageSize
    );

    return NextResponse.json({
      transactions: result.transactions.map(
        serializeBudgetTransaction
      ),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("Admin budget history failed:", error);

    return NextResponse.json(
      { error: "Could not load budget history." },
      { status: 500 }
    );
  }
}