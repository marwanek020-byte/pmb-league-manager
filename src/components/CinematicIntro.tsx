"use client";

import React, { useEffect, useState, useRef } from "react";

interface CinematicIntroProps {
  onComplete?: () => void;
}

type IntroPhase = "pes" | "studio" | "black" | "fadeout" | "done";

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>("pes");
  const [isSkipped, setIsSkipped] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const skipIntro = () => {
    if (isSkipped || phase === "done") return;
    setIsSkipped(true);
    clearAllTimers();
    // Quick cinematic dissolve through black
    setPhase("black");
    setTimeout(() => {
      setPhase("fadeout");
      setTimeout(() => {
        setPhase("done");
        onComplete?.();
      }, 500);
    }, 200);
  };

  useEffect(() => {
    // Stage 1: PES MOROCCAN BOURGEOIS (0 - 2600ms)
    // Stage 2: SAMA STUDIO PRESENT (2600ms - 5200ms)
    // Stage 3: BLACK SCREEN (5200ms - 6600ms)
    // Stage 4: FADEOUT (6600ms - 7400ms)
    // Stage 5: DONE

    const t1 = setTimeout(() => {
      setPhase("studio");
    }, 2600);

    const t2 = setTimeout(() => {
      setPhase("black");
    }, 5200);

    const t3 = setTimeout(() => {
      setPhase("fadeout");
    }, 6600);

    const t4 = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 7400);

    timersRef.current = [t1, t2, t3, t4];

    return () => clearAllTimers();
  }, [onComplete]);

  if (phase === "done") {
    return null;
  }

  return (
    <div
      id="pmb-cinematic-intro"
      className={`fixed inset-0 z-[99999] flex items-center justify-center select-none overflow-hidden transition-opacity duration-700 ${
        phase === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
      } bg-black`}
    >
      {/* ─── SKIP BUTTON (Top Right) ─── */}
      {phase !== "black" && phase !== "fadeout" && (
        <button
          onClick={skipIntro}
          className="absolute top-6 right-6 z-50 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-[11px] font-mono tracking-widest text-zinc-300 hover:text-white transition-all duration-200 active:scale-95 flex items-center gap-1.5 shadow-lg"
          title="Skip Intro"
        >
          <span>SKIP</span>
          <span className="text-[#e9c349]">»</span>
        </button>
      )}

      {/* ─── CINEMATIC WIDESCREEN HORIZONTAL FRAME (Landscape Layout) ─── */}
      <div className="relative w-full max-w-4xl h-[100dvh] flex flex-col justify-between items-center px-6 py-5 sm:px-12 sm:py-7 z-10">
        
        {/* Top Branding */}
        <div className="w-full flex justify-between items-center text-[10px] sm:text-xs font-mono tracking-[0.25em] text-zinc-500 uppercase">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e9c349] animate-ping" />
            PMB LEAGUE MANAGER
          </span>
          <span className="text-zinc-500 font-bold">2026/27</span>
        </div>

        {/* ─── CENTER ANIMATION CONTAINER ─── */}
        <div className="relative w-full flex flex-col items-center justify-center my-auto">
          
          {/* Ambient Stadium Glow Rays */}
          <div className="absolute -inset-20 bg-radial-gradient pointer-events-none opacity-40 flex items-center justify-center">
            <div className="w-80 h-80 rounded-full bg-gradient-to-tr from-[#e9c349]/20 to-[#38bdf8]/10 blur-3xl animate-pulse" />
          </div>

          {/* ════ PHASE 1: PES MOROCCAN BOURGEOIS ════ */}
          {phase === "pes" && (
            <div className="flex flex-col items-center text-center animate-cinematic-zoom px-4">
              
              {/* PMB Emblem Shield */}
              <div className="relative mb-3 sm:mb-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl sm:rounded-3xl border-2 border-[#e9c349]/70 bg-black p-1 shadow-[0_0_50px_rgba(233,195,73,0.45)] relative overflow-hidden">
                  <img
                    src="/branding/pmb-app-logo.jpg"
                    alt="PES Moroccan Bourgeois"
                    className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none rounded-2xl" />
                </div>
                {/* Ambient Golden Halo Pulse */}
                <div className="absolute -inset-2 sm:-inset-3 rounded-2xl sm:rounded-3xl border border-[#e9c349]/30 animate-ping pointer-events-none" style={{ animationDuration: "3s" }} />
              </div>

              {/* Tag */}
              <span className="font-jetbrains text-[9px] sm:text-[11px] uppercase tracking-[0.35em] text-[#e9c349] mb-1 font-bold drop-shadow-[0_0_8px_rgba(233,195,73,0.6)]">
                THE HOME OF MOROCCAN eFOOTBALL
              </span>

              {/* Main Title: PES MOROCCAN BOURGEOIS (Landscape Wide Heading) */}
              <h1 className="font-montserrat text-2xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-[0.16em] leading-tight gold-metallic-text">
                PES MOROCCAN{" "}
                <span className="text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.5)]">
                  BOURGEOIS
                </span>
              </h1>

              {/* Glowing Accent Line */}
              <div className="mt-3 sm:mt-4 w-32 sm:w-44 h-[2px] bg-gradient-to-r from-transparent via-[#e9c349] to-transparent shadow-[0_0_15px_#e9c349]" />
            </div>
          )}

          {/* ════ PHASE 2: SAMA STUDIO PRESENT ════ */}
          {phase === "studio" && (
            <div className="flex flex-col items-center text-center animate-studio-fade px-4">
              
              {/* Official SAMA Studio Logo */}
              <div className="relative mb-2 sm:mb-3 max-w-[160px] sm:max-w-[220px] md:max-w-[260px]">
                <div className="relative rounded-2xl overflow-hidden p-1 sm:p-2 shadow-[0_0_60px_rgba(233,195,73,0.3)]">
                  <img
                    src="/branding/sama-studio-logo.png"
                    alt="SAMA App Development & Game Studio"
                    className="w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(233,195,73,0.4)]"
                  />
                </div>
                {/* Ambient Glow */}
                <div className="absolute -inset-4 bg-[#e9c349]/10 rounded-full blur-2xl pointer-events-none" />
              </div>

              {/* PRESENTS */}
              <div className="inline-flex items-center gap-4 mt-1 sm:mt-2">
                <span className="w-8 sm:w-12 h-[1px] bg-gradient-to-r from-transparent to-[#e9c349]/70" />
                <span className="font-jetbrains text-xs sm:text-sm uppercase tracking-[0.5em] text-[#e9c349] font-black drop-shadow-[0_0_10px_rgba(233,195,73,0.5)]">
                  PRESENTS
                </span>
                <span className="w-8 sm:w-12 h-[1px] bg-gradient-to-l from-transparent to-[#e9c349]/70" />
              </div>
            </div>
          )}

          {/* ════ PHASE 3: TOTAL BLACK SCREEN (Suspense Blackout) ════ */}
          {phase === "black" && (
            <div className="w-full h-full flex items-center justify-center">
              {/* Pitch black suspense pause */}
            </div>
          )}

        </div>

        {/* Bottom Status / Footer */}
        <div className="w-full flex flex-col items-center gap-1 text-[9px] font-mono tracking-[0.2em] text-zinc-600 uppercase">
          {phase !== "black" && phase !== "fadeout" && (
            <>
              <div className="w-8 h-1 rounded-full bg-zinc-800 mb-1" />
              <span>POWERED BY PMB ENGINE • KONAMI STYLE</span>
            </>
          )}
        </div>

      </div>

      {/* Deep stadium dark gradients */}
      <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/80 to-black pointer-events-none" />
    </div>
  );
}
