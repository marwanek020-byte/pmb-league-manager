export type ClubTheme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  glow: string;
  stadium: string;
};

const CLUB_STADIUMS: Record<string, string> = {
  "FAR Rabat": "/dashboard/stadiums/far-rabat.jpg",
  "Wydad AC": "/dashboard/stadiums/wydad-ac.jpg",
  "Raja Casablanca": "/dashboard/stadiums/raja-casablanca.jpg",
  "Real Madrid": "/dashboard/stadiums/real-madrid.jpg",
};

// Official & signature vibrant color themes for clubs
const KNOWN_CLUB_THEMES: Record<string, Omit<ClubTheme, "stadium">> = {
  // 🇲🇦 BOTOLA PRO
  "FAR Rabat": { primary: "#e63946", secondary: "#2a9d8f", accent: "#ffd166", background: "#0d0406", glow: "rgba(230, 57, 70, 0.45)" },
  "Wydad AC": { primary: "#e63946", secondary: "#ffffff", accent: "#ffd166", background: "#0d0406", glow: "rgba(230, 57, 70, 0.45)" },
  "Raja Casablanca": { primary: "#10b981", secondary: "#ffffff", accent: "#f59e0b", background: "#020f08", glow: "rgba(16, 185, 129, 0.45)" },
  "FUS Rabat": { primary: "#ec4899", secondary: "#ffffff", accent: "#f59e0b", background: "#0f030a", glow: "rgba(236, 72, 153, 0.4)" },
  "Maghreb Fez": { primary: "#f59e0b", secondary: "#3b82f6", accent: "#fbbf24", background: "#0f0a02", glow: "rgba(245, 158, 11, 0.45)" },
  "Berkane": { primary: "#f97316", secondary: "#1f2937", accent: "#fbbf24", background: "#0f0602", glow: "rgba(249, 115, 22, 0.45)" },
  "Hassania Agadir": { primary: "#ef4444", secondary: "#f59e0b", accent: "#ffffff", background: "#0f0405", glow: "rgba(239, 68, 68, 0.4)" },
  "IR Tanger": { primary: "#3b82f6", secondary: "#ffffff", accent: "#f59e0b", background: "#030814", glow: "rgba(59, 130, 246, 0.4)" },
  "Olympique Safi": { primary: "#2563eb", secondary: "#dc2626", accent: "#fbbf24", background: "#040714", glow: "rgba(37, 99, 235, 0.4)" },

  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 PREMIER LEAGUE
  "Arsenal": { primary: "#ef4444", secondary: "#d97706", accent: "#ffffff", background: "#0f0304", glow: "rgba(239, 68, 68, 0.45)" },
  "Aston Villa": { primary: "#38bdf8", secondary: "#831843", accent: "#facc15", background: "#080510", glow: "rgba(56, 189, 248, 0.4)" },
  "Chelsea": { primary: "#2563eb", secondary: "#d97706", accent: "#ffffff", background: "#020714", glow: "rgba(37, 99, 235, 0.45)" },
  "Liverpool": { primary: "#dc2626", secondary: "#14b8a6", accent: "#facc15", background: "#0f0304", glow: "rgba(220, 38, 38, 0.45)" },
  "Manchester City": { primary: "#38bdf8", secondary: "#1e3a8a", accent: "#fbbf24", background: "#030914", glow: "rgba(56, 189, 248, 0.45)" },
  "Manchester United": { primary: "#dc2626", secondary: "#facc15", accent: "#ffffff", background: "#0f0304", glow: "rgba(220, 38, 38, 0.45)" },
  "Newcastle": { primary: "#94a3b8", secondary: "#0f172a", accent: "#38bdf8", background: "#08090a", glow: "rgba(148, 163, 184, 0.35)" },
  "Tottenham": { primary: "#6366f1", secondary: "#ffffff", accent: "#eab308", background: "#040514", glow: "rgba(99, 102, 241, 0.4)" },
  "West Ham": { primary: "#9d174d", secondary: "#38bdf8", accent: "#facc15", background: "#0f0308", glow: "rgba(157, 23, 77, 0.4)" },

  // 🇪🇸 LA LIGA
  "Real Madrid": { primary: "#eab308", secondary: "#2563eb", accent: "#ef4444", background: "#0a0802", glow: "rgba(234, 179, 8, 0.45)" },
  "Barcelona": { primary: "#be185d", secondary: "#1d4ed8", accent: "#facc15", background: "#0f0309", glow: "rgba(190, 24, 93, 0.45)" },
  "Atletico Madrid": { primary: "#ef4444", secondary: "#1e3a8a", accent: "#ffffff", background: "#0f0304", glow: "rgba(239, 68, 68, 0.4)" },
  "Real Betis": { primary: "#10b981", secondary: "#ffffff", accent: "#f59e0b", background: "#020f08", glow: "rgba(16, 185, 129, 0.4)" },

  // 🇮🇹 SERIE A
  "AC Milan": { primary: "#ef4444", secondary: "#000000", accent: "#f59e0b", background: "#0f0304", glow: "rgba(239, 68, 68, 0.45)" },
  "Inter": { primary: "#2563eb", secondary: "#000000", accent: "#fbbf24", background: "#020714", glow: "rgba(37, 99, 235, 0.45)" },
  "Juventus": { primary: "#e2e8f0", secondary: "#0f172a", accent: "#fbbf24", background: "#08080a", glow: "rgba(226, 232, 240, 0.35)" },
  "Napoli": { primary: "#0284c7", secondary: "#ffffff", accent: "#facc15", background: "#020912", glow: "rgba(2, 132, 199, 0.45)" },

  // 🇩🇪 BUNDESLIGA
  "Bayern Munich": { primary: "#dc2626", secondary: "#2563eb", accent: "#ffffff", background: "#0f0304", glow: "rgba(220, 38, 38, 0.45)" },
  "Borussia Dortmund": { primary: "#facc15", secondary: "#000000", accent: "#ffffff", background: "#0f0c02", glow: "rgba(250, 204, 21, 0.5)" },
  "Bayer Leverkusen": { primary: "#ef4444", secondary: "#000000", accent: "#facc15", background: "#0f0304", glow: "rgba(239, 68, 68, 0.4)" },

  // 🇫🇷 LIGUE 1
  "PSG": { primary: "#1d4ed8", secondary: "#ef4444", accent: "#ffffff", background: "#020614", glow: "rgba(29, 78, 216, 0.45)" },
  "Marseille": { primary: "#38bdf8", secondary: "#ffffff", accent: "#fbbf24", background: "#020914", glow: "rgba(56, 189, 248, 0.45)" },

  // 🌟 VIP LEAGUE
  "Ajax": { primary: "#dc2626", secondary: "#ffffff", accent: "#fbbf24", background: "#0f0304", glow: "rgba(220, 38, 38, 0.45)" },
  "Galatasaray": { primary: "#be185d", secondary: "#f59e0b", accent: "#ffffff", background: "#0f0308", glow: "rgba(190, 24, 93, 0.45)" },
};

/**
 * Generates a vibrant HSL color theme and stadium background for any team name.
 */
export function getClubTheme(clubName?: string | null): ClubTheme {
  const safeName = clubName?.trim() || "PMB Club";
  const stadium = CLUB_STADIUMS[safeName] ?? "/dashboard/stadiums/default.jpg";

  if (KNOWN_CLUB_THEMES[safeName]) {
    return {
      ...KNOWN_CLUB_THEMES[safeName],
      stadium,
    };
  }

  // Deterministic seed from club name
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const secondaryHue = (hue + 140) % 360;

  const primary = `hsl(${hue}, 85%, 52%)`;
  const secondary = `hsl(${secondaryHue}, 75%, 45%)`;
  const accent = `hsl(${(hue + 40) % 360}, 90%, 60%)`;
  const background = `hsl(${hue}, 50%, 4%)`;
  const glow = `hsla(${hue}, 85%, 52%, 0.45)`;

  return {
    primary,
    secondary,
    accent,
    background,
    glow,
    stadium,
  };
}
