import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pmb: {
          black: "#0a0a0a",
          charcoal: "#141414",
          panel: "#1c1c1c",
          border: "#2a2a2a",
          void: "#090A0F",
          base: "#0F121C",
          surface: "#161B26",
          glass: "#131826",
          gold: {
            DEFAULT: "#d4af37",
            light: "#FDE047",
            strong: "#EAB308",
            dark: "#a5841f",
          },
          turf: {
            DEFAULT: "#10B981",
            deep: "#059669",
          },
          red: {
            DEFAULT: "#EF4444",
            deep: "#DC2626",
          },
          text: {
            DEFAULT: "#FFFFFF",
            secondary: "#94A3B8",
            muted: "#64748B",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212,175,55,0.4), 0 8px 24px rgba(0,0,0,0.45)",
        glass: "0 8px 32px rgba(0,0,0,0.4)",
        turf: "0 0 24px rgba(16,185,129,0.2)",
      },
      backgroundImage: {
        "gold-ambient":
          "radial-gradient(ellipse at top right, rgba(212,175,55,0.15), transparent 65%)",
        "turf-ambient":
          "radial-gradient(ellipse at center, rgba(16,185,129,0.2), transparent 70%)",
      },
      keyframes: {
        scan: {
          "0%, 100%": { top: "0%", opacity: "0.4" },
          "50%": { top: "100%", opacity: "1" },
        },
        urgent: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0)" },
          "50%": { boxShadow: "0 0 0 5px rgba(239,68,68,0.15)" },
        },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        particle: {
          from: {
            opacity: "1",
            transform: "translateY(0) rotate(0deg)",
          },
          to: {
            opacity: "0",
            transform: "translateY(-100px) rotate(180deg)",
          },
        },
      },
      animation: {
        scan: "scan 2.4s ease-in-out infinite",
        urgent: "urgent 1s ease-in-out infinite",
        ticker: "ticker 32s linear infinite",
        particle: "particle 900ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
