"use client";

import { useCallback } from "react";
import Link from "next/link";
import { fetchOutgoingTransfers } from "@/lib/transfer-client";
import { TransferListClient } from "@/components/manager/transfers/TransferListClient";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";

// "Outgoing" = players other clubs want to take OUT of your club
// (fromClubId). Your club is the seller, so Accept/Reject live here.
export default function OutgoingTransfersPage() {
  const { toast, showSuccess, showError, dismiss } = useToast();
  const fetcher = useCallback(() => fetchOutgoingTransfers({ pageSize: 50 }), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Outgoing Requests</h1>
          <p className="mt-1 text-sm text-gray-400">
            Other clubs&apos; requests to sign players away from your squad.
          </p>
        </div>
        <Link href="/manager/transfers" className="text-sm text-gray-400 hover:text-pmb-gold">
          &larr; Back to Transfer Dashboard
        </Link>
      </div>

      <TransferListClient
        fetcher={fetcher}
        perspective="seller"
        showStatusFilter
        emptyMessage="No other club has requested one of your players yet."
        onNotify={(type, message) => (type === "success" ? showSuccess(message) : showError(message))}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
