"use client";

import { useState } from "react";

function initials(name?: string | null): string {
  if (!name || typeof name !== "string") return "PM";
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "PM";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase() || "PM";
  }

  const first = words[0][0] || "";
  const last = words[words.length - 1][0] || "";
  return (first + last).toUpperCase() || "PM";
}

export function ClubBadge({
  name,
  logo,
  size = "md",
}: {
  name?: string | null;
  logo?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const safeName = name?.trim() || "Club";
  const [imageError, setImageError] = useState(false);

  const dims = {
    xs: "h-5 w-5 text-[8px]",
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-20 w-20 text-xl",
  }[size];

  const showLogo = Boolean(logo) && !imageError;

  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-pmb-gold/60 bg-gradient-to-br from-pmb-charcoal to-black font-bold text-pmb-gold shadow-gold`}
      aria-label={`${safeName} crest`}
    >
      {showLogo ? (
        <img
          src={logo!}
          alt={`${safeName} logo`}
          className="h-full w-full object-contain p-1"
          onError={() => setImageError(true)}
        />
      ) : (
        initials(safeName)
      )}
    </div>
  );
}