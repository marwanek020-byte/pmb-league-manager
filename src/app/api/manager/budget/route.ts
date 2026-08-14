import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getClubBudget } from "@/lib/services/budget-service";

export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // clubId comes only from the session - there is no way for this request
  // to specify a different club, by design.
  const budget = await getClubBudget(session.user.clubId);

  return NextResponse.json({ budget: budget.toFixed(2) });
}
