import { redirect } from "next/navigation";
import { TransferStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  TransferDashboardClient,
  TransferDashboardStats,
} from "@/components/manager/transfers/TransferDashboardClient";

const ACTIVE_STATUSES: TransferStatus[] = ["PENDING_SELLER_APPROVAL", "APPROVED"];

export default async function TransferDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  const clubId = session.user.clubId;

  const [window, awaitingMyApproval, myActiveRequests, completed, rejected] = await Promise.all([
    prisma.transferWindow.findUnique({ where: { id: "singleton" } }),
    prisma.transfer.count({ where: { fromClubId: clubId, status: "PENDING_SELLER_APPROVAL" } }),
    prisma.transfer.count({ where: { toClubId: clubId, status: { in: ACTIVE_STATUSES } } }),
    prisma.transfer.count({
      where: { status: "COMPLETED", OR: [{ fromClubId: clubId }, { toClubId: clubId }] },
    }),
    prisma.transfer.count({
      where: { status: "REJECTED", OR: [{ fromClubId: clubId }, { toClubId: clubId }] },
    }),
  ]);

  const stats: TransferDashboardStats = { awaitingMyApproval, myActiveRequests, completed, rejected };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transfer Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          {session.user.clubName ?? "Your club"}&apos;s transfer market activity.
        </p>
      </div>

      <TransferDashboardClient
        clubId={clubId}
        clubName={session.user.clubName ?? ""}
        windowOpen={window?.isOpen ?? false}
        stats={stats}
      />
    </div>
  );
}
