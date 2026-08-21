"use client";

import React from "react";
import { getClubUltras } from "@/lib/services/ultras-registry";

type BadgeSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CONFIG: Record<BadgeSize, { container: string; iconSize: string; text: string }> = {
  xs: { container: "h-6 w-6", iconSize: "w-3.5 h-3.5", text: "text-[9px]" },
  sm: { container: "h-8 w-8", iconSize: "w-5 h-5", text: "text-xs" },
  md: { container: "h-11 w-11", iconSize: "w-7 h-7", text: "text-sm" },
  lg: { container: "h-16 w-16", iconSize: "w-10 h-10", text: "text-lg" },
  xl: { container: "h-24 w-24", iconSize: "w-16 h-16", text: "text-2xl" },
};

/**
 * Custom SVG Icon Mascot for each Botola Club's Ultras
 */
function UltrasMascotIcon({ clubName, className = "" }: { clubName: string; className?: string }) {
  const lower = clubName.toLowerCase().trim();

  // 1. 🟢⚫🔴 FAR Rabat — 100% Military Combat (NO Eagle, Pure Military Helmet & Daggers)
  if (lower.includes("far") || lower.includes("rabat") && !lower.includes("fus") && !lower.includes("yacoub")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Military Combat Helmet */}
        <path d="M12 2C6.5 2 2 6.5 2 12c0 2.2.8 4.2 2.1 5.8L3 21l3.5-.9C8.1 21.3 10 22 12 22s3.9-.7 5.5-1.9L21 21l-1.1-3.2C21.2 16.2 22 14.2 22 12c0-5.5-4.5-10-10-10z" opacity="0.25" />
        {/* Helmet Rim & Visor */}
        <path d="M4 11h16c.6 0 1 .4 1 1 0 3.3-2.7 6-6 6h-6c-3.3 0-6-2.7-6-6 0-.6.4-1 1-1z" />
        <path d="M12 4a8 8 0 0 0-8 7h16a8 8 0 0 0-8-7z" />
        {/* Crossed Military Daggers / Star */}
        <path d="M12 7l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="#D32F2F" />
      </svg>
    );
  }

  // 2. 🟢⚪ Raja Casablanca — Curva Sud Green Eagle
  if (lower.includes("raja")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Eagle Spread Wings */}
        <path d="M12 3l-2.5 4H4l4 3.5-2 5.5 6-3.5 6 3.5-2-5.5 4-3.5h-5.5z" />
        <circle cx="12" cy="17" r="3" fill="#FFFFFF" opacity="0.9" />
        <path d="M11 15h2v4h-2z" fill="#006837" />
      </svg>
    );
  }

  // 3. ❤️⚪ Wydad AC — Winners Gladiator Mask & Star
  if (lower.includes("wydad")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Gladiator / Spartan Mask */}
        <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" opacity="0.3" />
        <path d="M12 4l6 3v5c0 4-2.5 7.7-6 9-3.5-1.3-6-5-6-9V7l6-3z" />
        <path d="M10 10h4v6h-4zM8 12h8v2H8z" fill="#FFFFFF" />
      </svg>
    );
  }

  // 4. 💛🖤 MAS Fes — Fatal Tigers
  if (lower.includes("mas") || lower.includes("fez") || lower.includes("fes")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Roaring Tiger Head */}
        <path d="M12 3c-4.4 0-8 3.6-8 8 0 2.5 1.1 4.7 2.9 6.2L6 21l4-1.5c.6.3 1.3.5 2 .5s1.4-.2 2-.5l4 1.5-.9-3.8C18.9 15.7 20 13.5 20 11c0-4.4-3.6-8-8-8z" />
        <circle cx="9" cy="10" r="1.5" fill="#000000" />
        <circle cx="15" cy="10" r="1.5" fill="#000000" />
        <path d="M12 13l-1.5 2h3z" fill="#000000" />
      </svg>
    );
  }

  // 5. 💙🤍 IR Tanger — Hercules of Boughaz
  if (lower.includes("tanger") || lower.includes("irt")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Hercules Pillar / Waves */}
        <path d="M4 4h4v16H4zM16 4h4v16h-4zM2 20h20v2H2z" />
        <path d="M8 8h8v2H8zM8 14h8v2H8z" opacity="0.7" />
      </svg>
    );
  }

  // 6. 🧡🖤 RS Berkane — Orange Boys Fortress
  if (lower.includes("berkane") || lower.includes("rsb")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Orange Knight Shield */}
        <path d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4z" />
        <circle cx="12" cy="12" r="4" fill="#000000" />
      </svg>
    );
  }

  // 7. 🔴🤍 Hassania Agadir — Amazigh Yaz
  if (lower.includes("agadir") || lower.includes("husa") || lower.includes("hassania")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Amazigh ⵣ Symbol */}
        <path d="M5 4v16M19 4v16M5 12h14M12 4c-3 0-5 3.5-5 8s2 8 5 8 5-3.5 5-8-2-8-5-8z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  // 8. 💙🔴 Olympic Safi — Shark
  if (lower.includes("safi") || lower.includes("ocs") || lower.includes("olympique safi")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Shark Fin & Waves */}
        <path d="M12 3c-1.5 4-4 7-9 8 5 2 8 5 9 10 1-5 4-8 9-10-5-1-7.5-4-9-8z" />
      </svg>
    );
  }

  // 9. 🔴🤍 Kawkab Marrakech — Red Bahja Palm
  if (lower.includes("marrakech") || lower.includes("kawkab")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        {/* Palm & Shield */}
        <path d="M12 3v18M7 7c2 2 5 2 5 2M17 7c-2 2-5 2-5 2M6 12c3 1 6 1 6 1M18 12c-3 1-6 1-6 1" stroke="currentColor" strokeWidth="2.5" fill="none" />
      </svg>
    );
  }

  // Default Shield & Flame Mascot for all other clubs
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" />
      <path d="M12 6c-2 3-1 6-3 8 2 0 4-1 5-3 1 2 3 3 5 3-2-2-1-5-3-8h-4z" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}

/**
 * Premium Ultras Badge Component.
 * Displays authentic club colors, gradients, and custom Ultras mascot.
 */
export function UltrasBadge({
  clubName,
  size = "md",
  showTooltip = false,
}: {
  clubName: string;
  size?: BadgeSize;
  showTooltip?: boolean;
}) {
  const ultras = getClubUltras(clubName);
  const cfg = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  const primaryColor = ultras.colors[0] || "#D4AF37";
  const secondaryColor = ultras.colors[1] || "#111111";
  const accentColor = ultras.colors[2] || primaryColor;

  return (
    <div
      className={`group relative flex shrink-0 items-center justify-center rounded-2xl border border-white/20 shadow-lg transition-transform duration-300 hover:scale-105 ${cfg.container}`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        boxShadow: `0 4px 15px ${primaryColor}40`,
      }}
      title={showTooltip ? `${ultras.groupName} (${ultras.officialGroupTitle || ultras.groupName})` : undefined}
    >
      {/* Inner Metallic Border */}
      <div className="absolute inset-[1.5px] rounded-[14px] border border-white/25 bg-black/40 backdrop-blur-xs flex items-center justify-center overflow-hidden">
        {/* Background diagonal stripe */}
        <div
          className="absolute inset-0 opacity-20 transform -rotate-45"
          style={{
            backgroundImage: `linear-gradient(90deg, transparent 40%, ${accentColor} 40%, ${accentColor} 60%, transparent 60%)`,
          }}
        />

        {/* Mascot Icon */}
        <div className="relative z-10 flex items-center justify-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <UltrasMascotIcon clubName={clubName} className={cfg.iconSize} />
        </div>
      </div>
    </div>
  );
}
