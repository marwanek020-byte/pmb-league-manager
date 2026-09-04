"use client";

import { useState, useEffect, useCallback } from "react";
import { BotolaContractRoom3D } from "@/components/manager/contracts/BotolaContractRoom3D";
import type { ContractDemands } from "@/lib/services/botola-contract-service";

interface FreeAgentPlayer {
  id: string;
  fullName: string;
  position: string;
  overallRating: number | null;
  photo: string | null;
  nationality: string;
  realClub: string;
  marketValue: number | string | null;
  expiredFromClubName?: string | null;
  isFreeAgentMarket: boolean;
  hasFailedAttempt?: boolean;
}

interface ClubInfo {
  id: string;
  name: string;
  logo: string | null;
  budget: number;
  foreignPlayerCount: number;
  maxForeignPlayers: number;
}

interface AppFreeAgentHubProps {
  onBack: () => void;
}

const POSITION_FILTERS = ["ALL", "FWD", "MID", "DEF", "GK"] as const;

export function AppFreeAgentHub({ onBack }: AppFreeAgentHubProps) {
  const [players, setPlayers] = useState<FreeAgentPlayer[]>([]);
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<(typeof POSITION_FILTERS)[number]>("ALL");

  // 3D Contract Negotiation Room states
  const [activePlayer, setActivePlayer] = useState<any | null>(null);
  const [negotiationData, setNegotiationData] = useState<{
    demands: ContractDemands;
    clubBudget: number;
  } | null>(null);
  const [loadingNegotiationId, setLoadingNegotiationId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchFreeAgents = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q.trim() ? `/api/app/free-agents?search=${encodeURIComponent(q.trim())}` : "/api/app/free-agents";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
        if (data.club) setClubInfo(data.club);
      }
    } catch (err) {
      console.error("Error fetching free agents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFreeAgents();
  }, [fetchFreeAgents]);

  function isMoroccan(nat?: string | null) {
    if (!nat) return false;
    const n = nat.toLowerCase().trim();
    return ["moroc", "maroc", "ma", "مغرب"].some((m) => n.includes(m));
  }

  function fmtMoney(n: number | string | null | undefined) {
    return "€ " + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n || 0));
  }

  // Open the 3D negotiation room directly with the Free Agent
  async function startNegotiation(player: FreeAgentPlayer) {
    if (player.hasFailedAttempt) {
      alert("⛔ Your club has already exhausted its single negotiation attempt with this player. The agent refuses to meet again.");
      return;
    }

    if (clubInfo && !isMoroccan(player.nationality) && clubInfo.foreignPlayerCount >= clubInfo.maxForeignPlayers) {
      alert(`⛔ You cannot sign this foreign player because your squad reached the foreign players limit (${clubInfo.maxForeignPlayers} players).`);
      return;
    }

    setLoadingNegotiationId(player.id);
    try {
      const res = await fetch(`/api/app/free-agents/${player.id}/contract`);
      const data = await res.json();
      if (!res.ok || !data.demands) {
        alert(data.error || "Unable to open contract negotiation room.");
        return;
      }
      setNegotiationData({ demands: data.demands, clubBudget: data.clubBudget });
      setActivePlayer({ ...(data.player || player), isFreeAgentMarket: true });
    } catch (err) {
      console.error("Negotiation error:", err);
      alert("Error opening contract negotiation room.");
    } finally {
      setLoadingNegotiationId(null);
    }
  }

  // Filtered Players
  const filteredPlayers = players.filter((p) => {
    if (posFilter === "FWD" && !["CF", "ST", "LWF", "RWF", "LW", "RW"].includes(p.position)) return false;
    if (posFilter === "MID" && !["CMF", "AMF", "DMF", "CM", "CAM", "CDM"].includes(p.position)) return false;
    if (posFilter === "DEF" && !["CB", "LB", "RB", "LWB", "RWB"].includes(p.position)) return false;
    if (posFilter === "GK" && p.position !== "GK") return false;
    return true;
  });

  // If 3D Contract Negotiation Room is open
  if (activePlayer && negotiationData) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070709]">
        <BotolaContractRoom3D
          player={activePlayer}
          clubBudget={negotiationData.clubBudget}
          demands={negotiationData.demands}
          onClose={() => {
            setActivePlayer(null);
            setNegotiationData(null);
            fetchFreeAgents();
          }}
          onSigned={() => {
            setSuccessToast(`🎉 ${activePlayer.fullName} has officially signed for ${clubInfo?.name || "your club"}!`);
            setActivePlayer(null);
            setNegotiationData(null);
            fetchFreeAgents();
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#070709] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-montserrat select-none">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e9c349]/12 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* ─── APP HEADER ─── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:scale-105 hover:border-[#e9c349] hover:text-[#e9c349] active:scale-95 cursor-pointer"
          >
            <span>‹</span>
            <span>TRANSFERS</span>
          </button>

          <div>
            <h1 className="font-montserrat text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>FREE AGENT MARKET</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase">
                0 € TRANSFER FEE
              </span>
            </h1>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">
              DIRECT CONTRACT SIGNINGS
            </span>
          </div>
        </div>

        {/* Live Budget Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349]/80 bg-black/90 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.35)]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs">
            €
          </div>
          <span className="font-montserrat text-sm sm:text-base font-black tracking-wider text-[#e9c349]">
            {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(clubInfo?.budget || 0)}
          </span>
        </div>
      </header>

      {/* ─── TOAST NOTIFICATION ─── */}
      {successToast && (
        <div className="relative z-30 max-w-xl mx-auto px-6 mt-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-xs font-black text-emerald-300 flex items-center justify-between shadow-2xl">
            <span>{successToast}</span>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── TOP NOTICE CARDS ─── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-4 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Rule 1: One-Chance Rule */}
          <div className="rounded-2xl border border-[#e9c349]/35 bg-gradient-to-r from-[#141419]/90 to-[#0a0a0d]/95 p-3.5 flex items-center gap-3 backdrop-blur-md">
            <span className="text-2xl">⚡</span>
            <div>
              <h4 className="text-xs font-black text-[#e9c349] uppercase tracking-wider">
                ONE-CHANCE NEGOTIATION RULE
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Each club gets exactly 1 negotiation chance with any given free agent. If talks collapse, the agent will refuse any future offers.
              </p>
            </div>
          </div>

          {/* Rule 2: Foreign Players Quota */}
          <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-[#141419]/90 to-[#0a0a0d]/95 p-3.5 flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  FOREIGN PLAYERS QUOTA
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Botola Pro regulations allow a maximum of {clubInfo?.maxForeignPlayers || 5} non-Moroccan registered players.
                </p>
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-mono font-black shrink-0 ${
              (clubInfo?.foreignPlayerCount || 0) >= (clubInfo?.maxForeignPlayers || 5)
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            }`}>
              {clubInfo?.foreignPlayerCount || 0} / {clubInfo?.maxForeignPlayers || 5}
            </span>
          </div>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH ROW ─── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Position Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full sm:w-auto">
          {POSITION_FILTERS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setPosFilter(pos)}
              className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                posFilter === pos
                  ? "bg-gradient-to-r from-[#f5d475] to-[#d4af37] text-black shadow-[0_0_12px_rgba(233,195,73,0.4)]"
                  : "bg-black/60 border border-white/15 text-gray-400 hover:text-white"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search free agents..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchFreeAgents(e.target.value);
            }}
            className="w-full rounded-full border border-white/20 bg-black/80 pl-9 pr-4 py-2 text-xs text-white placeholder:text-gray-500 focus:border-[#e9c349] focus:outline-none"
          />
        </div>
      </div>

      {/* ─── PLAYERS GRID ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-4">
        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <div className="w-9 h-9 border-2 border-[#e9c349] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-widest">Scanning Free Agent Market...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/60 p-16 text-center">
            <span className="text-4xl">🤝</span>
            <h3 className="text-base font-black text-white mt-3 uppercase">No Free Agents Available</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              No players currently match the selected criteria. Free agents enter the market when contracts expire or are released from admin custody.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlayers.map((player) => {
              const isForeign = !isMoroccan(player.nationality);
              const isQuotaFull = isForeign && (clubInfo?.foreignPlayerCount || 0) >= (clubInfo?.maxForeignPlayers || 5);
              const cannotNegotiate = player.hasFailedAttempt || isQuotaFull;

              return (
                <div
                  key={player.id}
                  className={`relative rounded-3xl border p-5 backdrop-blur-xl flex flex-col justify-between transition-all hover:scale-[1.02] shadow-xl ${
                    player.hasFailedAttempt
                      ? "border-red-500/30 bg-red-950/10 opacity-70"
                      : "border-[#e9c349]/40 bg-gradient-to-b from-[#141419]/90 to-[#09090c]/95 hover:border-[#e9c349] hover:shadow-[0_0_30px_rgba(233,195,73,0.2)]"
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider">
                      0 € FREE AGENT
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#e9c349]">{player.overallRating || "★"}</span>
                      <span className="text-[10px] font-black uppercase text-white/80 bg-white/10 px-1.5 py-0.5 rounded">
                        {player.position}
                      </span>
                    </div>
                  </div>

                  {/* Player Image & Name */}
                  <div className="my-4 flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full border-2 border-[#e9c349]/60 bg-black overflow-hidden shrink-0 shadow-[0_0_15px_rgba(233,195,73,0.3)]">
                      {player.photo ? (
                        <img src={player.photo} alt={player.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-base text-[#e9c349]">
                          {player.overallRating || "★"}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-montserrat text-sm sm:text-base font-black uppercase text-white truncate" title={player.fullName}>
                        {player.fullName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <span>{player.nationality}</span>
                        {isForeign && (
                          <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                            FOREIGN
                          </span>
                        )}
                      </p>
                      {player.expiredFromClubName && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Ex: <span className="text-gray-300 font-semibold">{player.expiredFromClubName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Snapshot */}
                  <div className="py-2.5 px-3 rounded-2xl bg-black/60 border border-white/5 flex items-center justify-between text-xs my-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Market Value</span>
                    <span className="font-mono font-black text-[#e9c349]">
                      {fmtMoney(player.marketValue)}
                    </span>
                  </div>

                  {/* Negotiation Trigger Button */}
                  <div className="mt-2 pt-2 border-t border-white/10">
                    {player.hasFailedAttempt ? (
                      <div className="w-full py-2.5 rounded-full bg-red-500/15 border border-red-500/40 text-center text-[10px] font-black uppercase tracking-wider text-red-400">
                        ⛔ CHANCE EXHAUSTED
                      </div>
                    ) : isQuotaFull ? (
                      <div className="w-full py-2.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-center text-[10px] font-black uppercase tracking-wider text-amber-400">
                        ⚠️ FOREIGN QUOTA FULL
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={loadingNegotiationId === player.id}
                        onClick={() => startNegotiation(player)}
                        className="w-full rounded-full py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
                        style={{
                          background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                        }}
                      >
                        {loadingNegotiationId === player.id ? "PREPARING ROOM..." : "NEGOTIATE CONTRACT →"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · BOTOLA PRO OFFICIAL FREE AGENT RECRUITMENT
      </footer>
    </div>
  );
}
