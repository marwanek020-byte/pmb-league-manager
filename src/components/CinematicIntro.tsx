"use client";

import React, { useEffect, useState, useRef } from "react";

interface CinematicIntroProps {
  onComplete?: () => void;
}

type IntroPhase = "pmb" | "black" | "studio" | "fadeout" | "done";

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>("pmb");
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    // 1. Stage 1: PMB Logo Show (0 - 5000ms = exactly 5s)
    // 2. Stage 2: Pitch Black Screen Suspense (5000ms - 8000ms = exactly 3s)
    // 3. Stage 3: SAMA STUDIO PRESENTS (8000ms - 12200ms = 4.2s)
    // 4. Stage 4: Cinematic Fadeout (12200ms - 12800ms = 600ms)
    // 5. Stage 5: Done (Unmount & Reveal Landing Page)

    const t1 = setTimeout(() => {
      setPhase("black");
    }, 5000);

    const t2 = setTimeout(() => {
      setPhase("studio");
    }, 8000);

    const t3 = setTimeout(() => {
      setPhase("fadeout");
    }, 12200);

    const t4 = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 12800);

    timersRef.current = [t1, t2, t3, t4];

    return () => clearAllTimers();
  }, [onComplete]);

  if (phase === "done") {
    return null;
  }

  return (
    <div
      id="pmb-cinematic-intro"
      className={`fixed inset-0 z-[99999] flex items-center justify-center select-none overflow-hidden transition-opacity duration-700 bg-black ${
        phase === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundColor: "#000000",
      }}
    >

      {/* ─── MAIN CENTER ANIMATION VIEWPORT ─── */}
      <div className="relative w-full max-w-4xl h-full flex flex-col justify-between items-center px-6 py-8 z-10">
        
        {/* Top Header Badge */}
        <div className="w-full flex justify-between items-center text-[10px] sm:text-xs font-mono tracking-[0.25em] text-zinc-600 uppercase">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e9c349]" />
            PMB LEAGUE MANAGER
          </span>
          <span className="text-zinc-600 font-bold">SEASON 2026/27</span>
        </div>

        {/* ─── CENTER STAGE ─── */}
        <div className="relative w-full flex flex-col items-center justify-center my-auto min-h-[380px]">
          
          {/* ════ PHASE 1: PMB OFFICIAL LOGO SHOW (5 SECONDS) ════ */}
          {phase === "pmb" && (
            <div className="flex flex-col items-center text-center animate-pmb-cinematic px-4">
              
              {/* Official Gold Crown Lion Emblem */}
              <div className="relative mb-5">
                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full border-2 border-[#e9c349]/80 bg-black p-1 shadow-[0_0_60px_rgba(233,195,73,0.35)] relative overflow-hidden flex items-center justify-center">
                  <img
                    src="/branding/pmb-official-logo.png"
                    alt="PMB Official Logo - PES Moroccan Bourgeois"
                    className="w-full h-full object-cover rounded-full"
                  />
                  {/* Subtle inner gold sheen */}
                  <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
                </div>
              </div>

              {/* Tag */}
              <span className="font-jetbrains text-[10px] sm:text-xs uppercase tracking-[0.35em] text-[#e9c349] mb-1.5 font-bold drop-shadow-[0_0_12px_rgba(233,195,73,0.6)]">
                THE HOME OF MOROCCAN eFOOTBALL
              </span>

              {/* Main Title: PES MOROCCAN BOURGEOIS */}
              <h1 className="font-montserrat text-3xl sm:text-5xl md:text-6xl font-extrabold uppercase tracking-[0.14em] leading-tight text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                PES MOROCCAN{" "}
                <span className="text-[#e9c349] drop-shadow-[0_0_35px_rgba(233,195,73,0.6)]">
                  BOURGEOIS
                </span>
              </h1>

              {/* Golden Accent Line */}
              <div className="mt-4 w-36 sm:w-52 h-[2px] bg-gradient-to-r from-transparent via-[#e9c349] to-transparent shadow-[0_0_15px_#e9c349]" />
            </div>
          )}

          {/* ════ PHASE 2: SUSPENSE BLACK SCREEN (3 SECONDS) ════ */}
          {phase === "black" && (
            <div className="w-full h-full flex items-center justify-center pointer-events-none">
              {/* Pure, silent pitch black */}
            </div>
          )}

          {/* ════ PHASE 3: SAMA STUDIO PRESENTS ════ */}
          {phase === "studio" && (
            <div className="flex flex-col items-center text-center animate-sama-cinematic px-4">
              
              {/* Official SAMA Studio Logo */}
              <div className="relative mb-4 max-w-[200px] sm:max-w-[280px] md:max-w-[320px]">
                <div className="relative rounded-2xl overflow-hidden p-2">
                  <img
                    src="/branding/sama-studio-logo.png"
                    alt="SAMA App Development & Game Studio"
                    className="w-full h-auto object-contain drop-shadow-[0_0_35px_rgba(233,195,73,0.35)]"
                  />
                </div>
              </div>

              {/* PRESENTS */}
              <div className="inline-flex items-center gap-4 mt-2">
                <span className="w-10 sm:w-16 h-[1px] bg-gradient-to-r from-transparent to-[#e9c349]/80" />
                <span className="font-jetbrains text-xs sm:text-sm uppercase tracking-[0.55em] text-[#e9c349] font-black drop-shadow-[0_0_15px_rgba(233,195,73,0.6)]">
                  PRESENTS
                </span>
                <span className="w-10 sm:w-16 h-[1px] bg-gradient-to-l from-transparent to-[#e9c349]/80" />
              </div>
            </div>
          )}

        </div>

        {/* Bottom Footer Note */}
        <div className="w-full flex justify-center items-center text-[9px] font-mono tracking-widest text-zinc-600 uppercase">
          <span>© 2026 PMB · ALL RIGHTS RESERVED</span>
        </div>

      </div>
    </div>
  );
}
