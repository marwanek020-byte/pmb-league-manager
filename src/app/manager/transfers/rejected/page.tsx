"use client";

import { useCallback } from "react";
import Link from "next/link";
import { fetchRejectedTransfers } from "@/lib/transfer-client";
import { TransferListClient } from "@/components/manager/transfers/TransferListClient";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";

export default function RejectedTransfersPage() {
  const { toast, showError, dismiss } = useToast();
  const fetcher = useCallback(() => fetchRejectedTransfers({ pageSize: 50 }), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rejected Transfers</h1>
          <p className="mt-1 text-sm text-gray-400">
            Requests involving your club that were turned down.
          </p>
        </div>
        <Link href="/manager/transfers" className="text-sm text-gray-400 hover:text-pmb-gold">
          &larr; Back to Transfer Dashboard
        </Link>
      </div>

      <TransferListClient
        fetcher={fetcher}
        perspective="readonly"
        emptyMessage="No rejected transfers."
        onNotify={(type, message) => type === "error" && showError(message)}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
