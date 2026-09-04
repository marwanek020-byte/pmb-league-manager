"use client";

import { CSSProperties, ReactNode } from "react";
import { getClubTheme } from "@/lib/club-colors";

export function ClubThemeShell({
  clubName,
  clubLogo,
  leagueName,
  children,
}: {
  clubName?: string | null;
  clubLogo?: string | null;
  leagueName?: string | null;
  children: ReactNode;
}) {
  const safeClubName = clubName || "PMB";
  const theme = getClubTheme(safeClubName);

  const style = {
    "--club-primary": theme.primary,
    "--club-secondary": theme.secondary,
    "--club-accent": theme.accent,
    "--club-background": theme.background,
    "--club-glow": theme.glow,
  } as CSSProperties;

  return (
    <div className="club-world min-h-screen w-full text-white" style={style}>
      {/* ── 1. Team Stadium Background Layer ────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-luminosity"
        style={{ backgroundImage: `url(${theme.stadium})` }}
      />

      {/* ── 2. Atmospheric Vignette & Color Glow Layers ─────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#0a0a0c]/85 via-[#0a0a0c]/90 to-[#070709]" />

      {/* Top Ambient Spotlights */}
      <div 
        className="pointer-events-none fixed -top-48 left-1/2 h-[550px] w-[800px] -translate-x-1/2 rounded-full opacity-35 blur-[140px]"
        style={{ backgroundColor: theme.primary }}
      />
      <div 
        className="pointer-events-none fixed -top-32 right-10 h-[450px] w-[450px] rounded-full opacity-25 blur-[120px]"
        style={{ backgroundColor: theme.secondary }}
      />

      {/* ── 3. Giant Centered Watermark Crest ───────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
        {clubLogo ? (
          <img
            src={clubLogo}
            alt=""
            className="h-[550px] w-[550px] max-h-[70vh] max-w-[70vw] object-contain opacity-[0.07] grayscale contrast-150 drop-shadow-[0_0_90px_rgba(255,255,255,0.15)]"
          />
        ) : (
          <span className="text-[260px] font-black uppercase tracking-tighter text-white opacity-[0.05] select-none">
            {safeClubName.slice(0, 3)}
          </span>
        )}
      </div>

      {/* ── 4. Main App Content ─────────────────────────────────── */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
