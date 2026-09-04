"use client";

import { useState, useEffect, useCallback } from "react";
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

interface BudgetHistoryData {
  club: {
    id: string;
    name: string;
    logo: string | null;
    budget: number;
  };
  metrics: {
    totalInflow: number;
    totalOutflow: number;
    rewardTotal: number;
    transferInTotal: number;
    transferOutTotal: number;
    auctionWinTotal: number;
  };
  transactions: BudgetTransactionDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AppBudgetHistoryHubProps {
  onBack: () => void;
}

export function AppBudgetHistoryHub({ onBack }: AppBudgetHistoryHubProps) {
  const [data, setData] = useState<BudgetHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/app/budget/history?page=${page}&pageSize=20`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load budget history:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function fmtMoney(value: string | number) {
    const n = Number(value);
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Math.abs(n));
    return `${sign}${formatted}`;
  }

  const budget = data?.club?.budget ?? 0;
  const metrics = data?.metrics ?? {
    totalInflow: 0,
    totalOutflow: 0,
    rewardTotal: 0,
    transferInTotal: 0,
    transferOutTotal: 0,
    auctionWinTotal: 0,
  };

  const totalVolume = metrics.totalInflow + metrics.totalOutflow || 1;
  const inflowPercent = Math.round((metrics.totalInflow / totalVolume) * 100);
  const outflowPercent = Math.round((metrics.totalOutflow / totalVolume) * 100);

  const filteredTransactions = (data?.transactions || []).filter((tx) => {
    if (typeFilter === "ALL") return true;
    return tx.type === typeFilter;
  });

  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#070709] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-montserrat select-none">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e9c349]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* ─── APP HEADER ─── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md">
        {/* Back Button & Club Info */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:scale-105 hover:border-[#e9c349] hover:text-[#e9c349] active:scale-95 cursor-pointer"
          >
            <span>‹</span>
            <span>BACK</span>
          </button>

          <div className="flex items-center gap-3">
            {data?.club?.logo ? (
              <img
                src={data.club.logo}
                alt={data.club.name}
                className="w-9 h-9 object-contain rounded-lg drop-shadow-[0_0_8px_rgba(233,195,73,0.3)]"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg border border-[#e9c349]/40 bg-black/80 flex items-center justify-center font-black text-[#e9c349] text-xs">
                {data?.club?.name?.slice(0, 2).toUpperCase() || "PMB"}
              </div>
            )}
            <div>
              <h1 className="font-montserrat text-sm sm:text-base font-black uppercase tracking-wider text-white">
                {data?.club?.name || "CLUB BUDGET HISTORY"}
              </h1>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">
                FINANCIAL ACTIVITY & TREASURY
              </span>
            </div>
          </div>
        </div>

        {/* Live Current Budget Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349]/80 bg-black/90 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.35)]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs">
            €
          </div>
          <span className="font-montserrat text-sm sm:text-base font-black tracking-wider text-[#e9c349]">
            {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(budget)}
          </span>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* ─── 1. SPONSOR VIDEO BOOST ─── */}
        <div className="rounded-3xl border border-[#e9c349]/30 bg-black/60 backdrop-blur-xl p-2 sm:p-4 shadow-xl">
          <SponsorAdBoost onRewardClaimed={() => loadHistory()} />
        </div>

        {/* ─── 2. FINANCIAL KPI OVERVIEW ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Main Budget Card */}
          <div className="rounded-3xl border border-[#e9c349]/60 bg-gradient-to-br from-[#e9c349]/15 via-black/90 to-[#070709] p-6 shadow-[0_0_30px_rgba(233,195,73,0.15)] flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#e9c349]">
                Current Operating Treasury
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(233,195,73,0.5)]">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                }).format(budget)}
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-400 font-medium">
              Available for player wages, transfers & live auctions
            </p>
          </div>

          {/* Total Inflow (+) */}
          <div className="rounded-3xl border border-emerald-500/30 bg-black/80 p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Total Inflow (+)
              </p>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Revenue
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              {fmtMoney(metrics.totalInflow)}
            </p>
            <p className="mt-2 text-xs text-gray-400">Match rewards & player sales</p>
          </div>

          {/* Total Outflow (−) */}
          <div className="rounded-3xl border border-red-500/30 bg-black/80 p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                Total Outflow (−)
              </p>
              <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-400">
                Expenses
              </span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
              {fmtMoney(-metrics.totalOutflow)}
            </p>
            <p className="mt-2 text-xs text-gray-400">Transfer signings & auction bids</p>
          </div>
        </div>

        {/* ─── 3. TREASURY FLOW DISTRIBUTION ─── */}
        <div className="rounded-3xl border border-white/15 bg-black/70 backdrop-blur-xl p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#e9c349] flex items-center gap-2">
              <span>📊</span>
              <span>Treasury Flow Distribution</span>
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold">
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

          {/* Dual Bar */}
          <div className="h-4 w-full overflow-hidden rounded-full bg-black/80 flex p-0.5 border border-white/10">
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
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">🏆 Match Rewards</span>
              <span className="text-sm sm:text-base font-black text-emerald-400 mt-1 block">
                +{fmtMoney(metrics.rewardTotal)}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">📈 Player Sales</span>
              <span className="text-sm sm:text-base font-black text-emerald-400 mt-1 block">
                +{fmtMoney(metrics.transferInTotal)}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">📉 Transfer Fees</span>
              <span className="text-sm sm:text-base font-black text-red-400 mt-1 block">
                −{fmtMoney(metrics.transferOutTotal)}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">⚡ Auction Wins</span>
              <span className="text-sm sm:text-base font-black text-red-400 mt-1 block">
                −{fmtMoney(metrics.auctionWinTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 4. TRANSACTION ACTIVITY LEDGER ─── */}
        <div className="rounded-3xl border border-[#e9c349]/30 bg-black/80 backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Header & Filter Chips */}
          <div className="border-b border-white/10 bg-white/5 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Transaction Activity Ledger
              </h2>
              <span className="text-[10px] text-gray-400 font-bold">
                {data?.total || 0} Total Records on File
              </span>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "ALL", label: "ALL" },
                { id: "COMPETITION_REWARD", label: "PRIZES" },
                { id: "TRANSFER_IN", label: "SALES" },
                { id: "TRANSFER_OUT", label: "SIGNINGS" },
                { id: "AUCTION_WIN", label: "AUCTIONS" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTypeFilter(f.id)}
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    typeFilter === f.id
                      ? "bg-[#e9c349] text-black shadow-[0_0_10px_rgba(233,195,73,0.5)]"
                      : "bg-black/60 border border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-[#e9c349] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading Treasury Records...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <span className="text-3xl">🪙</span>
              <p className="mt-2 text-sm font-bold text-white uppercase">No Transactions Recorded</p>
              <p className="text-xs text-gray-500 mt-1">There are no matching entries in your financial ledger.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredTransactions.map((tx) => {
                const isCredit = Number(tx.amount) > 0;
                const typeBadge =
                  tx.type === "COMPETITION_REWARD"
                    ? { label: "🏆 Match Prize", bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" }
                    : tx.type === "TRANSFER_IN"
                    ? { label: "📈 Player Sale", bg: "bg-sky-500/15 text-sky-400 border-sky-500/40" }
                    : tx.type === "TRANSFER_OUT"
                    ? { label: "📉 Signing Fee", bg: "bg-amber-500/15 text-amber-400 border-amber-500/40" }
                    : tx.type === "AUCTION_WIN"
                    ? { label: "⚡ Auction Win", bg: "bg-purple-500/15 text-purple-400 border-purple-500/40" }
                    : { label: "⚙️ Adjustment", bg: "bg-gray-500/15 text-gray-400 border-gray-500/40" };

                return (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 transition hover:bg-white/5"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shrink-0 ${typeBadge.bg}`}
                      >
                        {typeBadge.label}
                      </span>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-white">
                          {tx.description || tx.type}
                        </p>
                        {tx.playerName && (
                          <p className="text-xs text-[#e9c349] font-black mt-0.5">
                            Player: {tx.playerName}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between text-right border-t border-white/5 pt-2 sm:border-0 sm:pt-0">
                      <span
                        className={`text-base sm:text-lg font-black tracking-wider ${
                          isCredit ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {fmtMoney(tx.amount)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold font-mono">
                        Balance: {fmtMoney(tx.balanceAfter).replace("+", "")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="border-t border-white/10 bg-white/5 px-6 py-3 flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-xs font-bold text-gray-300 disabled:opacity-40 hover:text-white cursor-pointer"
              >
                ← Previous
              </button>
              <span className="text-xs text-gray-400 font-bold">
                Page {page} of {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-xs font-bold text-gray-300 disabled:opacity-40 hover:text-white cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </div>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · OPERATING TREASURY AUDIT
      </footer>
    </div>
  );
}
