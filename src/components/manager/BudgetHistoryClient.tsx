"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";

type BudgetTransactionDTO = {
  id: string;
  amount: string;
  balanceAfter: string;
  type: "TRANSFER_IN" | "TRANSFER_OUT" | "ADMIN_ADJUSTMENT";
  description: string | null;
  transferId: string | null;
  playerId: string | null;
  playerName: string | null;
  createdAt: string;
};

type HistoryResponse = {
  transactions: BudgetTransactionDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE = 20;

function formatMoney(value: string) {
  const n = Number(value);
  const sign = n > 0 ? "+" : n < 0 ? "\u2212" : "";
  const abs = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(n));
  return `${sign}${abs}`;
}

export function BudgetHistoryClient() {
  const [budget, setBudget] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetRes, historyRes] = await Promise.all([
        fetch("/api/manager/budget"),
        fetch(`/api/manager/budget/history?page=${page}&pageSize=${PAGE_SIZE}`),
      ]);
      if (!budgetRes.ok || !historyRes.ok) {
        throw new Error("Could not load budget information.");
      }
      const budgetData = await budgetRes.json();
      const historyData = await historyRes.json();
      setBudget(budgetData.budget);
      setData(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load budget information.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="pmb-card p-6">
        <p className="text-xs uppercase tracking-wide text-gray-500">Current Budget</p>
        {loading && !budget ? (
          <Skeleton className="mt-2 h-9 w-48" />
        ) : (
          <p className="mt-1 text-3xl font-bold text-pmb-gold">
            {budget != null
              ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(budget))
              : "—"}
          </p>
        )}
      </div>

      <div className="pmb-card overflow-hidden">
        <div className="border-b border-pmb-border px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-400">Transaction History</h2>
        </div>

        {loading && (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading budget history">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button type="button" onClick={load} className="pmb-btn-secondary">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && data && data.transactions.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-gray-400">
            No budget activity yet. This fills in as completed transfers move money in or out.
          </div>
        )}

        {!loading && !error && data && data.transactions.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-pmb-border bg-pmb-charcoal/60 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Transfer</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pmb-border">
                  {data.transactions.map((txn) => {
                    const isCredit = Number(txn.amount) > 0;
                    return (
                      <tr key={txn.id} className="hover:bg-pmb-charcoal/40">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                          {new Date(txn.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {txn.description ?? (txn.type === "TRANSFER_IN" ? "Player sale" : "Player purchase")}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{txn.playerName ?? "—"}</td>
                        <td className="px-4 py-3">
                          {txn.transferId ? (
                            <Link
                              href={`/manager/transfers/${txn.transferId}`}
                              className="text-pmb-gold hover:underline"
                            >
                              View
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                            isCredit ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {formatMoney(txn.amount)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-400">
                          {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
                            Number(txn.balanceAfter)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-pmb-border px-4 py-3 text-sm text-gray-400">
                <span>
                  Page {data.page} of {data.totalPages}
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
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="pmb-btn-secondary px-3 py-1.5 text-xs disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
