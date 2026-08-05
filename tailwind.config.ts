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
          gold: "#d4af37",
          "gold-light": "#e9cf6b",
          "gold-dark": "#a5841f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212,175,55,0.4), 0 8px 24px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
