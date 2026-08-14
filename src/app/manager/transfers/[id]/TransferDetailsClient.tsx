"use client";

import { useState } from "react";
import { TransferDTO } from "@/lib/serialize-transfer";
import { TransferActionButtons } from "@/components/manager/transfers/TransferActionButtons";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { TransferStatusBadge } from "@/components/manager/transfers/TransferStatusBadge";

export function TransferDetailsClient({
  transfer: initialTransfer,
  perspective,
}: {
  transfer: TransferDTO;
  perspective: "buyer" | "seller" | "admin";
}) {
  const [transfer, setTransfer] = useState<TransferDTO>(initialTransfer);
  const { toast, showError, dismiss } = useToast();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="pmb-card space-y-5 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Player</p>
              <h2 className="text-2xl font-semibold text-white">{transfer.playerName}</h2>
            </div>
            <TransferStatusBadge status={transfer.status} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
              <p className="text-sm text-gray-400">From Club</p>
              <p className="mt-2 text-lg font-semibold text-white">{transfer.fromClubName}</p>
            </div>
            <div className="rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
              <p className="text-sm text-gray-400">To Club</p>
              <p className="mt-2 text-lg font-semibold text-white">{transfer.toClubName}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
              <p className="text-sm text-gray-400">Season</p>
              <p className="mt-2 text-lg font-semibold text-white">{transfer.season}</p>
            </div>
            <div className="rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
              <p className="text-sm text-gray-400">Type</p>
              <p className="mt-2 text-lg font-semibold text-white">{transfer.type.replace("_", " ")}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
              <p className="text-sm text-gray-400">Fee</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {transfer.fee != null
                  ? new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: transfer.currency,
                      maximumFractionDigits: 0,
                    }).format(transfer.fee)
                  : "Free transfer"}
              </p>
            </div>
            <div className="rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
              <p className="text-sm text-gray-400">Submitted</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {new Date(transfer.createdAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
            <p className="text-sm text-gray-400">Notes</p>
            <p className="mt-2 min-h-[5rem] whitespace-pre-wrap text-sm leading-6 text-gray-200">
              {transfer.notes ?? "No notes provided."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="pmb-card p-6">
            <p className="text-sm text-gray-400">Transfer snapshot</p>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
                <span>Player ID</span>
                <span className="font-semibold text-white">#{transfer.playerId}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
                <span>Swap player</span>
                <span className="font-semibold text-white">{transfer.swapPlayerName ?? "N/A"}</span>
              </div>
              {transfer.type === "LOAN" && (
                <div className="flex items-center justify-between rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
                  <span>Duration</span>
                  <span className="font-semibold text-white">
                    {transfer.durationDays === 20
                      ? "Half season"
                      : transfer.durationDays === 40
                      ? "Season"
                      : "N/A"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-2xl border border-pmb-border bg-pmb-charcoal/80 p-4">
                <span>Last updated</span>
                <span className="font-semibold text-white">
                  {new Date(transfer.updatedAt).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="pmb-card p-6">
            <h2 className="text-lg font-semibold text-white">Actions</h2>
            <p className="mt-2 text-sm text-gray-400">Manage this request from your club&apos;s role.</p>
            <TransferActionButtons
              transfer={transfer}
              perspective={perspective}
              onUpdated={setTransfer}
              onError={showError}
            />
          </div>
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
