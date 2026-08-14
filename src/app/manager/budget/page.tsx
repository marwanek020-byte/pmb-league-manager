import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BudgetHistoryClient } from "@/components/manager/BudgetHistoryClient";

export default async function BudgetHistoryPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Club Budget</h1>
        <p className="mt-1 text-sm text-gray-400">
          Every change to {session.user.clubName ?? "your club"}&apos;s budget, in order.
        </p>
      </div>

      <BudgetHistoryClient />
    </div>
  );
}
