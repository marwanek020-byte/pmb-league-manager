"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { TransferDTO } from "@/lib/serialize-transfer";
import { TransferWindowBanner } from "./TransferWindowBanner";
import { CreateTransferModal } from "./CreateTransferModal";
import { useToast } from "@/lib/use-toast";

export type TransferDashboardStats = {
  awaitingMyApproval: number;
  myActiveRequests: number;
  completed: number;
  rejected: number;
};

type BreakingNews = {
  id: string;
  tag: string;
  headline: string;
  time: string;
};

export function TransferDashboardClient({
  clubId,
  clubName,
  windowOpen,
  stats,
}: {
  clubId: string;
  clubName: string;
  windowOpen: boolean;
  stats: TransferDashboardStats;
}) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { showSuccess, showError } = useToast();
  const [newsIndex, setNewsIndex] = useState(0);

  // Dynamic breaking transfer feed
  const breakingNews: BreakingNews[] = [
    {
      id: "1",
      tag: "🚨 BREAKING",
      headline: "Transfer Market is actively open! Clubs are negotiating superstar deals.",
      time: "Just now",
    },
    {
      id: "2",
      tag: "⚡ AUCTION WAR",
      headline: "Free Agent Player Auctions are live in the Arena. Bid now before timers expire!",
      time: "2m ago",
    },
    {
      id: "3",
      tag: "💰 FINANCIAL ALERT",
      headline: `${clubName} management has confirmed operating budget available for signings.`,
      time: "5m ago",
    },
    {
      id: "4",
      tag: "🔥 SCOUT REPORT",
      headline: "Top rated midfielders and forwards are available on the transfer list.",
      time: "12m ago",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % breakingNews.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [breakingNews.length]);

  function handleCreated(transfer: TransferDTO) {
    showSuccess(`Transfer request for ${transfer.playerName} was sent to ${transfer.fromClubName}.`);
    router.refresh();
  }

  const currentNews = breakingNews[newsIndex];

  return (
    <div className="space-y-6">
      {/* ─── LIVE BREAKING TRANSFER TICKER ─────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-[#1c0709] via-black to-[#140608] p-3 shadow-[0_0_30px_rgba(239,68,68,0.18)]">
        <div className="flex items-center gap-3">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/40">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            {currentNews.tag}
          </span>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-xs font-semibold text-gray-200 transition-all duration-500">
              {currentNews.headline}
            </p>
          </div>
          <span className="hidden text-[10px] font-bold text-gray-500 sm:inline">
            {currentNews.time}
          </span>
        </div>
      </div>

      <TransferWindowBanner isOpen={windowOpen} />

      {/* ─── ACTION HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            Transfer Operations Control
          </h2>
          <p className="text-xs text-gray-400">
            Manage incoming player requests, negotiate club contracts, and initiate bids.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Link
            href="/manager/free-agents"
            className="pmb-btn-secondary whitespace-nowrap text-xs font-bold text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
          >
            🆓 سوق اللاعبين الأحرار (0 €)
          </Link>
          <Link
            href="/manager/auctions"
            className="pmb-btn-secondary whitespace-nowrap text-xs font-bold text-pmb-gold border-pmb-gold/30"
          >
            ⚡ Live Auctions
          </Link>
          <button
            type="button"
            disabled={!windowOpen}
            onClick={() => setShowCreateModal(true)}
            className="pmb-btn-primary whitespace-nowrap text-xs font-bold shadow-gold"
            title={!windowOpen ? "The transfer window is closed" : undefined}
          >
            + Request a Transfer
          </button>
        </div>
      </div>

      {/* ─── STATS BENTO CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/manager/transfers/outgoing"
          className="pmb-card p-6 transition-all duration-300 hover:border-pmb-gold/60 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-pmb-gold">{stats.awaitingMyApproval}</p>
            <span className="rounded-lg bg-pmb-gold/10 p-2 text-xl">📬</span>
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-300">
            Awaiting Approval
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">Offers for your players</p>
        </Link>

        <Link
          href="/manager/transfers/incoming"
          className="pmb-card p-6 transition-all duration-300 hover:border-pmb-gold/60 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-sky-400">{stats.myActiveRequests}</p>
            <span className="rounded-lg bg-sky-500/10 p-2 text-xl">📤</span>
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-300">
            Active Bids
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">Players you requested</p>
        </Link>

        <Link
          href="/manager/transfers/completed"
          className="pmb-card p-6 transition-all duration-300 hover:border-pmb-gold/60 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-emerald-400">{stats.completed}</p>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-xl">✅</span>
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-300">
            Completed Deals
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">Official signed transfers</p>
        </Link>

        <Link
          href="/manager/transfers/rejected"
          className="pmb-card p-6 transition-all duration-300 hover:border-pmb-gold/60 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-red-400">{stats.rejected}</p>
            <span className="rounded-lg bg-red-500/10 p-2 text-xl">❌</span>
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-300">
            Declined / Cancelled
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">Unsuccessful negotiations</p>
        </Link>
      </div>

      {/* ─── QUICK NAVIGATION TILES ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/manager/transfers/outgoing"
          className="pmb-card flex flex-col gap-2 p-6 transition hover:border-pmb-gold/60"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">📩</span>
            <h3 className="font-bold text-white">Outgoing Offers to Review</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Other clubs want to sign players from your squad. Accept profitable bids or decline to protect your squad depth.
          </p>
        </Link>

        <Link
          href="/manager/transfers/incoming"
          className="pmb-card flex flex-col gap-2 p-6 transition hover:border-pmb-gold/60"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h3 className="font-bold text-white">Your Target Signings</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Track status of active offers sent to rival clubs. Cancel pending bids anytime before they are accepted.
          </p>
        </Link>
      </div>

      {showCreateModal && (
        <CreateTransferModal
          clubId={clubId}
          clubName={clubName}
          windowOpen={windowOpen}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
          onError={showError}
        />
      )}
    </div>
  );
}
