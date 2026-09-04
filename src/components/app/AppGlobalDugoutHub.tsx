"use client";

import { ManagerSocialHub } from "@/components/social/ManagerSocialHub";

interface AppGlobalDugoutHubProps {
  userId?: string;
  username?: string;
  clubName?: string;
  clubLogo?: string | null;
  budget?: number;
  onBack: () => void;
}

export function AppGlobalDugoutHub({
  userId = "u1",
  username = "Manager",
  clubName = "FAR Rabat",
  clubLogo = null,
  budget = 0,
  onBack,
}: AppGlobalDugoutHubProps) {
  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#070709] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-montserrat select-none">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e9c349]/12 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />
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
            <span>DUGOUT</span>
          </button>

          <div>
            <h1 className="font-montserrat text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>GLOBAL DUGOUT</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">
              LEAGUE LOUNGE & MANAGER SOCIAL FEED
            </span>
          </div>
        </div>

        {/* Live Budget Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349]/80 bg-black/90 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.35)]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs">
            €
          </div>
          <span className="font-montserrat text-sm sm:text-base font-black tracking-wider text-[#e9c349]">
            {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(budget)}
          </span>
        </div>
      </header>

      {/* ─── MAIN SOCIAL HUB ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <ManagerSocialHub
          myUserId={userId}
          myUsername={username}
          myClubName={clubName}
          myClubLogo={clubLogo}
          myBudget={budget}
        />
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · GLOBAL DUGOUT LOUNGE
      </footer>
    </div>
  );
}
