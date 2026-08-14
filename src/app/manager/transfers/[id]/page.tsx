import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeTransfer } from "@/lib/serialize-transfer";
import { notFound, redirect } from "next/navigation";
import { TransferDetailsClient } from "@/app/manager/transfers/[id]/TransferDetailsClient";

async function fetchTransfer(id: string) {
  const transfer = await prisma.transfer.findUnique({ where: { id } });
  return transfer ? serializeTransfer(transfer) : null;
}

export default async function TransferDetailsPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "CLUB_MANAGER" && session.user.role !== "ADMINISTRATOR") {
    redirect("/unauthorized");
  }

  const transfer = await fetchTransfer(params.id);

  if (!transfer) {
    notFound();
  }

  if (
    session.user.role === "CLUB_MANAGER" &&
    session.user.clubId &&
    transfer.fromClubId !== session.user.clubId &&
    transfer.toClubId !== session.user.clubId
  ) {
    redirect("/unauthorized");
  }

  const perspective =
    session.user.role === "ADMINISTRATOR"
      ? "buyer"
      : session.user.clubId === transfer.fromClubId
      ? "seller"
      : "buyer";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transfer Details</h1>
          <p className="mt-1 text-sm text-gray-400">
            Review the transfer request and manage actions from your club&apos;s perspective.
          </p>
        </div>
        <Link href="/manager/transfers" className="text-sm text-gray-400 hover:text-pmb-gold">
          &larr; Back to transfers
        </Link>
      </div>

      <TransferDetailsClient transfer={transfer} perspective={perspective} />
    </div>
  );
}
