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

      {/* ─── VERTICAL SCREEN FRAME (eFootball Mobile Portrait Layout) ─── */}
      <div className="relative w-full max-w-md h-[100dvh] flex flex-col justify-between items-center px-6 py-10 z-10">
        
        {/* Top Branding (eFootball Mobile Style) */}
        <div className="w-full flex justify-between items-center text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e9c349] animate-ping" />
            PMB MOBILE
          </span>
          <span className="text-zinc-600">2026/27</span>
        </div>

        {/* ─── CENTER ANIMATION CONTAINER ─── */}
        <div className="relative w-full flex flex-col items-center justify-center my-auto">
          
          {/* Ambient Stadium Glow Rays */}
          <div className="absolute -inset-20 bg-radial-gradient pointer-events-none opacity-40 flex items-center justify-center">
            <div className="w-72 h-72 rounded-full bg-gradient-to-tr from-[#e9c349]/20 to-[#38bdf8]/10 blur-3xl animate-pulse" />
          </div>

          {/* ════ PHASE 1: PES MOROCCAN BOURGEOIS ════ */}
          {phase === "pes" && (
            <div className="flex flex-col items-center text-center animate-cinematic-zoom px-4">
              
              {/* Emblem / Shield Badge */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-2xl border border-[#e9c349]/50 bg-gradient-to-b from-[#1c1a14] to-black flex items-center justify-center shadow-[0_0_40px_rgba(233,195,73,0.35)] relative overflow-hidden">
                  <div className="absolute inset-0 holographic-shimmer opacity-40" />
                  <span className="font-montserrat text-3xl font-black tracking-tighter text-[#e9c349]">
                    PMB
                  </span>
                </div>
                {/* Rotating Cyber Rings */}
                <div className="absolute -inset-2 rounded-2xl border border-[#e9c349]/20 animate-spin" style={{ animationDuration: "12s" }} />
              </div>

              {/* Tag */}
              <span className="font-jetbrains text-[10px] uppercase tracking-[0.3em] text-[#e9c349]/80 mb-2 font-semibold">
                THE HOME OF MOROCCAN eFOOTBALL
              </span>

              {/* Main Title: PES MOROCCAN BOURGEOIS */}
              <h1 className="font-montserrat text-2xl sm:text-3xl font-extrabold uppercase tracking-[0.18em] leading-tight gold-metallic-text">
                PES MOROCCAN
                <br />
                <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  BOURGEOIS
                </span>
              </h1>

              {/* Glowing Accent Line */}
              <div className="mt-5 w-24 h-[2px] bg-gradient-to-r from-transparent via-[#e9c349] to-transparent shadow-[0_0_12px_#e9c349]" />
            </div>
          )}

          {/* ════ PHASE 2: SAMA STUDIO PRESENT ════ */}
          {phase === "studio" && (
            <div className="flex flex-col items-center text-center animate-studio-fade px-4">
              
              {/* Studio Icon / Cyber Hexagon */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-950/40 to-black flex items-center justify-center shadow-[0_0_45px_rgba(56,189,248,0.4)]">
                  <span className="font-montserrat text-2xl font-black text-sky-400">
                    S
                  </span>
                </div>
                <div className="absolute -inset-2.5 rounded-full border border-sky-400/20 animate-ping" style={{ animationDuration: "3s" }} />
              </div>

              {/* Studio Name */}
              <h2 className="font-montserrat text-3xl sm:text-4xl font-extrabold uppercase tracking-[0.25em] cyan-studio-text mb-3">
                SAMA STUDIO
              </h2>

              {/* PRESENT */}
              <div className="inline-flex items-center gap-3">
                <span className="w-6 h-[1px] bg-sky-400/60" />
                <span className="font-jetbrains text-xs uppercase tracking-[0.45em] text-zinc-300 font-bold">
                  PRESENT
                </span>
                <span className="w-6 h-[1px] bg-sky-400/60" />
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
