"use client";

import { TransferDTO } from "@/lib/serialize-transfer";

const STYLES: Record<TransferDTO["status"], string> = {
  PENDING_SELLER_APPROVAL: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  COMPLETED: "bg-green-500/10 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
  CANCELLED: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const LABELS: Record<TransferDTO["status"], string> = {
  PENDING_SELLER_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function TransferStatusBadge({ status }: { status: TransferDTO["status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
