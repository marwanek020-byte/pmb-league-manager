"use client";

import { useState } from "react";
import { TransferDTO } from "@/lib/serialize-transfer";
import {
  approveTransferRequest,
  rejectTransferRequest,
  cancelTransferRequest,
  completeTransferRequest,
  TransferApiError,
} from "@/lib/transfer-client";

type Action = "approve" | "reject" | "cancel" | "complete";

export function TransferActionButtons({
  transfer,
  perspective,
  onUpdated,
  onError,
  compact = false,
}: {
  transfer: TransferDTO;
  /** "seller" = this is the club the player is leaving (fromClubId); "buyer" = the club acquiring them (toClubId); "admin" = administrator actions. */
  perspective: "seller" | "buyer" | "admin";
  onUpdated: (transfer: TransferDTO) => void;
  onError: (message: string) => void;
  compact?: boolean;
}) {
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canApproveOrReject =
    (perspective === "seller" || perspective === "admin") &&
    transfer.status === "PENDING_SELLER_APPROVAL";
  const canComplete = perspective === "admin" && transfer.status === "APPROVED";
  const canCancel =
    perspective === "buyer" && (transfer.status === "PENDING_SELLER_APPROVAL" || transfer.status === "APPROVED");

  if (!canApproveOrReject && !canCancel && !canComplete) {
    return null;
  }

  async function run(action: Action) {
    setSubmitting(true);
    try {
      const result =
        action === "approve"
          ? await approveTransferRequest(transfer.id)
          : action === "reject"
          ? await rejectTransferRequest(transfer.id, reason.trim() || undefined)
          : action === "complete"
          ? await completeTransferRequest(transfer.id)
          : await cancelTransferRequest(transfer.id);

      onUpdated(result.transfer);
      setPendingAction(null);
      setReason("");
    } catch (err) {
      onError(err instanceof TransferApiError ? err.message : "Network error. Please try again.");
      setPendingAction(null);
    } finally {
      setSubmitting(false);
    }
  }

  const btnSize = compact ? "px-3 py-1.5 text-xs" : "";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canApproveOrReject && (
          <>
            <button
              type="button"
              onClick={() => setPendingAction("approve")}
              className={`rounded-lg border border-green-500/30 bg-green-500/10 font-semibold text-green-400 transition hover:bg-green-500/20 ${btnSize || "px-4 py-2"}`}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => setPendingAction("reject")}
              className={`rounded-lg border border-red-500/30 bg-red-500/10 font-semibold text-red-400 transition hover:bg-red-500/20 ${btnSize || "px-4 py-2"}`}
            >
              Reject
            </button>
          </>
        )}
        {canComplete && (
          <button
            type="button"
            onClick={() => setPendingAction("complete")}
            className={`rounded-lg border border-blue-500/30 bg-blue-500/10 font-semibold text-blue-300 transition hover:bg-blue-500/20 ${btnSize || "px-4 py-2"}`}
          >
            Complete
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => setPendingAction("cancel")}
            className={`rounded-lg border border-pmb-border bg-pmb-charcoal font-semibold text-gray-300 transition hover:border-red-500/40 hover:text-red-400 ${btnSize || "px-4 py-2"}`}
          >
            Cancel Request
          </button>
        )}
      </div>

      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => !submitting && setPendingAction(null)}
        >
          <div className="pmb-card w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white">
              {pendingAction === "approve" &&
                `Approve the transfer of ${transfer.playerName} to ${transfer.toClubName}?`}
              {pendingAction === "reject" &&
                `Reject the transfer of ${transfer.playerName} to ${transfer.toClubName}?`}
              {pendingAction === "cancel" &&
                `Cancel your request to sign ${transfer.playerName} from ${transfer.fromClubName}?`}
            </p>

            {pendingAction === "reject" && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                rows={2}
                className="pmb-input mt-4"
              />
            )}

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setPendingAction(null)}
                className="pmb-btn-secondary"
              >
                {pendingAction === "cancel" ? "No" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => run(pendingAction)}
                className="pmb-btn-primary"
              >
                {submitting ? "Working..." : pendingAction === "cancel" ? "Yes" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
