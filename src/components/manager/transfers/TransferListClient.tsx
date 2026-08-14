"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TransferDTO } from "@/lib/serialize-transfer";
import { TransferApiError, PaginatedTransfersResponse } from "@/lib/transfer-client";
import { ClubBadge } from "@/components/ClubBadge";
import { Skeleton } from "@/components/Skeleton";
import { TransferStatusBadge } from "./TransferStatusBadge";
import { TransferActionButtons } from "./TransferActionButtons";

const CLIENT_PAGE_SIZE = 8;

type StatusFilter = "ALL" | TransferDTO["status"];
type TypeFilter = "ALL" | TransferDTO["type"];

export function TransferListClient({
  fetcher,
  perspective,
  showStatusFilter = false,
  emptyMessage,
  onNotify,
}: {
  /** Pulls one page (up to 50, the API's max) of transfers for this view - filtering/search/pagination below then operate on that set client-side. */
  fetcher: () => Promise<PaginatedTransfersResponse>;
  perspective: "seller" | "buyer" | "admin" | "readonly";
  showStatusFilter?: boolean;
  emptyMessage: string;
  onNotify: (type: "success" | "error", message: string) => void;
}) {
  const [transfers, setTransfers] = useState<TransferDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetcher();
      setTransfers(data.transfers);
    } catch (err) {
      setError(err instanceof TransferApiError ? err.message : "Could not load transfers. Please try again.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleUpdated(updated: TransferDTO) {
    setTransfers((prev) => (prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : prev));
    onNotify("success", `Transfer for ${updated.playerName} updated.`);
  }

  const filtered = useMemo(() => {
    if (!transfers) return [];
    const q = search.trim().toLowerCase();
    return transfers.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
      if (!q) return true;
      return (
        t.playerName.toLowerCase().includes(q) ||
        t.fromClubName.toLowerCase().includes(q) ||
        t.toClubName.toLowerCase().includes(q) ||
        t.season.toLowerCase().includes(q)
      );
    });
  }, [transfers, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CLIENT_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * CLIENT_PAGE_SIZE, page * CLIENT_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by player, club, or season..."
          className="pmb-input sm:max-w-xs"
        />
        {showStatusFilter && (
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="pmb-input w-auto"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING_SELLER_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as TypeFilter);
                setPage(1);
              }}
              className="pmb-input w-auto"
            >
              <option value="ALL">All types</option>
              <option value="PERMANENT">Permanent</option>
              <option value="LOAN">Loan</option>
              <option value="SWAP">Swap</option>
              <option value="FREE_TRANSFER">Free Transfer</option>
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading transfers">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="pmb-card flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-28 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="pmb-card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button type="button" onClick={load} className="pmb-btn-secondary">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="pmb-card px-6 py-16 text-center text-sm text-gray-400">{emptyMessage}</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {pageRows.map((transfer) => (
            <div
              key={transfer.id}
              className="pmb-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link
                href={`${perspective === "admin" ? "/admin/transfers" : "/manager/transfers"}/${transfer.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <ClubBadge name={transfer.playerName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-white hover:text-pmb-gold">{transfer.playerName}</p>
                  <p className="truncate text-xs text-gray-500">
                    {transfer.fromClubName} &rarr; {transfer.toClubName} &middot; {transfer.season}
                    {transfer.fee != null && ` · ${transfer.currency} ${transfer.fee.toLocaleString()}`}
                  </p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <TransferStatusBadge status={transfer.status} />
                {perspective !== "readonly" && (
                  <TransferActionButtons
                    transfer={transfer}
                    perspective={perspective}
                    onUpdated={handleUpdated}
                    onError={(message) => onNotify("error", message)}
                    compact
                  />
                )}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 pt-2 text-sm text-gray-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="pmb-btn-secondary px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="pmb-btn-secondary px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
