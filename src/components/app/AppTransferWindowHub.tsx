"use client";

import { useState, useEffect } from "react";
import { TransferDTO } from "@/lib/serialize-transfer";
import { CreateTransferModal } from "@/components/manager/transfers/CreateTransferModal";

interface AppTransferData {
  club: {
    id: string;
    name: string;
    logo: string | null;
    budget: number;
  };
  windowOpen: boolean;
  stats: {
    awaitingMyApproval: number;
    myActiveRequests: number;
    completed: number;
    rejected: number;
  };
  incoming: TransferDTO[];
  outgoing: TransferDTO[];
  completed: TransferDTO[];
  rejected: TransferDTO[];
}

interface AppTransferWindowHubProps {
  onBack: () => void;
}

export function AppTransferWindowHub({ onBack }: AppTransferWindowHubProps) {
  const [data, setData] = useState<AppTransferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"OUTGOING" | "INCOMING" | "COMPLETED" | "REJECTED">("OUTGOING");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function loadTransfers() {
    fetch("/api/app/transfers")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load transfers:", err);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadTransfers();
  }, []);

  function fmt(n?: number | null) {
    return "€ " + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n || 0);
  }

  async function handleApprove(transferId: string) {
    setActionLoadingId(transferId);
    try {
      const res = await fetch(`/api/transfers/${transferId}/approve`, { method: "POST" });
      const resData = await res.json();
      if (res.ok) {
        setMessage("Transfer offer accepted successfully!");
        loadTransfers();
      } else {
        alert(resData.error || "Failed to approve transfer.");
      }
    } catch {
      alert("Error approving transfer.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(transferId: string) {
    setActionLoadingId(transferId);
    try {
      const res = await fetch(`/api/transfers/${transferId}/reject`, { method: "POST" });
      const resData = await res.json();
      if (res.ok) {
        setMessage("Transfer offer declined.");
        loadTransfers();
      } else {
        alert(resData.error || "Failed to reject transfer.");
      }
    } catch {
      alert("Error rejecting transfer.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(transferId: string) {
    setActionLoadingId(transferId);
    try {
      const res = await fetch(`/api/transfers/${transferId}/cancel`, { method: "POST" });
      const resData = await res.json();
      if (res.ok) {
        setMessage("Transfer request cancelled.");
        loadTransfers();
      } else {
        alert(resData.error || "Failed to cancel transfer.");
      }
    } catch {
      alert("Error cancelling transfer.");
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070709] text-white">
        <div className="h-12 w-12 rounded-full border-2 border-[#e9c349]/30 border-t-[#e9c349] animate-spin" />
        <p className="mt-4 font-montserrat text-xs font-black uppercase tracking-widest text-[#e9c349]">
          LOADING TRANSFER WINDOW...
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { club, windowOpen, incoming, outgoing, completed, rejected } = data;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto overflow-x-hidden bg-[#070709] text-white font-montserrat select-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 15% 15%, rgba(233,195,73,0.12) 0%, transparent 45%),
          radial-gradient(circle at 85% 85%, rgba(233,195,73,0.12) 0%, transparent 45%),
          radial-gradient(circle at 50% 50%, rgba(14,14,18,0.95) 0%, #060608 100%)
        `,
      }}
    >
      {/* ─── CREATE TRANSFER MODAL ─── */}
      {showCreateModal && (
        <CreateTransferModal
          clubId={club.id}
          clubName={club.name}
          windowOpen={windowOpen}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            setMessage("Transfer bid submitted successfully!");
            loadTransfers();
          }}
          onError={(msg) => alert(msg)}
        />
      )}

      {/* ─── TOP HEADER ─── */}
      <header className="relative z-20 w-full flex flex-wrap items-center justify-between gap-4 px-6 sm:px-10 pt-5 pb-3 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-2 rounded-full border border-[#e9c349]/70 bg-black/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#e9c349] shadow-[0_0_15px_rgba(233,195,73,0.3)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>‹</span>
            <span>TRANSFERS</span>
          </button>

          <div className="flex items-center gap-2">
            {club.logo && (
              <div className="w-8 h-8 rounded-full border border-[#e9c349]/50 bg-black/80 p-0.5 overflow-hidden flex items-center justify-center">
                <img src={club.logo} alt={club.name} className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                TRANSFER WINDOW CONTROL
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#e9c349]">
                {club.name} · Live Mercato
              </p>
            </div>
          </div>
        </div>

        {/* Live Budget Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349] bg-black/80 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.3)]">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs">
            €
          </div>
          <span className="text-xs sm:text-sm font-black text-white tracking-wider">
            {fmt(club.budget)}
          </span>
        </div>
      </header>

      {/* ─── TRANSFER WINDOW BANNER ─── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-5 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border border-[#e9c349]/40 bg-gradient-to-r from-black via-[#141419] to-black shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-widest ${
                windowOpen
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-red-500/20 text-red-400 border border-red-500/50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${windowOpen ? "bg-emerald-400 animate-ping" : "bg-red-400"}`} />
              <span>{windowOpen ? "TRANSFER WINDOW OPEN" : "WINDOW CLOSED"}</span>
            </span>

            <span className="hidden sm:inline text-xs text-gray-400 font-bold">
              Submit bids, review incoming deals, or sign superstar targets.
            </span>
          </div>

          <button
            type="button"
            disabled={!windowOpen}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_4px_20px_rgba(233,195,73,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
            }}
          >
            <span>+</span>
            <span>MAKE TRANSFER REQUEST</span>
          </button>
        </div>

        {message && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center justify-between">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* ─── 4 SEGMENTED APP TABS ─── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-3 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("OUTGOING")}
            className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              activeTab === "OUTGOING"
                ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
                : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
            }`}
          >
            OFFERS TO REVIEW ({outgoing.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("INCOMING")}
            className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              activeTab === "INCOMING"
                ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
                : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
            }`}
          >
            YOUR ACTIVE BIDS ({incoming.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMPLETED")}
            className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              activeTab === "COMPLETED"
                ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
                : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
            }`}
          >
            COMPLETED DEALS ({completed.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REJECTED")}
            className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              activeTab === "REJECTED"
                ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
                : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
            }`}
          >
            DECLINED ({rejected.length})
          </button>
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 flex-1">
        
        {/* ════ TAB 1: OFFERS TO REVIEW (Outgoing - Other clubs want your players) ════ */}
        {activeTab === "OUTGOING" && (
          <div className="space-y-4">
            {outgoing.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-black/60">
                <span className="text-4xl">📬</span>
                <h3 className="text-base font-black text-white mt-3">No Incoming Offers Yet</h3>
                <p className="text-xs text-gray-400 mt-1">
                  When rival clubs submit transfer bids for players in your squad, they will appear here for your review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outgoing.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-3xl border border-[#e9c349]/40 bg-gradient-to-b from-[#141419]/90 to-[#0a0a0d]/95 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white uppercase">{t.playerName}</h3>
                          <span className="text-[10px] font-bold text-[#e9c349] bg-black/60 px-2 py-0.5 rounded border border-[#e9c349]/30">
                            {t.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Buyer: <span className="font-bold text-white">{t.toClubName}</span>
                        </p>
                      </div>

                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-amber-500/50 bg-amber-500/20 text-amber-300">
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="my-3 p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between text-xs">
                      <span className="text-gray-400">Offered Transfer Fee:</span>
                      <span className="text-base font-black text-[#e9c349]">{fmt(t.fee)}</span>
                    </div>

                    {t.status === "PENDING_SELLER_APPROVAL" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={actionLoadingId === t.id}
                          onClick={() => handleApprove(t.id)}
                          className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white py-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          ✓ ACCEPT OFFER
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === t.id}
                          onClick={() => handleReject(t.id)}
                          className="flex-1 rounded-full bg-red-600 hover:bg-red-500 text-xs font-black text-white py-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          ✕ DECLINE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ TAB 2: ACTIVE BIDS (Incoming - You requested to buy) ════ */}
        {activeTab === "INCOMING" && (
          <div className="space-y-4">
            {incoming.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-black/60">
                <span className="text-4xl">📤</span>
                <h3 className="text-base font-black text-white mt-3">No Active Bids Sent</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Click &ldquo;+ MAKE TRANSFER REQUEST&rdquo; above to bid on players from other clubs.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incoming.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#141419]/90 to-[#0a0a0d]/95 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white uppercase">{t.playerName}</h3>
                          <span className="text-[10px] font-bold text-[#e9c349] bg-black/60 px-2 py-0.5 rounded border border-[#e9c349]/30">
                            {t.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Selling Club: <span className="font-bold text-white">{t.fromClubName}</span>
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          t.status === "APPROVED"
                            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                            : "border-sky-500/50 bg-sky-500/20 text-sky-300"
                        }`}
                      >
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="my-3 p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between text-xs">
                      <span className="text-gray-400">Your Bid Amount:</span>
                      <span className="text-base font-black text-[#e9c349]">{fmt(t.fee)}</span>
                    </div>

                    {t.status === "PENDING_SELLER_APPROVAL" && (
                      <button
                        type="button"
                        disabled={actionLoadingId === t.id}
                        onClick={() => handleCancel(t.id)}
                        className="rounded-full border border-red-500/40 hover:bg-red-500/10 text-xs font-black text-red-400 py-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        CANCEL BID
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ TAB 3: COMPLETED DEALS ════ */}
        {activeTab === "COMPLETED" && (
          <div className="space-y-4">
            {completed.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-black/60">
                <span className="text-4xl">✅</span>
                <h3 className="text-base font-black text-white mt-3">No Completed Deals Yet</h3>
                <p className="text-xs text-gray-400 mt-1">Officially ratified transfers will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completed.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-3xl border border-emerald-500/30 bg-black/80 p-5 shadow-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white uppercase">{t.playerName}</h3>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          OFFICIAL DEAL
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {t.fromClubName} » <span className="font-bold text-white">{t.toClubName}</span>
                      </p>
                    </div>

                    <span className="text-sm sm:text-base font-black text-[#e9c349]">{fmt(t.fee)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ TAB 4: DECLINED / REJECTED ════ */}
        {activeTab === "REJECTED" && (
          <div className="space-y-4">
            {rejected.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-black/60">
                <span className="text-4xl">👌</span>
                <h3 className="text-base font-black text-white mt-3">No Declined Deals</h3>
                <p className="text-xs text-gray-400 mt-1">No rejected or cancelled transfers on record.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rejected.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-3xl border border-red-500/30 bg-black/80 p-5 shadow-xl flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-black text-gray-300 uppercase">{t.playerName}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {t.fromClubName} » {t.toClubName}
                      </p>
                    </div>

                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                      DECLINED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · TRANSFER OPERATIONS CONTROL
      </footer>
    </div>
  );
}
