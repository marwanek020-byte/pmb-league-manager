"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppPlayerList } from "./AppPlayerList";
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
    user?: any;
  } | null;
}

export function AppHomeDashboard({ initialData }: AppDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"TEAM" | "TRANSFERS" | "DUGOUT" | "EXTRAS">("TEAM");
  const [currentView, setCurrentView] = useState<"dashboard" | "players">("dashboard");
  const [squad, setSquad] = useState<PlayerDTO[]>([]);
  const [isLoadingSquad, setIsLoadingSquad] = useState(false);

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

  const latestTransfer = initialData?.latestTransfer || {
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
  }).format(latestTransfer.fee || 45000000);

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
            onClick={() => router.push("/manager/contracts")}
            className="group flex items-center gap-3 rounded-full border border-[#e9c349]/80 bg-black/80 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.3)] backdrop-blur-md cursor-pointer transition-all hover:scale-105 hover:border-[#e9c349] active:scale-95"
            title={`${club.name} Available Budget - Click for Finances`}
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
            onClick={() => {
              setActiveTab("TRANSFERS");
              router.push("/manager/transfers");
            }}
            className={`rounded-full px-6 sm:px-8 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "TRANSFERS"
                ? "text-black bg-gradient-to-r from-[#f5d475] to-[#d4af37]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            TRANSFERS
          </button>

          {/* TAB 3: DUGOUT */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("DUGOUT");
              router.push("/manager/fixtures");
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
                onClick={() => router.push("/manager/fixtures")}
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

          {/* ════ CARD 2: LATEST TRANSFER (Mercato Live News) ════ */}
          <div
            className="group relative rounded-3xl border border-[#e9c349]/40 bg-gradient-to-b from-[#141419]/90 to-[#0a0a0d]/95 p-6 sm:p-7 shadow-[0_15px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(233,195,73,0.12)] backdrop-blur-xl flex flex-col justify-between overflow-hidden min-h-[310px]"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 20%, rgba(233,195,73,0.18) 0%, transparent 60%)`,
            }}
          >
            {/* Header */}
            <div>
              <h2 className="font-montserrat text-2xl sm:text-3xl font-black uppercase tracking-wider text-[#e9c349] drop-shadow-[0_0_15px_rgba(233,195,73,0.6)]">
                LATEST TRANSFER
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                New Deal Completed · Live Mercato
              </p>
            </div>

            {/* Center Player Deal Visual & Teams */}
            <div className="my-auto flex items-center justify-between gap-4 py-4">
              
              {/* Selling Club */}
              <div className="flex flex-col items-center">
                <span
                  className="text-[10px] font-bold text-gray-400 mb-1.5 max-w-[85px] truncate text-center"
                  title={latestTransfer.fromClub?.name}
                >
                  {latestTransfer.fromClub?.name || "SELLER"}
                </span>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-[#e9c349]/50 bg-black/80 p-2 flex items-center justify-center shadow-md overflow-hidden">
                  {latestTransfer.fromClub?.logo ? (
                    <img
                      src={latestTransfer.fromClub.logo}
                      alt={latestTransfer.fromClub?.name || "Seller"}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="font-black text-lg text-[#e9c349]">
                      {latestTransfer.fromClub?.name?.slice(0, 2).toUpperCase() || "A"}
                    </span>
                  )}
                </div>
              </div>

              {/* Player Silhouette & Transfer Fee Highlight */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="relative w-16 h-16 rounded-full border-2 border-[#e9c349]/70 bg-black/90 p-1 flex items-center justify-center shadow-[0_0_30px_rgba(233,195,73,0.4)] overflow-hidden">
                  {latestTransfer.playerPhoto ? (
                    <img
                      src={latestTransfer.playerPhoto}
                      alt={latestTransfer.playerName}
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

                <span className="font-montserrat text-xs sm:text-sm font-black uppercase tracking-wider text-white mt-1.5 truncate max-w-[180px]">
                  {latestTransfer.playerName}
                </span>

                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                  TRANSFER FEE
                </span>
                <span className="font-montserrat text-base sm:text-lg font-black text-[#e9c349] drop-shadow-[0_0_10px_rgba(233,195,73,0.6)]">
                  €{formattedFee}
                </span>
              </div>

              {/* Arrow Indicator */}
              <span className="text-xl font-black text-[#e9c349] animate-pulse">
                »
              </span>

              {/* Buying Club */}
              <div className="flex flex-col items-center">
                <span
                  className="text-[10px] font-bold text-gray-400 mb-1.5 max-w-[85px] truncate text-center"
                  title={latestTransfer.toClub?.name}
                >
                  {latestTransfer.toClub?.name || "BUYER"}
                </span>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-[#e9c349] bg-black/80 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(233,195,73,0.3)] overflow-hidden">
                  {latestTransfer.toClub?.logo ? (
                    <img
                      src={latestTransfer.toClub.logo}
                      alt={latestTransfer.toClub?.name || "Buyer"}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="font-black text-lg text-[#e9c349]">
                      {latestTransfer.toClub?.name?.slice(0, 2).toUpperCase() || "B"}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* VIEW TRANSFER BUTTON */}
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => router.push("/manager/transfers")}
                className="group/btn flex items-center justify-center gap-2 rounded-full px-8 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_4px_20px_rgba(233,195,73,0.4)] transition-all hover:scale-105 hover:brightness-110 active:scale-95 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                }}
              >
                <span>VIEW TRANSFER</span>
                <span className="transition-transform group-hover/btn:translate-x-1">›</span>
              </button>
            </div>
          </div>

        </div>
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
            onClick={() => router.push("/manager/fixtures")}
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
            onClick={() => router.push("/manager/contracts")}
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
