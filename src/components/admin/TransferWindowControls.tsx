"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type TransferWindowHistoryItem = {
  id: string;
  previousIsOpen: boolean;
  newIsOpen: boolean;
  action: "OPENED" | "CLOSED";
  createdAt: string;
  changedBy: { username: string };
};

type HistoryResponse = {
  window: { isOpen: boolean } | null;
  history: TransferWindowHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StateBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
        isOpen
          ? "border-green-500/30 bg-green-500/10 text-green-400"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}
    >
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}

export function TransferWindowControls({
  initialIsOpen,
  initialHistory,
  initialHistoryTotal,
}: {
  initialIsOpen: boolean;
  initialHistory: TransferWindowHistoryItem[];
  initialHistoryTotal: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [history, setHistory] = useState(initialHistory);
  const [historyTotal, setHistoryTotal] = useState(initialHistoryTotal);
  const [lastChange, setLastChange] = useState<TransferWindowHistoryItem | null>(initialHistory[0] ?? null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(historyTotal / pageSize));

  async function setWindow(nextIsOpen: boolean) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/transfer-window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: nextIsOpen }),
      });
      const data = (await res.json().catch(() => null)) as
        | { window?: { isOpen: boolean }; history?: TransferWindowHistoryItem | null; error?: string }
        | null;

      if (!res.ok || !data?.window) {
        setError(data?.error ?? "Unable to update the transfer window.");
        return;
      }

      setIsOpen(data.window.isOpen);

      if (data.history) {
        setLastChange(data.history);
        setHistory((current) => [data.history!, ...current].slice(0, pageSize));
        setHistoryTotal((total) => total + 1);
        setPage(1);
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return;

    setHistoryLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/transfer-window?page=${nextPage}&pageSize=${pageSize}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as HistoryResponse | { error?: string } | null;

      if (!res.ok || !data || !("history" in data)) {
        setError(data && "error" in data ? data.error ?? "Unable to load transfer-window history." : "Unable to load transfer-window history.");
        return;
      }

      setIsOpen(data.window?.isOpen ?? false);
      setHistory(data.history);
      setHistoryTotal(data.total);
      setPage(data.page);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <section className="pmb-card space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Transfer Window</p>
          <div className="mt-2 flex items-center gap-3">
            <StateBadge isOpen={isOpen} />
            <p className="text-sm text-gray-400">Current status</p>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            {lastChange
              ? `${lastChange.action === "OPENED" ? "Opened" : "Closed"} by ${lastChange.changedBy.username} on ${formatDateTime(lastChange.createdAt)}.`
              : "No recorded state changes yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading || isOpen}
            onClick={() => setWindow(true)}
            className="pmb-btn-primary"
          >
            Open Transfer Window
          </button>
          <button
            type="button"
            disabled={loading || !isOpen}
            onClick={() => setWindow(false)}
            className="pmb-btn-secondary"
          >
            Close Transfer Window
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="border-t border-pmb-border pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">History</h2>
            <p className="mt-1 text-sm text-gray-400">Actual administrator changes, newest first.</p>
          </div>
          <span className="pmb-badge">{historyTotal}</span>
        </div>

        {history.length === 0 ? (
          <p className="rounded-lg border border-dashed border-pmb-border px-4 py-8 text-center text-sm text-gray-500">
            No transfer-window changes have been recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-pmb-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-pmb-charcoal/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Administrator</th>
                  <th className="px-4 py-3">Date / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pmb-border">
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3"><StateBadge isOpen={entry.newIsOpen} /></td>
                    <td className="px-4 py-3 font-medium text-white">{entry.action === "OPENED" ? "Opened" : "Closed"}</td>
                    <td className="px-4 py-3 text-gray-300">{entry.changedBy.username}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyTotal > pageSize && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={historyLoading || page <= 1} onClick={() => loadHistory(page - 1)} className="pmb-btn-secondary px-3 py-1.5 text-xs disabled:opacity-30">
                Previous
              </button>
              <button type="button" disabled={historyLoading || page >= totalPages} onClick={() => loadHistory(page + 1)} className="pmb-btn-secondary px-3 py-1.5 text-xs disabled:opacity-30">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
