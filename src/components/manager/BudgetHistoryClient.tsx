"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { SponsorAdBoost } from "@/components/manager/SponsorAdBoost";

type BudgetTransactionDTO = {
  id: string;
  amount: string;
  balanceAfter: string;
  type: "TRANSFER_IN" | "TRANSFER_OUT" | "ADMIN_ADJUSTMENT" | "COMPETITION_REWARD" | "AUCTION_WIN";
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

function formatMoney(value: string | number) {
  const n = Number(value);
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.abs(n));
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

  // Calculate financial statistics from transactions
  const transactions = data?.transactions || [];
  let totalInflow = 0;
  let totalOutflow = 0;
  let rewardTotal = 0;
  let transferInTotal = 0;
  let transferOutTotal = 0;
  let auctionWinTotal = 0;

  transactions.forEach((tx) => {
    const val = Number(tx.amount);
    if (val > 0) totalInflow += val;
    else totalOutflow += Math.abs(val);

    if (tx.type === "COMPETITION_REWARD") rewardTotal += val;
    if (tx.type === "TRANSFER_IN") transferInTotal += val;
    if (tx.type === "TRANSFER_OUT") transferOutTotal += Math.abs(val);
    if (tx.type === "AUCTION_WIN") auctionWinTotal += Math.abs(val);
  });

  const totalVolume = totalInflow + totalOutflow || 1;
  const inflowPercent = Math.round((totalInflow / totalVolume) * 100);
  const outflowPercent = Math.round((totalOutflow / totalVolume) * 100);

  return (
    <div className="space-y-6">
      {/* ─── DAILY SPONSOR VIDEO BOOST (+€200,000) ────────────────── */}
      <SponsorAdBoost onRewardClaimed={() => load()} />

      {/* ─── FINANCIAL KPI OVERVIEW ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Main Budget Card */}
        <div className="pmb-card p-6 border-pmb-gold/40 bg-gradient-to-br from-pmb-gold/10 via-black to-black">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
            Current Operating Treasury
          </p>
          {loading && !budget ? (
            <Skeleton className="mt-2 h-9 w-48" />
          ) : (
            <p className="mt-1 text-3xl font-black text-white sm:text-4xl">
              {budget != null
                ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(budget))
                : "—"}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Available for player wages, transfers & auctions</p>
        </div>

        {/* Total Inflow */}
        <div className="pmb-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Total Inflow (+)
            </p>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              Revenue
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">
            {formatMoney(totalInflow)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Match prizes & player sales</p>
        </div>

        {/* Total Outflow */}
        <div className="pmb-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              Total Outflow (−)
            </p>
            <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
              Expenses
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-red-400">
            {formatMoney(-totalOutflow)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Transfer signings & auction wins</p>
        </div>
      </div>

      {/* ─── VISUAL FINANCIAL BAR CHART ────────────────────────────── */}
      <div className="pmb-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            📊 Treasury Flow Distribution
          </h2>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Inflow ({inflowPercent}%)
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              Outflow ({outflowPercent}%)
            </span>
          </div>
        </div>

        {/* Dual Progress Bar */}
        <div className="h-4 w-full overflow-hidden rounded-full bg-black/60 flex p-0.5 border border-white/10">
          <div
            style={{ width: `${inflowPercent}%` }}
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all duration-700"
          />
          <div
            style={{ width: `${outflowPercent}%` }}
            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-r-full transition-all duration-700"
          />
        </div>

        {/* Category Breakdown Tiles */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
          <div className="rounded-xl border border-white/5 bg-black/40 p-3">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Match Rewards</span>
            <span className="text-sm font-black text-emerald-400">+{formatMoney(rewardTotal)}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/40 p-3">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Player Sales</span>
            <span className="text-sm font-black text-emerald-400">+{formatMoney(transferInTotal)}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/40 p-3">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Transfer Fees</span>
            <span className="text-sm font-black text-red-400">−{formatMoney(transferOutTotal)}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/40 p-3">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Auction Wins</span>
            <span className="text-sm font-black text-red-400">−{formatMoney(auctionWinTotal)}</span>
          </div>
        </div>
      </div>

      {/* ─── TRANSACTION HISTORY TABLE ─────────────────────────────── */}
      <div className="pmb-card overflow-hidden">
        <div className="border-b border-pmb-border bg-black/40 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Transaction Activity Ledger
          </h2>
          <span className="text-[10px] text-gray-500 font-bold">
            {data?.total || 0} Total Records
          </span>
        </div>

        {loading && (
          <div className="space-y-3 p-6" aria-busy="true">
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
          <p className="px-6 py-16 text-center text-sm text-gray-500">
            No transactions recorded yet.
          </p>
        )}

        {!loading && !error && data && data.transactions.length > 0 && (
          <div className="divide-y divide-pmb-border">
            {data.transactions.map((tx) => {
              const isCredit = Number(tx.amount) > 0;
              const typeBadge =
                tx.type === "COMPETITION_REWARD"
                  ? { label: "🏆 Match Prize", bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" }
                  : tx.type === "TRANSFER_IN"
                  ? { label: "📈 Player Sale", bg: "bg-sky-500/15 text-sky-400 border-sky-500/30" }
                  : tx.type === "TRANSFER_OUT"
                  ? { label: "📉 Signing Fee", bg: "bg-amber-500/15 text-amber-400 border-amber-500/30" }
                  : tx.type === "AUCTION_WIN"
                  ? { label: "⚡ Auction Win", bg: "bg-purple-500/15 text-purple-400 border-purple-500/30" }
                  : { label: "⚙️ Adjustment", bg: "bg-gray-500/15 text-gray-400 border-gray-500/30" };

              return (
                <div
                  key={tx.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition hover:bg-white/5"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${typeBadge.bg}`}
                    >
                      {typeBadge.label}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-white">
                        {tx.description || tx.type}
                      </p>
                      {tx.playerName && (
                        <p className="text-xs text-pmb-gold font-bold">
                          Player: {tx.playerName}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between text-right">
                    <span
                      className={`text-base font-black ${
                        isCredit ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatMoney(tx.amount)}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      Balance: {formatMoney(tx.balanceAfter).replace("+", "")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="pmb-btn-secondary text-xs disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-400">
            Page {page} of {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="pmb-btn-secondary text-xs disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
