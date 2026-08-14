"use client";

import { CSSProperties, ReactNode } from "react";

type Theme = { primary: string; secondary: string; accent: string; background: string };

const namedThemes: Record<string, Theme> = {
  "Real Madrid": { primary: "#e7e3d7", secondary: "#2454a6", accent: "#d9ae58", background: "#090b10" },
  Barcelona: { primary: "#a7173b", secondary: "#142d73", accent: "#dfb648", background: "#10070d" },
  "Bayern Munich": { primary: "#d6293a", secondary: "#f1efea", accent: "#e4bd60", background: "#130708" },
  Liverpool: { primary: "#b92b38", secondary: "#168876", accent: "#e1b95f", background: "#07110f" },
  PSG: { primary: "#1c438e", secondary: "#c63851", accent: "#e3bd61", background: "#060914" },
  "FAR Rabat": { primary: "#be2934", secondary: "#116c42", accent: "#e0b55b", background: "#130708" },
  "Wydad AC": { primary: "#bd2934", secondary: "#f0ede3", accent: "#d7af5a", background: "#140708" },
  "Raja Casablanca": { primary: "#087245", secondary: "#d4e7d9", accent: "#dfb75c", background: "#06110b" },
};

const leagueThemes: Record<string, Theme> = {
  "Premier League": { primary: "#285eaa", secondary: "#8fc4e5", accent: "#e4bd62", background: "#060b14" },
  "La Liga": { primary: "#a81d3e", secondary: "#1d397d", accent: "#e3b64c", background: "#12060c" },
  "Serie A": { primary: "#197260", secondary: "#244783", accent: "#dfb85d", background: "#06100f" },
  Bundesliga: { primary: "#bc2634", secondary: "#242424", accent: "#e1ba5d", background: "#130707" },
  "Ligue 1": { primary: "#214f9d", secondary: "#233a72", accent: "#e2bd63", background: "#060914" },
  "VIP League": { primary: "#764494", secondary: "#234f88", accent: "#dfb75b", background: "#0b0810" },
  "BOTOLA PRO": { primary: "#b92d36", secondary: "#176d48", accent: "#dfb75d", background: "#120708" },
};

function shade(hex: string, delta: number) {
  const values = hex.slice(1).match(/.{2}/g)!.map((v) => Math.max(0, Math.min(255, parseInt(v, 16) + delta)));
  return `#${values.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function ClubThemeShell({ clubName, leagueName, children }: { clubName: string; leagueName: string; children: ReactNode }) {
  const base = namedThemes[clubName] ?? leagueThemes[leagueName] ?? leagueThemes["VIP League"];
  const seed = [...clubName].reduce((n, char) => n + char.charCodeAt(0), 0);
  const primary = namedThemes[clubName] ? base.primary : shade(base.primary, (seed % 38) - 19);
  const style = {
    "--club-primary": primary,
    "--club-secondary": base.secondary,
    "--club-accent": base.accent,
    "--club-background": base.background,
  } as CSSProperties;

  return <div className="club-world min-h-screen" style={style}>{children}</div>;
}
