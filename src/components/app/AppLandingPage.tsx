"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CinematicIntro } from "@/components/CinematicIntro";
import { AppHomeDashboard } from "./AppHomeDashboard";

interface AppUser {
  id?: string;
  username?: string;
  role?: "ADMINISTRATOR" | "CLUB_MANAGER";
  clubId?: string | null;
  clubName?: string | null;
  leagueName?: string | null;
}

export function AppLandingPage({
  initialUser,
}: {
  initialUser?: AppUser | null;
}) {
  const router = useRouter();
  // Always show intro when opening the app, unless returning directly from the About Us website view
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("return") === "true") return false;
    }
    return true;
  });

  // Scene state: "welcome" (Image 1) | "login" (Image 2) | "enter" (Image 3) | "loading" | "dashboard"
  const [scene, setScene] = useState<"welcome" | "login" | "enter" | "loading" | "dashboard">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (initialUser && (p.get("return") === "true" || p.get("tab") === "extras")) {
        return "dashboard";
      }
    }
    return initialUser ? "enter" : "welcome";
  });
  const [currentUser, setCurrentUser] = useState<AppUser | null>(initialUser || null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Clear any legacy skip flags from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("pmb-app-intro-seen");
      sessionStorage.removeItem("pmb-app-intro-seen");
    } catch {}
  }, []);

  // Check if session already exists
  useEffect(() => {
    fetch("/api/app/dashboard-data")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setDashboardData(data);
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      })
      .catch(() => {});
  }, [initialUser]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setLoginError("Incorrect username or password. Please try again.");
        setIsLoggingIn(false);
        return;
      }

      const sessionRes = await fetch("/api/app/dashboard-data").then((r) => r.json());
      if (sessionRes) {
        setDashboardData(sessionRes);
        if (sessionRes.user) {
          setCurrentUser(sessionRes.user);
        }
      }

      setIsLoggingIn(false);
      setScene("enter");
    } catch (err) {
      setLoginError("Login failed. Please try again.");
      setIsLoggingIn(false);
    }
  }

  function handleEnterApp() {
    setScene("loading");

    // Start soundtrack playback right here when entering Home
    sessionStorage.setItem("pmb-music-started", "true");
    window.dispatchEvent(new Event("pmb-start-music"));

    // Fetch freshest data
    fetch("/api/app/dashboard-data")
      .then((r) => r.json())
      .then((data) => {
        if (data) setDashboardData(data);
      })
      .catch(() => {});

    // Loading delay (2.2s) before entering the eFootball/FC25 dashboard
    setTimeout(() => {
      setScene("dashboard");
    }, 2200);
  }

  if (scene === "dashboard") {
    const isExtras =
      typeof window !== "undefined" &&
      (window.location.search.includes("tab=extras") || window.location.search.includes("return=true"));

    return (
      <AppHomeDashboard
        initialData={dashboardData}
        initialTab={isExtras ? "EXTRAS" : "TEAM"}
        onLogout={() => {
          if (typeof window !== "undefined") {
            try {
              sessionStorage.removeItem("pmb-music-started");
              localStorage.removeItem("pmb-app-intro-seen");
              sessionStorage.removeItem("pmb-app-intro-seen");
            } catch {}
          }
          setShowIntro(true);
          setCurrentUser(null);
          setDashboardData(null);
          setUsername("");
          setPassword("");
          setScene("welcome");
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] min-h-[100dvh] bg-[#070709] text-white select-none overflow-x-hidden overflow-y-auto font-montserrat">
      {/* Cinematic Intro: 5s PMB Logo -> 3s Black Screen -> SAMA Studio */}
      {showIntro && (
        <CinematicIntro
          onComplete={() => {
            setShowIntro(false);
          }}
        />
      )}

      {/* ═══ LOADING SCENE (EA FC / eFootball Style) ═══ */}
      {scene === "loading" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070709] select-none animate-fadeIn">
          {/* Ambient Stadium Glow */}
          <div className="absolute w-80 h-80 rounded-full bg-[#e9c349]/15 blur-3xl pointer-events-none" />

          {/* Center 3D Lion with Pulsing Gold Ring */}
          <div className="relative mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#e9c349] bg-black p-1 shadow-[0_0_50px_rgba(233,195,73,0.5)] flex items-center justify-center">
              <img
                src="/branding/pmb-official-logo.png"
                alt="PMB"
                className="w-full h-full object-contain rounded-full animate-pulse"
              />
            </div>
            <div className="absolute -inset-2 rounded-full border border-[#e9c349]/40 animate-ping pointer-events-none" style={{ animationDuration: "2s" }} />
          </div>

          {/* Text */}
          <h2 className="font-montserrat text-sm sm:text-base md:text-lg font-black uppercase tracking-[0.25em] text-white text-center px-4">
            PMB LEAGUE MANAGER
          </h2>
          <p className="font-jetbrains text-[9px] sm:text-xs font-bold uppercase tracking-[0.3em] text-[#e9c349] mt-2 animate-pulse text-center px-4">
            SYNCING MATCHDAYS & LIVE MERCATO...
          </p>

          {/* Progress Bar */}
          <div className="w-44 sm:w-64 h-1.5 bg-white/10 rounded-full overflow-hidden mt-5">
            <div className="h-full bg-gradient-to-r from-[#e9c349] via-amber-300 to-[#e9c349] w-full animate-pulse" />
          </div>
        </div>
      )}

      {/* ═══ PMB LUXURY 3D APP PORTAL (Scenes 1, 2, 3) ═══ */}
      <section
        className={`relative z-10 w-full min-h-[100dvh] flex flex-col justify-between items-center transition-all duration-700 ${
          scene === "enter" || scene === "welcome" ? "cursor-pointer" : ""
        }`}
        onClick={
          scene === "enter"
            ? handleEnterApp
            : scene === "welcome"
            ? () => setScene("login")
            : undefined
        }
      >
        {/* Background Artwork Layer — Always covers full screen edge-to-edge */}
        <div
          className="fixed inset-0 w-full h-full bg-cover bg-center transition-all duration-700 pointer-events-none"
          style={{
            backgroundImage:
              scene === "welcome"
                ? "url('/landing/pmb-welcome-bg.jpg')"
                : "url('/landing/pmb-master-clean-bg.png')",
            backgroundColor: "#070709",
          }}
        />

        {/* Gentle Gold/Dark Luxury Backdrop in Login Mode — keeps 3D Lion artwork radiant */}
        {scene === "login" && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-none" />
        )}

        {/* Top Header Bar */}
        <div className="relative z-20 w-full flex justify-between items-center px-4 sm:px-8 py-2.5 sm:py-3 pt-[max(0.75rem,env(safe-area-inset-top))] select-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-black/50 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#e9c349] animate-pulse" />
            <span className="font-jetbrains text-[10px] sm:text-xs tracking-[0.2em] text-gray-300 font-bold uppercase">
              PMB APP 2026/27
            </span>
          </div>

          {scene === "login" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setScene("welcome");
              }}
              className="font-jetbrains text-[11px] sm:text-xs font-bold tracking-wider text-gray-300 hover:text-white px-3.5 py-1 rounded-full border border-white/20 bg-black/70 hover:bg-black/90 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              ✕ CANCEL
            </button>
          )}
        </div>

        {/* ─── SCENE 1: WELCOME SCREEN ─── */}
        {scene === "welcome" && (
          <div className="relative z-20 my-auto flex flex-col items-center justify-center select-none pointer-events-none px-4 py-2">
            {/* Interactive gold pill button adaptive to all phone dimensions */}
            <div className="mt-20 sm:mt-24 md:mt-28 flex flex-col items-center gap-2 animate-bounce" style={{ animationDuration: "2.5s" }}>
              <div className="px-8 sm:px-10 py-2 sm:py-2.5 rounded-full border-2 border-[#e9c349]/90 bg-black/70 backdrop-blur-md text-[#e9c349] font-montserrat text-xs sm:text-sm font-black tracking-[0.25em] uppercase shadow-[0_0_30px_rgba(233,195,73,0.45)] flex items-center gap-2">
                <span>LOG IN</span>
                <span className="text-xs">›</span>
              </div>
              <span className="font-jetbrains text-[9px] sm:text-[10px] tracking-[0.25em] text-gray-300 font-bold uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                TAP ANYWHERE TO ENTER
              </span>
            </div>
          </div>
        )}

        {/* ─── SCENE 2: LOGIN FORM (Full Screen Adaptive) ─── */}
        {scene === "login" && (
          <div
            className="relative z-30 my-auto flex flex-col items-center justify-center w-full px-4 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-[340px] sm:max-w-[380px] rounded-2xl sm:rounded-3xl border border-[#e9c349]/40 bg-[#0e0e11]/95 p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(233,195,73,0.2)] backdrop-blur-2xl animate-fadeIn">
              
              {/* Luxury Header with PMB Emblem */}
              <div className="flex items-center justify-center gap-2.5 mb-3.5 pb-2 border-b border-white/10">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-[#e9c349]/70 bg-black p-0.5 shadow-sm">
                  <img
                    src="/branding/pmb-official-logo.png"
                    alt="PMB"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-montserrat text-xs sm:text-sm font-black tracking-widest text-[#e9c349] uppercase">
                  CLUB MANAGER LOGIN
                </h3>
              </div>

              <form onSubmit={handleLogin} className="space-y-3 sm:space-y-3.5">
                {loginError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-2 text-center text-[11px] font-bold text-red-400">
                    {loginError}
                  </div>
                )}

                {/* USERNAME */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none text-xs">
                    👤
                  </span>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="USERNAME"
                    className="w-full rounded-xl border border-white/15 bg-[#08080a] py-2 sm:py-2.5 pl-9 pr-3 font-montserrat text-xs font-bold tracking-wider text-white placeholder-gray-500 focus:border-[#e9c349] focus:outline-none focus:ring-1 focus:ring-[#e9c349]/60 transition-all uppercase"
                  />
                </div>

                {/* PASSWORD */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none text-xs">
                    🔒
                  </span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="PASSWORD"
                    className="w-full rounded-xl border border-white/15 bg-[#08080a] py-2 sm:py-2.5 pl-9 pr-3 font-montserrat text-xs font-bold tracking-wider text-white placeholder-gray-500 focus:border-[#e9c349] focus:outline-none focus:ring-1 focus:ring-[#e9c349]/60 transition-all uppercase"
                  />
                </div>

                {/* GOLD LOG IN BUTTON */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-xl py-2.5 sm:py-3 font-montserrat text-xs sm:text-sm font-black uppercase tracking-widest text-[#0a0a0a] transition-all duration-300 shadow-[0_4px_25px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  style={{
                    background: "linear-gradient(180deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
                  }}
                >
                  {isLoggingIn ? "LOGGING IN..." : "LOG IN"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── SCENE 3: ENTER SCREEN ─── */}
        {scene === "enter" && (
          <div className="relative z-20 my-auto flex flex-col items-center justify-center px-4 py-2">
            {/* Pulsing "CLICK TO ENTER" sentence cleanly centered */}
            <div className="flex flex-col items-center text-center gap-1.5 sm:gap-2 select-none animate-pulse">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="w-6 sm:w-12 h-[1.5px] bg-gradient-to-r from-transparent to-[#e9c349]" />
                <span className="font-montserrat text-lg sm:text-2xl md:text-3xl font-black uppercase tracking-[0.35em] text-[#e9c349] drop-shadow-[0_0_25px_rgba(233,195,73,0.9)]">
                  CLICK TO ENTER
                </span>
                <span className="w-6 sm:w-12 h-[1.5px] bg-gradient-to-l from-transparent to-[#e9c349]" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] text-gray-300 uppercase drop-shadow">
                PRESS ANYWHERE ON SCREEN TO ENTER PORTAL
              </span>
            </div>
          </div>
        )}

        {/* Bottom Left Manager Badge (Scene 3) */}
        {scene === "enter" && (
          <div className="absolute bottom-3 left-4 sm:bottom-5 sm:left-6 z-30 flex items-center gap-2.5 sm:gap-3 rounded-2xl border border-[#e9c349]/50 bg-black/85 px-3 sm:px-4 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-md pointer-events-none animate-fadeIn">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#e9c349]/50 bg-black p-1 shadow-gold">
              <img
                src="/branding/pmb-official-logo.png"
                alt="Lion"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">
                {currentUser?.clubName || "FAR RABAT"}
              </p>
              <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#e9c349]">
                {currentUser?.role === "ADMINISTRATOR" ? "ADMINISTRATOR" : "MANAGER"}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Spacer */}
        <div className="relative z-20 pb-2 sm:pb-3 opacity-40 text-[9px] font-mono tracking-widest text-gray-400 uppercase">
          PMB MOBILE EXPERIENCE
        </div>
      </section>
    </div>
  );
}
