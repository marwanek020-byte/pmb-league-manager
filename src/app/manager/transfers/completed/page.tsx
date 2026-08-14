"use client";

import { useCallback } from "react";
import Link from "next/link";
import { fetchCompletedTransfers } from "@/lib/transfer-client";
import { TransferListClient } from "@/components/manager/transfers/TransferListClient";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";

export default function CompletedTransfersPage() {
  const { toast, showError, dismiss } = useToast();
  const fetcher = useCallback(() => fetchCompletedTransfers({ pageSize: 50 }), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Completed Transfers</h1>
          <p className="mt-1 text-sm text-gray-400">
            Finalized transfers involving your club, on either side.
          </p>
        </div>
        <Link href="/manager/transfers" className="text-sm text-gray-400 hover:text-pmb-gold">
          &larr; Back to Transfer Dashboard
        </Link>
      </div>

      <TransferListClient
        fetcher={fetcher}
        perspective="readonly"
        emptyMessage="No completed transfers yet."
        onNotify={(type, message) => type === "error" && showError(message)}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
