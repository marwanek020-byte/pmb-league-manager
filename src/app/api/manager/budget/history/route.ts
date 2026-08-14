import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBudgetHistory } from "@/lib/services/budget-service";
import { serializeBudgetTransaction } from "@/lib/serialize-budget";

export async function GET(req: Request) {
  const session = await auth();

  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  // Same rule as /api/manager/budget: clubId is never accepted from the
  // client, only ever session.user.clubId.
  const result = await getBudgetHistory(session.user.clubId, page, pageSize);

  return NextResponse.json({
    transactions: result.transactions.map(serializeBudgetTransaction),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
}
