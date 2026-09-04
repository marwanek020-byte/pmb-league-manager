"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ContractDemands } from "@/lib/services/botola-contract-service";

const BotolaContractRoom3D = dynamic(
  () => import("../manager/contracts/BotolaContractRoom3D").then((m) => m.BotolaContractRoom3D),
  { ssr: false }
);

interface Player {
  id: string;
  fullName: string;
  overallRating: number | null;
  position: string;
  photo: string | null;
  nationality: string;
  realClub?: string;
  marketValue: number | null;
  seasonSalary: number;
  primeSignature: number;
  contractSeasonsLeft: number;
  squadRole: string;
  releaseClause: number | null;
  contractSatisfaction: number;
  lastNegotiatedAt: string | null;
  awaitsAdmin?: boolean;
}

interface AppContractsHubProps {
  onBack: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  CRUCIAL: "🌟 CRUCIAL",
  IMPORTANT: "⚽ IMPORTANT",
  ROTATION: "🔄 ROTATION",
  BACKUP: "🛡️ BACKUP",
  PROSPECT: "🐣 PROSPECT",
};

const SATISFACTION_COLOR = (n: number) =>
  n >= 80 ? "#34d399" : n >= 55 ? "#fbbf24" : "#f87171";

export function AppContractsHub({ onBack }: AppContractsHubProps) {
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<{ id: string; name: string; logo: string | null; budget: number } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pendingList, setPendingList] = useState<Player[]>([]);
  const [budget, setBudget] = useState(0);
  const [activeTab, setActiveTab] = useState<"SQUAD" | "PENDING" | "SEVERANCE">("SQUAD");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

  // 3D Negotiation Room state
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [negotiationData, setNegotiationData] = useState<{
    demands: ContractDemands;
    clubBudget: number;
  } | null>(null);

  // Severance modal state
  const [terminatingPlayer, setTerminatingPlayer] = useState<Player | null>(null);
  const [terminationDetails, setTerminationDetails] = useState<any>(null);
  const [severanceOffer, setSeveranceOffer] = useState<number>(0);
  const [submittingTermination, setSubmittingTermination] = useState(false);

  useEffect(() => {
    fetch("/api/app/contracts")
      .then((res) => res.json())
      .then((data) => {
        if (data.club) setClub(data.club);
        if (data.club?.budget) setBudget(data.club.budget);
        if (data.squad) setPlayers(data.squad);
        if (data.pendingSignings) setPendingList(data.pendingSignings);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load contracts data:", err);
        setLoading(false);
      });
  }, []);

  // Currency formatter
  function fmt(n: number) {
    return "€ " + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  }

  // Analytics
  const totalSalary = players.reduce((sum, p) => sum + (p.seasonSalary || 0), 0);
  const totalPrime = players.reduce((sum, p) => sum + (p.primeSignature || 0), 0);
  const urgentCount = players.filter((p) => p.contractSatisfaction < 60 || p.contractSeasonsLeft <= 0).length;

  // Filtered squad list
  const filteredSquad = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch =
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nationality.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "ALL" || p.squadRole === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [players, searchTerm, filterRole]);

  // Open 3D Negotiation Room
  async function openNegotiations(player: Player) {
    setLoadingId(player.id);
    try {
      const res = await fetch(`/api/manager/players/${player.id}/contract`);
      const data = await res.json();
      if (!res.ok || !data.demands) {
        alert(data.error || "Failed to load contract demands. Please try again.");
        return;
      }
      setNegotiationData({ demands: data.demands, clubBudget: data.clubBudget || budget });
      setActivePlayer(data.player ?? player);
    } catch (err) {
      console.error("Contract negotiation error:", err);
      alert("Error connecting to the 3D negotiation room.");
    } finally {
      setLoadingId(null);
    }
  }

  // Handle successful signing in 3D
  function handleSigned(contract: {
    primeSignature: number;
    seasonSalary: number;
    clubBudgetAfter: number;
    awaitsAdmin?: boolean;
  }) {
    if (!activePlayer) return;

    const isPending = pendingList.some((p) => p.id === activePlayer.id);

    if (isPending) {
      if (contract.awaitsAdmin) {
        setPendingList((prev) =>
          prev.map((p) =>
            p.id === activePlayer.id
              ? {
                  ...p,
                  awaitsAdmin: true,
                  primeSignature: contract.primeSignature,
                  seasonSalary: contract.seasonSalary,
                }
              : p
          )
        );
      } else {
        setPendingList((prev) => prev.filter((p) => p.id !== activePlayer.id));
        const newlySigned: Player = {
          ...activePlayer,
          primeSignature: contract.primeSignature,
          seasonSalary: contract.seasonSalary,
          contractSatisfaction: 100,
          contractSeasonsLeft: Math.max(1, activePlayer.contractSeasonsLeft),
        };
        setPlayers((prev) => [newlySigned, ...prev]);
      }
    } else {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === activePlayer.id
            ? {
                ...p,
                primeSignature: contract.primeSignature,
                seasonSalary: contract.seasonSalary,
                contractSatisfaction: 100,
                contractSeasonsLeft: Math.max(1, p.contractSeasonsLeft),
              }
            : p
        )
      );
    }

    setBudget(contract.clubBudgetAfter);
    setActivePlayer(null);
    setNegotiationData(null);
  }

  // Severance modal
  async function openTerminationModal(player: Player) {
    setLoadingId(player.id);
    try {
      const res = await fetch(`/api/manager/players/${player.id}/contract/release`);
      const data = await res.json();
      if (!res.ok || !data.details) {
        alert(data.error || "Failed to load contract termination details.");
        return;
      }
      setTerminatingPlayer(player);
      setTerminationDetails(data.details);
      setSeveranceOffer(data.details.requestedSeverance);
    } catch {
      alert("Error loading termination details.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleConfirmTermination() {
    if (!terminatingPlayer || !terminationDetails) return;
    if (severanceOffer < terminationDetails.minAcceptableSeverance) {
      alert("The agent rejected this offer as too low. Please submit a fair severance amount.");
      return;
    }
    if (severanceOffer > budget) {
      alert("Club budget is insufficient to pay this severance fee.");
      return;
    }

    setSubmittingTermination(true);
    try {
      const res = await fetch(`/api/manager/players/${terminatingPlayer.id}/contract/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severanceAmount: severanceOffer }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Contract terminated successfully.");
        setPlayers((prev) => prev.filter((p) => p.id !== terminatingPlayer.id));
        setBudget(data.clubBudgetAfter);
        setTerminatingPlayer(null);
        setTerminationDetails(null);
      } else {
        alert(data.error || "Failed to terminate contract.");
      }
    } catch {
      alert("Error executing contract termination.");
    } finally {
      setSubmittingTermination(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070709] text-white">
        <div className="h-12 w-12 rounded-full border-2 border-[#e9c349]/30 border-t-[#e9c349] animate-spin" />
        <p className="mt-4 font-montserrat text-xs font-black uppercase tracking-widest text-[#e9c349]">
          LOADING CONTRACTS & 3D ROOM...
        </p>
      </div>
    );
  }

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
      {/* ─── 3D NEGOTIATION ROOM MODAL (When active) ─── */}
      {activePlayer && negotiationData && (
        <div className="fixed inset-0 z-[100] bg-black">
          <BotolaContractRoom3D
            player={activePlayer}
            demands={negotiationData.demands}
            clubBudget={budget}
            onClose={() => {
              setActivePlayer(null);
              setNegotiationData(null);
            }}
            onSigned={handleSigned}
            onCollapsed={() => {
              setActivePlayer(null);
              setNegotiationData(null);
            }}
          />
        </div>
      )}

      {/* ─── MUTUAL TERMINATION MODAL ─── */}
      {terminatingPlayer && terminationDetails && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-3xl border border-red-500/50 bg-[#121217] p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-red-400 uppercase tracking-wider flex items-center gap-2">
                <span>⚠️</span>
                <span>Mutual Contract Termination</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setTerminatingPlayer(null);
                  setTerminationDetails(null);
                }}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Negotiate amicable severance with <span className="font-bold text-white">{terminatingPlayer.fullName}</span>.
            </p>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-black/60 border border-white/10 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Annual Salary:</span>
                <span className="font-bold">{fmt(terminationDetails.annualSalary)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Contract Left:</span>
                <span className="font-bold">{terminationDetails.seasonsLeft} Seasons</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Agent Requested Severance:</span>
                <span className="font-bold text-[#e9c349]">{fmt(terminationDetails.requestedSeverance)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Minimum Acceptable:</span>
                <span className="font-bold text-emerald-400">{fmt(terminationDetails.minAcceptableSeverance)}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                Your Severance Offer (€):
              </label>
              <input
                type="number"
                value={severanceOffer}
                onChange={(e) => setSeveranceOffer(Number(e.target.value))}
                className="w-full rounded-xl border border-white/20 bg-black/80 p-3 text-sm font-bold text-white focus:border-[#e9c349] outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTerminatingPlayer(null);
                  setTerminationDetails(null);
                }}
                className="px-5 py-2.5 rounded-full border border-white/20 text-xs font-black text-gray-300 hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={submittingTermination}
                onClick={handleConfirmTermination}
                className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-xs font-black text-white shadow-lg active:scale-95 disabled:opacity-50"
              >
                {submittingTermination ? "PROCESSING..." : "CONFIRM SEVERANCE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOP APP HEADER (Back + Club + Budget Pill) ─── */}
      <header className="relative z-20 w-full flex flex-wrap items-center justify-between gap-4 px-6 sm:px-10 pt-5 pb-3 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-2 rounded-full border border-[#e9c349]/70 bg-black/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#e9c349] shadow-[0_0_15px_rgba(233,195,73,0.3)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>‹</span>
            <span>DASHBOARD</span>
          </button>

          <div className="flex items-center gap-2">
            {club?.logo && (
              <div className="w-8 h-8 rounded-full border border-[#e9c349]/50 bg-black/80 p-0.5 overflow-hidden flex items-center justify-center">
                <img src={club.logo} alt={club.name} className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                {club?.name || "CLUB"} CONTRACTS & PAYROLL
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#e9c349]">
                Interactive 3D Negotiation Suite
              </p>
            </div>
          </div>
        </div>

        {/* Live Available Budget Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349] bg-black/80 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.3)]">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs">
            €
          </div>
          <span className="text-xs sm:text-sm font-black text-white tracking-wider">
            {fmt(budget)}
          </span>
        </div>
      </header>

      {/* ─── FINANCIAL ANALYTICS METRICS ROW ─── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-5 pb-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Annual Payroll */}
          <div className="rounded-2xl border border-white/10 bg-black/70 p-4 shadow-lg backdrop-blur-md">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Annual Payroll
            </span>
            <span className="text-base sm:text-lg font-black text-white">
              {fmt(totalSalary)}
            </span>
            <span className="text-[9px] text-[#e9c349] block mt-0.5 font-mono">
              per season
            </span>
          </div>

          {/* Card 2: Sign-on Bonuses */}
          <div className="rounded-2xl border border-white/10 bg-black/70 p-4 shadow-lg backdrop-blur-md">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Sign-on Bonuses
            </span>
            <span className="text-base sm:text-lg font-black text-[#e9c349]">
              {fmt(totalPrime)}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">
              paid upfront
            </span>
          </div>

          {/* Card 3: Urgent Renewals */}
          <div className="rounded-2xl border border-white/10 bg-black/70 p-4 shadow-lg backdrop-blur-md">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Urgent Renewals
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-base sm:text-lg font-black ${urgentCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {urgentCount} Players
              </span>
              {urgentCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <span className="text-[9px] text-gray-400 block mt-0.5 font-mono">
              satisfaction &lt; 60%
            </span>
          </div>

          {/* Card 4: Squad Contracts Count */}
          <div className="rounded-2xl border border-white/10 bg-black/70 p-4 shadow-lg backdrop-blur-md">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Active Contracts
            </span>
            <span className="text-base sm:text-lg font-black text-white">
              {players.length} Players
            </span>
            <span className="text-[9px] text-emerald-400 block mt-0.5 font-mono">
              {pendingList.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* ─── TABS BAR ─── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-4 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("SQUAD")}
            className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              activeTab === "SQUAD"
                ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
                : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
            }`}
          >
            SQUAD CONTRACTS ({players.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${
              activeTab === "PENDING"
                ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_15px_rgba(233,195,73,0.4)]"
                : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
            }`}
          >
            PENDING SIGNINGS ({pendingList.length})
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 flex-1">
        
        {/* ════ TAB 1: SQUAD CONTRACTS ════ */}
        {activeTab === "SQUAD" && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search player name, position, country..."
                className="flex-1 min-w-[200px] bg-transparent text-xs text-white placeholder-gray-500 outline-none px-2"
              />

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Role:</span>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="rounded-xl border border-white/20 bg-black/90 px-3 py-1 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="CRUCIAL">Crucial</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="ROTATION">Rotation</option>
                  <option value="BACKUP">Backup</option>
                  <option value="PROSPECT">Prospect</option>
                </select>
              </div>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSquad.map((player) => (
                <div
                  key={player.id}
                  className="group relative rounded-3xl border border-white/15 bg-gradient-to-b from-[#141419]/90 to-[#0a0a0d]/95 p-5 shadow-xl backdrop-blur-md hover:border-[#e9c349]/70 hover:shadow-[0_0_25px_rgba(233,195,73,0.15)] transition-all flex flex-col justify-between"
                >
                  {/* Top Row: Player Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded-2xl border border-[#e9c349]/50 bg-black/90 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                        {player.photo ? (
                          <img src={player.photo} alt={player.fullName} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                        {player.overallRating && (
                          <span className="absolute bottom-0 right-0 bg-[#e9c349] text-black text-[9px] font-black px-1 rounded-tl-md">
                            {player.overallRating}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black uppercase text-white truncate max-w-[150px]">
                            {player.fullName}
                          </h3>
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-black text-[#e9c349]">
                            {player.position}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {player.nationality} · {ROLE_LABELS[player.squadRole] || player.squadRole}
                        </p>
                      </div>
                    </div>

                    {/* Contract seasons left tag */}
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          player.contractSeasonsLeft <= 0
                            ? "bg-red-500/20 border-red-500/50 text-red-400"
                            : player.contractSeasonsLeft === 1
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                            : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        }`}
                      >
                        {player.contractSeasonsLeft <= 0
                          ? "EXPIRED"
                          : `${player.contractSeasonsLeft} YRS LEFT`}
                      </span>
                    </div>
                  </div>

                  {/* Financial & Satisfaction Details */}
                  <div className="my-3 p-3 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 text-[10px]">Annual Salary:</span>
                      <span className="font-bold text-white">{fmt(player.seasonSalary)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 text-[10px]">Sign-on Prime:</span>
                      <span className="font-bold text-[#e9c349]">{fmt(player.primeSignature)}</span>
                    </div>

                    {/* Satisfaction Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-gray-400">Satisfaction:</span>
                        <span
                          className="font-bold"
                          style={{ color: SATISFACTION_COLOR(player.contractSatisfaction) }}
                        >
                          {player.contractSatisfaction}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(5, player.contractSatisfaction))}%`,
                            backgroundColor: SATISFACTION_COLOR(player.contractSatisfaction),
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={loadingId === player.id}
                      onClick={() => openNegotiations(player)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider text-black shadow-[0_4px_15px_rgba(233,195,73,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                      }}
                    >
                      <span>🕶️</span>
                      <span>{loadingId === player.id ? "CONNECTING..." : "NEGOTIATE IN 3D"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === player.id}
                      onClick={() => openTerminationModal(player)}
                      className="px-3 py-2 rounded-full border border-red-500/40 text-[10px] font-black text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Mutual Severance & Release"
                    >
                      RELEASE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ TAB 2: PENDING SIGNINGS ════ */}
        {activeTab === "PENDING" && (
          <div className="space-y-4">
            {pendingList.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-black/60">
                <span className="text-4xl">🤝</span>
                <h3 className="text-base font-black text-white mt-3">No Pending Signings</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Players won in transfers or auctions will appear here awaiting their 3D contract room negotiation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingList.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-3xl border border-[#e9c349]/50 bg-black/80 p-5 shadow-xl flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl border border-[#e9c349] bg-black p-1 flex items-center justify-center overflow-hidden">
                        {player.photo ? (
                          <img src={player.photo} alt={player.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">👤</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase">{player.fullName}</h3>
                        <p className="text-xs text-[#e9c349]">Won Target · Awaiting Personal Terms</p>
                      </div>
                    </div>

                    <div className="my-3 p-3 rounded-2xl bg-black/60 border border-white/10 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Position:</span>
                        <span className="font-bold text-white">{player.position}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="font-bold text-amber-400">
                          {player.awaitsAdmin ? "Awaiting Admin Approval" : "Needs 3D Contract Room"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loadingId === player.id}
                      onClick={() => openNegotiations(player)}
                      className="w-full flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-black uppercase text-black shadow-lg cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                      }}
                    >
                      <span>🕶️</span>
                      <span>OPEN 3D NEGOTIATION ROOM</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · 3D CONTRACT NEGOTIATION SUITE
      </footer>
    </div>
  );
}
