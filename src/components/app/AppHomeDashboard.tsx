"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppPlayerList } from "./AppPlayerList";
import { AppCompetitionHub } from "./AppCompetitionHub";
import { AppContractsHub } from "./AppContractsHub";
import { AppTransferWindowHub } from "./AppTransferWindowHub";
import { AppBudgetHistoryHub } from "./AppBudgetHistoryHub";
import { PlayerDTO } from "@/lib/serialize-player";

interface AppDashboardProps {
  initialData?: {
    club?: {
      id?: string;
      name?: string;
      logo?: string | null;
      budget?: number;
    };
    nextMatch?: {
      id?: string;
      homeClub?: { id?: string; name?: string; logo?: string | null };
      awayClub?: { id?: string; name?: string; logo?: string | null };
      matchday?: number;
      date?: string;
      time?: string;
      stadium?: string;
    };
    latestTransfer?: {
      id?: string;
      playerName?: string;
      playerPhoto?: string | null;
      position?: string;
      fromClub?: { id?: string; name?: string; logo?: string | null };
      toClub?: { id?: string; name?: string; logo?: string | null };
      fee?: number;
    };
    latestTransfers?: Array<{
      id?: string;
      playerName?: string;
      playerPhoto?: string | null;
      position?: string;
      fromClub?: { id?: string; name?: string; logo?: string | null };
      toClub?: { id?: string; name?: string; logo?: string | null };
      fee?: number;
    }>;
    user?: any;
  } | null;
}

export function AppHomeDashboard({ initialData }: AppDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"TEAM" | "TRANSFERS" | "DUGOUT" | "EXTRAS">("TEAM");
  const [currentView, setCurrentView] = useState<"dashboard" | "players" | "competition" | "contracts" | "transferWindow" | "budgetHistory">("dashboard");
  const [squad, setSquad] = useState<PlayerDTO[]>([]);
  const [isLoadingSquad, setIsLoadingSquad] = useState(false);

  // Animated rotating transfers
  const transferList =
    initialData?.latestTransfers && initialData.latestTransfers.length > 0
      ? initialData.latestTransfers
      : initialData?.latestTransfer
      ? [initialData.latestTransfer]
      : [];

  const [transferIndex, setTransferIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-cycle through transfers one after one every 3.5s
  useEffect(() => {
    if (transferList.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setTransferIndex((prev) => (prev + 1) % transferList.length);
        setIsTransitioning(false);
      }, 300);
    }, 3600);

    return () => clearInterval(timer);
  }, [transferList.length, isPaused]);

  function changeTransfer(newIndex: number) {
    if (newIndex === transferIndex || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setTransferIndex(newIndex);
      setIsTransitioning(false);
    }, 200);
  }

  function nextTransfer() {
    if (transferList.length <= 1 || isTransitioning) return;
    changeTransfer((transferIndex + 1) % transferList.length);
  }

  function prevTransfer() {
    if (transferList.length <= 1 || isTransitioning) return;
    changeTransfer((transferIndex - 1 + transferList.length) % transferList.length);
  }

  function openPlayers() {
    setIsLoadingSquad(true);
    fetch("/api/manager/players/list")
      .then((r) => r.json())
      .then((data) => {
        if (data?.players) {
          setSquad(data.players);
        }
        setIsLoadingSquad(false);
        setCurrentView("players");
      })
      .catch((err) => {
        console.error(err);
        setIsLoadingSquad(false);
        setCurrentView("players");
      });
  }

  const club = initialData?.club || {
    name: "FAR RABAT",
    budget: 9356790,
  };

  const nextMatch = initialData?.nextMatch || {
    homeClub: { name: "PMB FC" },
    awayClub: { name: "RABAT UNITED" },
    date: "25 MAY 2027",
    time: "20:00",
    stadium: "GRAND STADIUM",
  };

  const currentTransfer = transferList[transferIndex] || initialData?.latestTransfer || {
    playerName: "CRYSENCIO SUMMERVILLE",
    fromClub: { name: "TEAM A" },
    toClub: { name: "TEAM B" },
    fee: 45000000,
  };

  const formattedBudget = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(club.budget || 9356790);

  const formattedFee = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(currentTransfer.fee || 0);

  if (currentView === "players") {
    return (
      <AppPlayerList
        initialSquad={squad}
        clubName={club.name || "FAR RABAT"}
        clubId={club.id || "c1"}
        clubBudget={club.budget || 9356790}
        onBack={() => setCurrentView("dashboard")}
      />
    );
  }

  if (currentView === "competition") {
    return <AppCompetitionHub onBack={() => setCurrentView("dashboard")} />;
  }

  if (currentView === "contracts") {
    return <AppContractsHub onBack={() => setCurrentView("dashboard")} />;
  }

  if (currentView === "transferWindow") {
    return <AppTransferWindowHub onBack={() => setCurrentView("dashboard")} />;
  }

  if (currentView === "budgetHistory") {
    return <AppBudgetHistoryHub onBack={() => setCurrentView("dashboard")} />;
  }

  return (
    <div
      className="fixed inset-0 w-full h-[100dvh] bg-[#070709] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-montserrat select-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(233,195,73,0.12) 0%, transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(233,195,73,0.12) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, rgba(12,12,16,0.9) 0%, #060608 100%)
        `,
      }}
    >
      {/* ─── AMBIENT GOLD DIAGONAL LIGHT BEAMS (Matches reference image) ─── */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-[#e9c349]/20 via-transparent to-transparent pointer-events-none blur-3xl" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-tl from-[#e9c349]/20 via-transparent to-transparent pointer-events-none blur-3xl" />
      <div className="absolute -top-10 -left-10 w-96 h-[2px] bg-gradient-to-r from-transparent via-[#e9c349]/50 to-transparent rotate-45 pointer-events-none shadow-[0_0_20px_#e9c349]" />
      <div className="absolute -bottom-10 -right-10 w-96 h-[2px] bg-gradient-to-r from-transparent via-[#e9c349]/50 to-transparent rotate-45 pointer-events-none shadow-[0_0_20px_#e9c349]" />

      {/* ─── TOP BAR (BUDGET + NAVIGATION TABS) ─── */}
      <header className="relative z-20 w-full flex flex-wrap items-center justify-between gap-4 px-6 sm:px-10 pt-6 pb-3">
        
        {/* CLUB BADGE + BUDGET PILL BUTTON (Top Left) */}
        <div className="flex items-center gap-2.5">
          {club.logo && (
            <div
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#e9c349]/80 bg-black/80 p-1 shadow-[0_0_15px_rgba(233,195,73,0.3)] flex items-center justify-center overflow-hidden"
              title={club.name}
            >
              <img
                src={club.logo}
                alt={club.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div
            onClick={() => setCurrentView("budgetHistory")}
            className="group flex items-center gap-3 rounded-full border border-[#e9c349]/80 bg-black/80 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.3)] backdrop-blur-md cursor-pointer transition-all hover:scale-105 hover:border-[#e9c349] active:scale-95"
            title={`${club.name} Available Budget - Click for Budget History`}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#e9c349] bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs shadow-sm">
              €
            </div>
            <span className="font-montserrat text-sm sm:text-base font-black tracking-wider text-white">
              {formattedBudget}
            </span>
          </div>
        </div>

        {/* TOP SEGMENTED NAVIGATION TABS */}
        <nav className="flex items-center rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-md shadow-2xl">
          {/* TAB 1: TEAM */}
          <button
            type="button"
            onClick={() => setActiveTab("TEAM")}
            className={`relative rounded-full px-6 sm:px-8 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "TEAM"
                ? "text-black shadow-[0_2px_15px_rgba(233,195,73,0.5)]"
                : "text-gray-400 hover:text-white"
            }`}
            style={
              activeTab === "TEAM"
                ? {
                    background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                  }
                : {}
            }
          >
            <span>TEAM</span>
            {activeTab === "TEAM" && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#f5d475] shadow-[0_0_8px_#f5d475]" />
            )}
          </button>

          {/* TAB 2: TRANSFERS */}
          <button
            type="button"
            onClick={() => setActiveTab("TRANSFERS")}
            className={`relative rounded-full px-6 sm:px-8 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "TRANSFERS"
                ? "text-black shadow-[0_2px_15px_rgba(233,195,73,0.5)]"
                : "text-gray-400 hover:text-white"
            }`}
            style={
              activeTab === "TRANSFERS"
                ? {
                    background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                  }
                : {}
            }
          >
            <span>TRANSFERS</span>
            {activeTab === "TRANSFERS" && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#f5d475] shadow-[0_0_8px_#f5d475]" />
            )}
          </button>

          {/* TAB 3: DUGOUT */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("DUGOUT");
              setCurrentView("competition");
            }}
            className={`rounded-full px-6 sm:px-8 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "DUGOUT"
                ? "text-black bg-gradient-to-r from-[#f5d475] to-[#d4af37]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            DUGOUT
          </button>

          {/* TAB 4: EXTRAS */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("EXTRAS");
              router.push("/manager/dashboard");
            }}
            className={`rounded-full px-6 sm:px-8 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "EXTRAS"
                ? "text-black bg-gradient-to-r from-[#f5d475] to-[#d4af37]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            EXTRAS
          </button>
        </nav>
      </header>

      {/* ─── MAIN TWO HERO CARDS (MATCHDAY & LATEST TRANSFER) ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 my-auto">
        {activeTab === "TRANSFERS" ? (
          /* ════ 3 TRANSFER ACTION CARDS (Matches user's reference mockup) ════ */
          <div className="rounded-3xl border border-[#e9c349]/35 bg-gradient-to-b from-[#141419]/90 to-[#0a0a0d]/95 p-6 sm:p-8 shadow-[0_15px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(233,195,73,0.12)] backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* CARD 1: MAKE TRANSFER */}
              <div
                onClick={() => setCurrentView("transferWindow")}
                className="group relative rounded-2xl border border-[#e9c349]/40 bg-gradient-to-b from-[#101014] to-[#070709] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 hover:border-[#e9c349] hover:shadow-[0_0_35px_rgba(233,195,73,0.3)] active:scale-95 min-h-[290px]"
              >
                {/* Gold exchange arrows with star in middle */}
                <div className="mb-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 120 80" className="w-28 h-20 drop-shadow-[0_0_12px_rgba(233,195,73,0.4)]">
                    <defs>
                      <linearGradient id="goldGradArrows" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f5d475" />
                        <stop offset="50%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#b8860b" />
                      </linearGradient>
                    </defs>
                    {/* Top Right Arrow */}
                    <path d="M20 22h55v-9l25 15-25 15v-9H20z" fill="url(#goldGradArrows)" />
                    {/* Bottom Left Arrow */}
                    <path d="M100 52H45v9L20 46l25-15v9h55z" fill="url(#goldGradArrows)" />
                    {/* Center Star */}
                    <polygon
                      points="60,25 63,33 72,33 65,39 67,47 60,42 53,47 55,39 48,33 57,33"
                      fill="#fff"
                      stroke="#f5d475"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
                <h3 className="font-montserrat text-xl sm:text-2xl font-black uppercase tracking-wider text-[#e9c349] drop-shadow-[0_0_12px_rgba(233,195,73,0.6)]">
                  MAKE TRANSFER
                </h3>
              </div>

              {/* CARD 2: LIVE AUCTIONS */}
              <div
                className="group relative rounded-2xl border border-[#e9c349]/40 bg-gradient-to-b from-[#101014] to-[#070709] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 hover:border-[#e9c349] hover:shadow-[0_0_35px_rgba(233,195,73,0.3)] active:scale-95 min-h-[290px]"
              >
                {/* Gold Gavel striking sound block */}
                <div className="mb-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 120 90" className="w-28 h-20 drop-shadow-[0_0_12px_rgba(233,195,73,0.4)]">
                    <defs>
                      <linearGradient id="goldGradGavel" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f5d475" />
                        <stop offset="50%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#b8860b" />
                      </linearGradient>
                    </defs>
                    {/* Gavel Hammer Head and Handle angled */}
                    <g transform="rotate(-32 60 40)">
                      <rect x="48" y="10" width="24" height="38" rx="4" fill="url(#goldGradGavel)" stroke="#fff" strokeWidth="0.8" />
                      <rect x="57" y="44" width="6" height="42" rx="3" fill="url(#goldGradGavel)" />
                    </g>
                    {/* Sound block base */}
                    <rect x="34" y="70" width="52" height="7" rx="3" fill="url(#goldGradGavel)" />
                    <rect x="26" y="77" width="68" height="7" rx="3" fill="url(#goldGradGavel)" />
                  </svg>
                </div>
                <h3 className="font-montserrat text-xl sm:text-2xl font-black uppercase tracking-wider text-[#e9c349] drop-shadow-[0_0_12px_rgba(233,195,73,0.6)]">
                  LIVE AUCTIONS
                </h3>
              </div>

              {/* CARD 3: FREE AGENT TRANSFER */}
              <div
                className="group relative rounded-2xl border border-[#e9c349]/40 bg-gradient-to-b from-[#101014] to-[#070709] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 hover:border-[#e9c349] hover:shadow-[0_0_35px_rgba(233,195,73,0.3)] active:scale-95 min-h-[290px]"
              >
                {/* Gold Handshake with FREE badge */}
                <div className="mb-8 flex flex-col items-center justify-center group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 120 70" className="w-28 h-16 drop-shadow-[0_0_12px_rgba(233,195,73,0.4)]">
                    <defs>
                      <linearGradient id="goldGradHands" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f5d475" />
                        <stop offset="50%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#b8860b" />
                      </linearGradient>
                    </defs>
                    {/* Left Sleeve */}
                    <path d="M15 18l18 16-6 7-18-16z" fill="url(#goldGradHands)" />
                    {/* Right Sleeve */}
                    <path d="M105 18l-18 16 6 7 18-16z" fill="url(#goldGradHands)" />
                    {/* Left Hand / Palm */}
                    <path d="M30 32l16 16c4 4 10 4 14 0l6-6c4-4 4-10 0-14l-14-14c-4-4-10-4-14 0z" fill="url(#goldGradHands)" stroke="#fff" strokeWidth="0.5" />
                    {/* Right Hand Clasping */}
                    <path d="M60 52c-3 0-6-1-8-3l-10-10 5-5 10 10c2 2 4 2 6 0l22-22 5 5-22 22c-2 2-5 3-8 3z" fill="url(#goldGradHands)" />
                    {/* Fingers Detail */}
                    <rect x="50" y="44" width="8" height="5" rx="2" fill="#fff" opacity="0.6" />
                    <rect x="58" y="48" width="8" height="5" rx="2" fill="#fff" opacity="0.6" />
                    <rect x="66" y="52" width="8" height="5" rx="2" fill="#fff" opacity="0.6" />
                  </svg>
                  <span className="mt-2 px-3 py-0.5 rounded-md border border-[#e9c349] bg-black/90 font-montserrat text-xs font-black tracking-widest text-[#e9c349] shadow-[0_0_10px_rgba(233,195,73,0.4)]">
                    FREE
                  </span>
                </div>
                <h3 className="font-montserrat text-xl sm:text-2xl font-black uppercase tracking-wider text-[#e9c349] drop-shadow-[0_0_12px_rgba(233,195,73,0.6)]">
                  FREE AGENT TRANSFER
                </h3>
              </div>

            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          
          {/* ════ CARD 1: MATCHDAY (Next Fixture) ════ */}
          <div
            className="group relative rounded-3xl border border-[#e9c349]/40 bg-gradient-to-b from-[#141419]/90 to-[#0a0a0d]/95 p-6 sm:p-7 shadow-[0_15px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(233,195,73,0.12)] backdrop-blur-xl flex flex-col justify-between overflow-hidden min-h-[310px]"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 20%, rgba(233,195,73,0.18) 0%, transparent 60%)`,
            }}
          >
            {/* Ambient Stadium Lighting Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-[#e9c349]/20 to-transparent blur-2xl pointer-events-none" />

            {/* Header */}
            <div>
              <h2 className="font-montserrat text-2xl sm:text-3xl font-black uppercase tracking-wider text-[#e9c349] drop-shadow-[0_0_15px_rgba(233,195,73,0.6)]">
                MATCHDAY
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                Next Fixture
              </p>
            </div>

            {/* Matchup Teams Display */}
            <div className="my-auto flex items-center justify-between gap-4 py-6">
              
              {/* Team 1 (Home) */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#e9c349] bg-black/90 p-2 shadow-[0_0_25px_rgba(233,195,73,0.4)] flex items-center justify-center overflow-hidden">
                  {nextMatch.homeClub?.logo ? (
                    <img
                      src={nextMatch.homeClub.logo}
                      alt={nextMatch.homeClub?.name || "Home Team"}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                  ) : (
                    <img
                      src="/branding/pmb-official-logo.png"
                      alt={nextMatch.homeClub?.name || "PMB FC"}
                      className="w-full h-full object-contain rounded-full"
                    />
                  )}
                </div>
                <span
                  className="font-montserrat text-xs sm:text-sm font-black uppercase tracking-wider text-white mt-2.5 max-w-[130px] truncate"
                  title={nextMatch.homeClub?.name}
                >
                  {nextMatch.homeClub?.name || "PMB FC"}
                </span>
              </div>

              {/* VS Crest */}
              <div className="flex flex-col items-center">
                <span className="font-montserrat text-2xl sm:text-3xl font-black italic tracking-widest text-[#e9c349] drop-shadow-[0_0_20px_rgba(233,195,73,0.9)]">
                  VS
                </span>
                <span className="w-8 h-[2px] bg-[#e9c349]/60 mt-1" />
              </div>

              {/* Team 2 (Away) */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-white/40 bg-black/90 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
                  {nextMatch.awayClub?.logo ? (
                    <img
                      src={nextMatch.awayClub.logo}
                      alt={nextMatch.awayClub?.name || "Away Team"}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-2xl">🛡️</span>
                      <span className="text-[9px] font-black text-white tracking-widest mt-0.5">
                        {nextMatch.awayClub?.name?.slice(0, 5) || "AWAY"}
                      </span>
                    </div>
                  )}
                </div>
                <span
                  className="font-montserrat text-xs sm:text-sm font-black uppercase tracking-wider text-white mt-2.5 max-w-[130px] truncate"
                  title={nextMatch.awayClub?.name}
                >
                  {nextMatch.awayClub?.name || "RABAT UNITED"}
                </span>
              </div>

            </div>

            {/* Fixture Metadata Row */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono tracking-wider text-gray-300 border-t border-white/10 pt-3">
              <span>📅 {nextMatch.date || "25 MAY 2027"}</span>
              <span className="text-gray-500">|</span>
              <span>🕒 {nextMatch.time || "20:00"}</span>
              <span className="text-gray-500">|</span>
              <span>🏟️ {nextMatch.stadium || "GRAND STADIUM"}</span>
            </div>

            {/* VIEW MATCH BUTTON */}
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => setCurrentView("competition")}
                className="group/btn flex items-center justify-center gap-2 rounded-full px-8 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_4px_20px_rgba(233,195,73,0.4)] transition-all hover:scale-105 hover:brightness-110 active:scale-95 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                }}
              >
                <span>VIEW MATCH</span>
                <span className="transition-transform group-hover/btn:translate-x-1">›</span>
              </button>
            </div>
          </div>

          {/* ════ CARD 2: ANIMATED LATEST TRANSFERS TICKER (One after one) ════ */}
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="group relative rounded-3xl border border-[#e9c349]/40 bg-gradient-to-b from-[#141419]/90 to-[#0a0a0d]/95 p-6 sm:p-7 shadow-[0_15px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(233,195,73,0.12)] backdrop-blur-xl flex flex-col justify-between overflow-hidden min-h-[310px]"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 20%, rgba(233,195,73,0.18) 0%, transparent 60%)`,
            }}
          >
            {/* Header with Live Mercato Ticker indicator */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-montserrat text-2xl sm:text-3xl font-black uppercase tracking-wider text-[#e9c349] drop-shadow-[0_0_15px_rgba(233,195,73,0.6)]">
                    LATEST TRANSFERS
                  </h2>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-0.5 flex items-center gap-2">
                  <span>Mercato Ticker</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-[#e9c349] font-mono">
                    Deal {transferIndex + 1} of {transferList.length || 1}
                  </span>
                </p>
              </div>

              {/* Manual Nav Arrows (Left / Right) */}
              {transferList.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevTransfer}
                    className="w-7 h-7 rounded-full border border-white/20 bg-black/60 flex items-center justify-center text-sm font-bold text-gray-300 hover:text-[#e9c349] hover:border-[#e9c349] transition-all active:scale-90 cursor-pointer"
                    title="Previous Transfer"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={nextTransfer}
                    className="w-7 h-7 rounded-full border border-white/20 bg-black/60 flex items-center justify-center text-sm font-bold text-gray-300 hover:text-[#e9c349] hover:border-[#e9c349] transition-all active:scale-90 cursor-pointer"
                    title="Next Transfer"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {/* Animated Player Deal Visual & Teams */}
            <div
              className={`my-auto flex items-center justify-between gap-4 py-3 transition-all duration-300 transform ${
                isTransitioning
                  ? "opacity-0 scale-95 translate-y-1"
                  : "opacity-100 scale-100 translate-y-0"
              }`}
            >
              {/* Selling Club */}
              <div className="flex flex-col items-center flex-1 max-w-[100px]">
                <span
                  className="text-[10px] font-bold text-gray-400 mb-1.5 max-w-[90px] truncate text-center"
                  title={currentTransfer.fromClub?.name}
                >
                  {currentTransfer.fromClub?.name || "SELLER"}
                </span>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-[#e9c349]/50 bg-black/80 p-2 flex items-center justify-center shadow-md overflow-hidden">
                  {currentTransfer.fromClub?.logo ? (
                    <img
                      src={currentTransfer.fromClub.logo}
                      alt={currentTransfer.fromClub?.name || "Seller"}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="font-black text-lg text-[#e9c349]">
                      {currentTransfer.fromClub?.name?.slice(0, 2).toUpperCase() || "A"}
                    </span>
                  )}
                </div>
              </div>

              {/* Player Silhouette & Transfer Fee Highlight */}
              <div className="flex-1 flex flex-col items-center text-center px-2">
                <div className="relative w-16 h-16 rounded-full border-2 border-[#e9c349]/70 bg-black/90 p-1 flex items-center justify-center shadow-[0_0_30px_rgba(233,195,73,0.4)] overflow-hidden">
                  {currentTransfer.playerPhoto ? (
                    <img
                      src={currentTransfer.playerPhoto}
                      alt={currentTransfer.playerName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-b from-[#1a1c23] to-[#0a0a0d] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#e9c349]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                </div>

                <span
                  className="font-montserrat text-xs sm:text-sm font-black uppercase tracking-wider text-white mt-1.5 truncate max-w-[170px]"
                  title={currentTransfer.playerName}
                >
                  {currentTransfer.playerName}
                </span>

                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                  TRANSFER FEE
                </span>
                <span className="font-montserrat text-sm sm:text-base font-black text-[#e9c349] drop-shadow-[0_0_10px_rgba(233,195,73,0.6)]">
                  {Number(currentTransfer.fee) > 0 ? `€${formattedFee}` : "FREE TRANSFER"}
                </span>
              </div>

              {/* Animated Direction Indicator */}
              <div className="flex flex-col items-center">
                <span className="text-xl font-black text-[#e9c349] animate-pulse">
                  »
                </span>
              </div>

              {/* Buying Club */}
              <div className="flex flex-col items-center flex-1 max-w-[100px]">
                <span
                  className="text-[10px] font-bold text-gray-400 mb-1.5 max-w-[90px] truncate text-center"
                  title={currentTransfer.toClub?.name}
                >
                  {currentTransfer.toClub?.name || "BUYER"}
                </span>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-[#e9c349] bg-black/80 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(233,195,73,0.3)] overflow-hidden">
                  {currentTransfer.toClub?.logo ? (
                    <img
                      src={currentTransfer.toClub.logo}
                      alt={currentTransfer.toClub?.name || "Buyer"}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="font-black text-lg text-[#e9c349]">
                      {currentTransfer.toClub?.name?.slice(0, 2).toUpperCase() || "B"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom: Carousel Dots */}
            {transferList.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-2 pb-1">
                {transferList.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => changeTransfer(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === transferIndex
                        ? "w-6 bg-[#e9c349] shadow-[0_0_8px_#e9c349]"
                        : "w-1.5 bg-white/30 hover:bg-white/60"
                    }`}
                    title={`Go to deal ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>

      {/* ─── BOTTOM ROW: 3 ACTION CARDS (MY PLAYERS, COMPETITION, CONTRACTS) ─── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 pb-6 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* ACTION 1: MY PLAYERS */}
          <div
            onClick={openPlayers}
            className="group flex items-center justify-between rounded-2xl border border-white/15 bg-black/75 p-4 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] hover:border-[#e9c349]/70 hover:shadow-[0_0_25px_rgba(233,195,73,0.2)] active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e9c349]/40 bg-[#121217] text-xl shadow-sm group-hover:scale-110 transition-transform">
                👥
              </div>
              <div>
                <h3 className="font-montserrat text-sm font-black uppercase tracking-wider text-white group-hover:text-[#e9c349] transition-colors">
                  MY PLAYERS
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Manage and develop your players
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-400 group-hover:text-[#e9c349] group-hover:translate-x-1 transition-all">
              ›
            </span>
          </div>

          {/* ACTION 2: COMPETITION */}
          <div
            onClick={() => setCurrentView("competition")}
            className="group flex items-center justify-between rounded-2xl border border-white/15 bg-black/75 p-4 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] hover:border-[#e9c349]/70 hover:shadow-[0_0_25px_rgba(233,195,73,0.2)] active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e9c349]/40 bg-[#121217] text-xl shadow-sm group-hover:scale-110 transition-transform">
                🏆
              </div>
              <div>
                <h3 className="font-montserrat text-sm font-black uppercase tracking-wider text-white group-hover:text-[#e9c349] transition-colors">
                  COMPETITION
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Participate in events and win rewards
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-400 group-hover:text-[#e9c349] group-hover:translate-x-1 transition-all">
              ›
            </span>
          </div>

          {/* ACTION 3: CONTRACTS */}
          <div
            onClick={() => setCurrentView("contracts")}
            className="group flex items-center justify-between rounded-2xl border border-white/15 bg-black/75 p-4 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] hover:border-[#e9c349]/70 hover:shadow-[0_0_25px_rgba(233,195,73,0.2)] active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e9c349]/40 bg-[#121217] text-xl shadow-sm group-hover:scale-110 transition-transform">
                📄
              </div>
              <div>
                <h3 className="font-montserrat text-sm font-black uppercase tracking-wider text-white group-hover:text-[#e9c349] transition-colors">
                  CONTRACTS
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Manage player contracts
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-400 group-hover:text-[#e9c349] group-hover:translate-x-1 transition-all">
              ›
            </span>
          </div>

        </div>
      </footer>
    </div>
  );
}
