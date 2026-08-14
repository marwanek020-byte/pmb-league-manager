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

export default async function AdminTransferDetailsPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMINISTRATOR") {
    redirect("/unauthorized");
  }

  const transfer = await fetchTransfer(params.id);

  if (!transfer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transfer Details</h1>
          <p className="mt-1 text-sm text-gray-400">Review and manage this transfer request.</p>
        </div>
        <Link href="/admin/transfers" className="text-sm text-gray-400 hover:text-pmb-gold">
          &larr; Back to transfer management
        </Link>
      </div>

      <TransferDetailsClient transfer={transfer} perspective="admin" />
    </div>
  );
}
