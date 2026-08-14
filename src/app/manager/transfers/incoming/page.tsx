"use client";

import { useCallback } from "react";
import Link from "next/link";
import { fetchIncomingTransfers } from "@/lib/transfer-client";
import { TransferListClient } from "@/components/manager/transfers/TransferListClient";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";

// "Incoming" = players you are trying to bring INTO your club (toClubId).
// You initiated these requests, so the action available here is
// Cancel - approving/rejecting is the other club's decision.
export default function IncomingTransfersPage() {
  const { toast, showSuccess, showError, dismiss } = useToast();
  const fetcher = useCallback(() => fetchIncomingTransfers({ pageSize: 50 }), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Incoming Requests</h1>
          <p className="mt-1 text-sm text-gray-400">
            Transfer requests you&apos;ve submitted to acquire players from other clubs.
          </p>
        </div>
        <Link href="/manager/transfers" className="text-sm text-gray-400 hover:text-pmb-gold">
          &larr; Back to Transfer Dashboard
        </Link>
      </div>

      <TransferListClient
        fetcher={fetcher}
        perspective="buyer"
        showStatusFilter
        emptyMessage="You haven't requested any transfers yet."
        onNotify={(type, message) => (type === "success" ? showSuccess(message) : showError(message))}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
