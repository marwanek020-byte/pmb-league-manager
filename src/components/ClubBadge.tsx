"use client";

import { useState } from "react";

function initials(name: string): string {
  const words = name.split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function ClubBadge({
  name,
  logo,
  size = "md",
}: {
  name: string;
  logo?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [imageError, setImageError] = useState(false);

  const dims = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-20 w-20 text-xl",
  }[size];

  const showLogo = Boolean(logo) && !imageError;

  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-pmb-gold/60 bg-gradient-to-br from-pmb-charcoal to-black font-bold text-pmb-gold shadow-gold`}
      aria-label={`${name} crest`}
    >
      {showLogo ? (
        <img
          src={logo!}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-1"
          onError={() => setImageError(true)}
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}