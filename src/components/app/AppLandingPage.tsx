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
  const [showIntro, setShowIntro] = useState(true);

  // Scene state: "welcome" (Image 1) | "login" (Image 2) | "enter" (Image 3) | "loading" | "dashboard"
  const [scene, setScene] = useState<"welcome" | "login" | "enter" | "loading" | "dashboard">(
    initialUser ? "enter" : "welcome"
  );
  const [currentUser, setCurrentUser] = useState<AppUser | null>(initialUser || null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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
    return (
      <AppHomeDashboard
        initialData={dashboardData}
        onLogout={() => {
          setShowIntro(false);
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
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#070709] text-white select-none overflow-hidden font-montserrat">
      {/* Cinematic Intro: 5s PMB Logo -> 3s Black Screen -> SAMA Studio */}
      {showIntro && <CinematicIntro onComplete={() => setShowIntro(false)} />}

      {/* ═══ LOADING SCENE (EA FC / eFootball Style) ═══ */}
      {scene === "loading" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070709] select-none animate-fadeIn">
          {/* Ambient Stadium Glow */}
          <div className="absolute w-80 h-80 rounded-full bg-[#e9c349]/15 blur-3xl pointer-events-none" />

          {/* Center 3D Lion with Pulsing Gold Ring */}
          <div className="relative mb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#e9c349] bg-black p-1 shadow-[0_0_50px_rgba(233,195,73,0.5)] flex items-center justify-center">
              <img
                src="/branding/pmb-official-logo.png"
                alt="PMB"
                className="w-full h-full object-contain rounded-full animate-pulse"
              />
            </div>
            <div className="absolute -inset-2 rounded-full border border-[#e9c349]/40 animate-ping pointer-events-none" style={{ animationDuration: "2s" }} />
          </div>

          {/* Text */}
          <h2 className="font-montserrat text-base sm:text-lg font-black uppercase tracking-[0.25em] text-white">
            PMB LEAGUE MANAGER
          </h2>
          <p className="font-jetbrains text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-[#e9c349] mt-2 animate-pulse">
            SYNCING MATCHDAYS & LIVE MERCATO...
          </p>

          {/* Progress Bar */}
          <div className="w-48 sm:w-64 h-1.5 bg-white/10 rounded-full overflow-hidden mt-6">
            <div className="h-full bg-gradient-to-r from-[#e9c349] via-amber-300 to-[#e9c349] w-full animate-pulse" />
          </div>
        </div>
      )}

      {/* ═══ PMB LUXURY 3D APP PORTAL (Scenes 1, 2, 3) ═══ */}
      <section
        className={`relative w-full h-full flex flex-col justify-between items-center overflow-hidden transition-all duration-700 ${
          scene === "enter" ? "cursor-pointer" : ""
        }`}
        onClick={scene === "enter" ? handleEnterApp : undefined}
      >
        {/* Background Artwork Layer */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
          style={{
            backgroundImage:
              scene === "welcome"
                ? "url('/landing/pmb-welcome-bg.jpg')"
                : scene === "login"
                ? "url('/landing/pmb-login-bg.jpg')"
                : "url('/landing/pmb-enter-bg.png')",
            backgroundColor: "#070709",
          }}
        />

        {/* Subtle Dark Backdrop for Form in Login Mode */}
        {scene === "login" && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none" />
        )}

        {/* Top Header Bar */}
        <div className="relative z-20 w-full flex justify-between items-center px-6 py-6 pt-8">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#e9c349] animate-pulse" />
            <span className="font-jetbrains text-[10px] tracking-[0.2em] text-gray-300 font-bold uppercase">
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
              className="font-jetbrains text-[11px] tracking-wider text-gray-400 hover:text-white px-3.5 py-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur-md transition cursor-pointer"
            >
              ✕ CANCEL
            </button>
          )}
        </div>

        {/* ─── SCENE 1: WELCOME SCREEN (IMAGE 1) ─── */}
        {scene === "welcome" && (
          <div className="relative z-20 my-auto flex flex-col items-center justify-center pt-36 sm:pt-48 md:pt-56">
            {/* Interactive "LOG IN >" Pill Button */}
            <button
              type="button"
              onClick={() => setScene("login")}
              className="group relative inline-flex items-center justify-center gap-3 px-12 py-3 rounded-full border-2 border-[#e9c349]/90 bg-black/75 hover:bg-black/95 backdrop-blur-md text-[#e9c349] hover:text-white font-montserrat text-sm sm:text-base font-extrabold tracking-[0.25em] uppercase shadow-[0_0_35px_rgba(233,195,73,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_55px_rgba(233,195,73,0.7)] cursor-pointer active:scale-95"
            >
              <span>LOG IN</span>
              <span className="text-xs transition-transform duration-200 group-hover:translate-x-1">›</span>
            </button>
          </div>
        )}

        {/* ─── SCENE 2: LOGIN FORM (IMAGE 2) ─── */}
        {scene === "login" && (
          <div
            className="relative z-30 my-auto flex flex-col items-center justify-center w-full px-4 pt-28 sm:pt-40 md:pt-48"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-[380px] rounded-3xl border border-white/15 bg-[#0e0e11]/95 p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_30px_rgba(233,195,73,0.15)] backdrop-blur-2xl animate-fadeIn">
              
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-center text-xs font-bold text-red-400">
                    {loginError}
                  </div>
                )}

                {/* USERNAME */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none text-sm">
                    👤
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="USERNAME"
                    className="w-full rounded-xl border border-white/10 bg-[#08080a] py-3 pl-10 pr-4 font-montserrat text-xs font-bold tracking-wider text-white placeholder-gray-500 focus:border-[#e9c349] focus:outline-none focus:ring-1 focus:ring-[#e9c349]/50 transition-all uppercase"
                  />
                </div>

                {/* PASSWORD */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none text-sm">
                    🔒
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="PASSWORD"
                    className="w-full rounded-xl border border-white/10 bg-[#08080a] py-3 pl-10 pr-4 font-montserrat text-xs font-bold tracking-wider text-white placeholder-gray-500 focus:border-[#e9c349] focus:outline-none focus:ring-1 focus:ring-[#e9c349]/50 transition-all uppercase"
                  />
                </div>

                {/* GOLD LOG IN BUTTON */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-xl py-3 font-montserrat text-sm font-black uppercase tracking-widest text-[#0a0a0a] transition-all duration-300 shadow-[0_4px_25px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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

        {/* ─── SCENE 3: ENTER SCREEN (IMAGE 3) ─── */}
        {scene === "enter" && (
          <div className="relative z-20 my-auto flex flex-col items-center justify-center pt-36 sm:pt-48 md:pt-56">
            {/* Pulsing "CLICK TO ENTER" sentence directly under PMB MANAGER */}
            <div className="flex flex-col items-center text-center gap-2 select-none animate-pulse">
              <div className="flex items-center gap-3">
                <span className="w-6 sm:w-12 h-[1.5px] bg-gradient-to-r from-transparent to-[#e9c349]" />
                <span className="font-montserrat text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-[0.35em] text-[#e9c349] drop-shadow-[0_0_25px_rgba(233,195,73,0.9)]">
                  CLICK TO ENTER
                </span>
                <span className="w-6 sm:w-12 h-[1.5px] bg-gradient-to-l from-transparent to-[#e9c349]" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono tracking-[0.28em] text-gray-300 uppercase drop-shadow">
                PRESS ANYWHERE ON SCREEN TO ENTER PORTAL
              </span>
            </div>
          </div>
        )}

        {/* Bottom Left Manager Badge (Scene 3 - Image 3) */}
        {scene === "enter" && (
          <div className="absolute bottom-6 left-6 z-30 flex items-center gap-3 rounded-2xl border border-[#e9c349]/50 bg-black/85 px-4 py-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-md pointer-events-none animate-fadeIn">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-pmb-gold/50 bg-black p-1 shadow-gold">
              <img
                src="/branding/pmb-official-logo.png"
                alt="Lion"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-black uppercase tracking-wider text-white">
                {currentUser?.clubName || "FAR RABAT"}
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#e9c349]">
                {currentUser?.role === "ADMINISTRATOR" ? "ADMINISTRATOR" : "MANAGER"}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Spacer */}
        <div className="relative z-20 pb-6 opacity-40 text-[9px] font-mono tracking-widest text-gray-400 uppercase">
          PMB MOBILE EXPERIENCE
        </div>
      </section>
    </div>
  );
}
