"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { fetchTransferHistory } from "@/lib/transfer-client";
import { TransferListClient } from "@/components/manager/transfers/TransferListClient";

export function AdminTransferManagementClient() {
  const { toast, showSuccess, showError, dismiss } = useToast();
  const fetcher = useCallback(() => fetchTransferHistory({ pageSize: 50 }), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Transfer Management</h2>
          <p className="mt-1 text-sm text-gray-400">
            Review and manage transfer requests across the league.
          </p>
        </div>
        <Link href="/admin/dashboard" className="pmb-btn-secondary">
          Back to dashboard
        </Link>
      </div>

      <TransferListClient
        fetcher={fetcher}
        perspective="admin"
        showStatusFilter
        emptyMessage="No transfer requests have been submitted yet."
        onNotify={(type, message) => (type === "success" ? showSuccess(message) : showError(message))}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
