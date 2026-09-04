"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CinematicIntro } from "@/components/CinematicIntro";

/* ─── IMAGE URLS ─── */
const HERO_BG_DESKTOP =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCqY2z_MW-35rCGnUwryX9dUdUbrzciIXleNGlqb9X7LwH5LCJ0luVTcERhM6M_vm-O1FpsOALoYT_r2mBQqjtZWo0omwjzS8Fx165gRtu1lDpMACAduoybTz84ucn8xh1VX9t53I-RD0bqBLTEN39NkhYT7zY7ezXoSX-FVqxcRzbNehix49uKJyw7WGhQcr1bZl8LICi74ajjqh_UBmmwa6ept85OT-2tf-RP_71G6x2-_wEZHaEU";

const TRANSITION_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAZo7I8bw9WwFfV9_WgAKxvFDozQUjZQg7xJcZokCl35Dx8dUfh4tpZiSEHCSHMLF07dyf4LKO-u1mHktgfnVeUmQJjae_fJ5ra4qbYusrl9-h2-RMhotHBeMnsl3FKmFKuLtoTX9MRHoSM5lxBglvV-LAvrdxhZnKIsEIlgEpF03nMDuOyOT1mZMCUsDuosd_Xcj-AdxrggGTKB-os5-0tpeiNTb62uaLu0ejAOyTX4HGIDNs90j3b";

const MARWANE_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAuuNH4bmdt-J8BaSALajxMU41q0e5yhV3dxfzaex1BXWobcgCt6NGa2jLEvWu8GZkONBLq2m9tM66_L5yLuYcpDX5Y4b7cww0xH6QQImdf-xfhqx-NYFBYABr52FdGnIBlYOQKaeFucJBJgTTmxJSTb-Ri-SjUV-xCBPExjeQfiZKz6UDE7qqLaSLth_U6TIM-tb0bm4oz2kwgkKjFga-0WbV3RQDQo2NQJMsHOHj3Z9Qw3nRRzc9QykE4M0C2fWDjPQ";

const HAMZA_BEN_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBIBAo-w6kdW-ieSFIJhWLVTQSFp4yHP7uEnTMwlg3qY6OyJXYBCP-5OU0eaY01Kgl89zMPEG78nFIUZn1gbN4fwag5PIdDvVvIaPXCIvrBSNEo55LSb1uwwbxh28gu5dqz-DvYBDBxuBDpkKYIWBVsyxSUYja_YReNoiW_WAgUb_PqOcTS0T4fRR6uY_diwXZwT6eO8K7CkkBDl9F-MmepEfvRrL_pDu91LB9TyS421vQ7sf3eHXa7XkhV2RbxhE8p9w";

const HAMZA_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB1-0y9x8fAfjeKQ3rGIfPPXL4TF8aOSaJ1-0d_xSrV5dHE3CwOJVcKWZq8thzpQnZTIaxIT8861nhweLHi9YcJ-b5ADOI3p3BZtvwXux4A1lz9w6a9KmBpMa2uRbFsYDRfNwrauZsUk7whKFHZjdgXrc3n0nMByfAcXIseReShZnLG6KnUa0-MlzCr7fjnXs4UVNw6HsNFIfnprz0TGtE91iEYK13OO_KCsIvM8VnmybrNHd0EmCTJvf7tIDVubnUXGw";

const OUSSAMA_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCexvrpixFQjvdJoj1ag5-o-t09LHcbp0zjghxyp-DLoguKEiox8YFHS3UJvzYJo-dWTLJvv2ziz7G965Dg1I8PH4UywXAmvclcyFN8ID03V2-FqxEb5JSJlcTRwE-kWRMnkiry3AkG06FB2-TAsG_8qgg7EkEI7hhbSeUiVluI66JzKRyuM2-mPuTWDwcb8Vo3MGZoXQG5RY6ONpoVXnCEeFzm5w1Sz5SK5VWMw01lJOYzDyKGjAk0la-khsfG6uSmpA";

const AMINE_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBg-gIyDVBhRDbruG8g9upwbQ2-0OcNv1lez7ep-bs1sAo90TpcyyL5-X3bDT4HZrNDgOqVubBOuwGw6uNwINhclKvVGmIkB75breRqDyOivEoswwm13VmX3F4tYD9k_8x0T_thONBB9QBIjTPHaL8wpDCiX1aH3ChUNqDSoh8c3RAQpUkhvocZ_niEh2RKvotUNjp7Pu0gSVoD1TO9eEeR-ofQa2aTIrCF3CauPxMwncOAkqgi_1xT_t5CcLTHCfh7BQ";

const WALED_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCyeK8XDzzzEH7JynrPg02Z-90uR6hh9_ClluVoLyoVxO4z-YRAL3S4N3KPGPSho5haGhj1i8cVqp7YGmg-_odBkmZWshFm0gL6Wm_4hhuU4GU0JhIEiEvQg5j3e_Bo-uDxsPF-wdCmJY9s3pnXuZLDspCzJzuwLOEbAJU92p6qBKqjy2QOCVBzmBSD03EYsARUcCw68U4LvxoB8NZEi0Jq2ieBfZMLaJSipMEpq5ocrQNXzRmFIQ1QaEcuzB-0YLYsrA";

const ALAE_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC-EdBxlSgzDsMwMNF1rrz5RdSdYmS8xOJL7E9seY_ohpBUtciirkX3mnNZ9HzSKaHTPToErx0ViX8mI3RGLHGJmO3C4MtVGG9g9cqeTluftNIprWh5lk7sDUXDAMDfe9Y8IRUzEV8dp5zdtpnzGHJuJJk3wtAXduZqRc-psXIiURFGDhq6S8maU5sP_8hHef0rmOXw7h2KnmxmH4wYFXyGyYuDknN9_HibKrJ9AMHEdKnYDGNuf9kChmFjff-XKegyEw";

const STAFF = [
  {
    name: "HAMZA BEN",
    title: "PMB FOUNDER • SOCIAL MEDIA",
    number: "02 — MEDIA & COMMUNITY",
    photo: HAMZA_BEN_PHOTO,
    desc: "Founder of PMB and responsible for the organization's social media presence and community.",
  },
  {
    name: "HAMZA",
    title: "SECOND COACH • TRANSFERS",
    number: "03 — SPORTING & TRANSFERS",
    photo: HAMZA_PHOTO,
    desc: "Responsible for coaching structure and managing player transfers in PMB.",
  },
  {
    name: "OUSSAMA",
    title: "THIRD COACH",
    number: "04 — COACHING STAFF",
    photo: OUSSAMA_PHOTO,
    desc: "Part of the PMB coaching staff, supporting player tactical development.",
  },
];

const MANAGERS = [
  { name: "AMINE", role: "Premier League Manager", photo: AMINE_PHOTO, featured: false },
  { name: "WALED", role: "VIP League Manager", photo: WALED_PHOTO, featured: true },
  { name: "ALAE", role: "LaLiga Manager", photo: ALAE_PHOTO, featured: false },
];

const STATS = [
  { value: "7", label: "Leagues" },
  { value: "PRO", label: "Competitive" },
  { value: "100%", label: "Moroccan" },
  { value: "26/27", label: "Season-Based" },
];

export function LandingPage({
  initialUser,
}: {
  initialUser?: {
    id?: string;
    username?: string;
    role?: "ADMINISTRATOR" | "CLUB_MANAGER";
    clubId?: string | null;
    clubName?: string | null;
    leagueName?: string | null;
  } | null;
}) {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);

  // Scene state: "welcome" (Image 1) | "login" (Image 2) | "enter" (Image 3)
  const [scene, setScene] = useState<"welcome" | "login" | "enter">(
    initialUser ? "enter" : "welcome"
  );
  const [currentUser, setCurrentUser] = useState(initialUser || null);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Enter click transition
  const [isEntering, setIsEntering] = useState(false);

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

      sessionStorage.setItem("pmb-music-started", "true");
      window.dispatchEvent(new Event("pmb-start-music"));

      const sessionRes = await fetch("/api/auth/session").then((r) => r.json());
      const user = sessionRes?.user;

      setCurrentUser(user || { role: "CLUB_MANAGER", clubName: "FAR RABAT" });
      setIsLoggingIn(false);
      setScene("enter");
    } catch (err) {
      setLoginError("Login failed. Please try again.");
      setIsLoggingIn(false);
    }
  }

  function handleEnterApp() {
    if (isEntering) return;
    setIsEntering(true);
    const destination =
      currentUser?.role === "ADMINISTRATOR"
        ? "/admin/dashboard"
        : "/manager/dashboard";
    setTimeout(() => {
      router.push(destination);
    }, 380);
  }

  return (
    <div className="landing-page" style={{ background: "#121414", color: "#e2e2e2", fontFamily: "'Inter', sans-serif" }}>
      {showIntro && <CinematicIntro onComplete={() => setShowIntro(false)} />}

      {/* ═══ DESKTOP NAV ═══ */}
      <nav className="fixed top-0 w-full z-40 hidden md:block" style={{ background: "rgba(18,20,20,0.8)", backdropFilter: "blur(16px)", borderTop: "2px solid #e9c349" }}>
        <div className="flex justify-between items-center mx-auto" style={{ maxWidth: 1200, padding: "12px 32px" }}>
          <span className="font-montserrat" style={{ fontSize: 26, fontWeight: 800, color: "#e2e2e2" }}>PMB</span>
          <div className="flex items-center" style={{ gap: 20 }}>
            {["ABOUT", "LEAGUES", "PACKS", "ADMINISTRATION"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="font-jetbrains" style={{ fontSize: 11, letterSpacing: "0.15em", fontWeight: 500, color: item === "PACKS" ? "#e9c349" : "#c4c7c7", textDecoration: "none", padding: "6px 12px" }}>{item}</a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setScene("login")}
            className="font-jetbrains gold-glow cursor-pointer"
            style={{ fontSize: 11, letterSpacing: "0.15em", fontWeight: 700, color: "#e9c349", padding: "6px 20px", border: "1px solid rgba(233,195,73,0.4)", borderRadius: 4, background: "transparent" }}
          >
            LOGIN
          </button>
        </div>
      </nav>

      {/* ═══ MOBILE NAV ═══ */}
      <header className="fixed top-0 w-full z-40 md:hidden" style={{ background: "rgba(18,20,20,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid #282a2b" }}>
        <div className="flex justify-between items-center" style={{ padding: "12px 16px" }}>
          <span className="font-montserrat" style={{ fontSize: 20, fontWeight: 800 }}>PMB</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScene("login")}
              className="font-jetbrains text-[#e9c349] text-xs font-bold"
            >
              LOGIN
            </button>
            <button onClick={() => setMobileMenu(!mobileMenu)} style={{ color: "#c4c7c7", background: "none", border: "none", cursor: "pointer", fontSize: 22 }}>{mobileMenu ? "✕" : "☰"}</button>
          </div>
        </div>
        {mobileMenu && (
          <div className="flex flex-col items-center gap-3 pb-4" style={{ borderTop: "1px solid #444748" }}>
            {["ABOUT", "LEAGUES", "PACKS", "ADMINISTRATION"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenu(false)} className="font-jetbrains" style={{ fontSize: 11, letterSpacing: "0.15em", color: item === "PACKS" ? "#e9c349" : "#c4c7c7", textDecoration: "none", padding: "6px 0" }}>{item}</a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenu(false);
                setScene("login");
              }}
              className="font-jetbrains gold-glow"
              style={{ fontSize: 11, letterSpacing: "0.15em", color: "#e9c349", padding: "6px 20px", border: "1px solid rgba(233,195,73,0.3)", borderRadius: 4, background: "transparent" }}
            >
              LOGIN
            </button>
          </div>
        )}
      </header>

      {/* ═══ PMB LUXURY 3D HERO PORTAL (Scenes 1, 2, 3) ═══ */}
      <section
        className={`relative w-full h-[100dvh] min-h-[660px] flex flex-col justify-between items-center overflow-hidden select-none transition-all duration-700 ${
          isEntering ? "scale-105 opacity-0" : "scale-100 opacity-100"
        } ${scene === "enter" ? "cursor-pointer" : ""}`}
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

        {/* Top Floating Badge Bar */}
        <div className="relative z-20 w-full flex justify-between items-center px-6 sm:px-12 pt-20 md:pt-24 pb-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#e9c349] animate-pulse" />
            <span className="font-jetbrains text-[10px] tracking-[0.2em] text-gray-300 font-bold uppercase">
              PMB 2026/27
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

        {/* Bottom Center Scroll Hint (When in Welcome mode) */}
        {scene === "welcome" && (
          <div className="relative z-20 pb-6 flex flex-col items-center opacity-60 hover:opacity-100 transition animate-bounce">
            <span className="font-jetbrains text-[9px] tracking-widest text-gray-400 uppercase">
              SCROLL FOR LEAGUES & INFO
            </span>
            <span className="text-[#e9c349] text-xs mt-1">▼</span>
          </div>
        )}
      </section>

      {/* ═══ ABOUT / ECOSYSTEM ═══ */}
      <section id="about" className="relative overflow-hidden" style={{ background: "#0c0f0f", padding: "64px 0" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px" }}>
          <div className="flex justify-center mb-4">
            <div style={{ width: 1, height: 24, background: "linear-gradient(to bottom, #e9c349, transparent)" }} />
          </div>

          <div style={{ marginBottom: 40, textAlign: "center" }}>
            <h2 className="font-montserrat" style={{ fontSize: "clamp(22px, 4vw, 36px)", lineHeight: 1.2, letterSpacing: "-0.02em", fontWeight: 800, textTransform: "uppercase", marginBottom: 12 }}>
              MORE THAN A LEAGUE. <span style={{ color: "#e9c349" }}>A FOOTBALL ECOSYSTEM.</span>
            </h2>
            <div style={{ height: 4, width: 64, background: "#e9c349", margin: "0 auto" }} />
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span className="font-montserrat" style={{ fontSize: 24, fontWeight: 800, display: "block" }}>PMB</span>
                <span className="font-jetbrains" style={{ fontSize: 11, letterSpacing: "0.15em", color: "#e9c349" }}>PES MOROCCAN BOURGEOIS</span>
              </div>
              <p className="font-inter" style={{ fontSize: 13, lineHeight: "22px", color: "#c9c6c5", opacity: 0.85 }}>
                PMB is the premier destination for competitive eFootball in Morocco. We bridge the gap between casual play and professional esports through a meticulously organized league system.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {STATS.map((stat, i) => (
                <div key={i} style={{ borderLeft: "2px solid rgba(233,195,73,0.4)", paddingLeft: 14, paddingTop: 4, paddingBottom: 4 }}>
                  <div className="font-montserrat" style={{ fontSize: 22, fontWeight: 800, color: "#e9c349", marginBottom: 2 }}>{stat.value}</div>
                  <div className="font-jetbrains" style={{ fontSize: 10, letterSpacing: "0.12em", color: "#c4c7c7", textTransform: "uppercase" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ADMINISTRATION SECTION (MINIMIZED & COMPACT) ═══ */}
      <section id="administration" className="relative overflow-hidden" style={{ background: "#121414", padding: "64px 0" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(233,195,73,0.04) 0%, transparent 70%)" }} />

        <div className="relative" style={{ zIndex: 10, maxWidth: 960, margin: "0 auto", padding: "0 20px" }}>
          {/* Header */}
          <div className="text-center" style={{ marginBottom: 48 }}>
            <div className="inline-block font-jetbrains" style={{ padding: "3px 12px", marginBottom: 12, border: "1px solid rgba(233,195,73,0.3)", background: "rgba(26,28,28,0.5)", fontSize: 10, letterSpacing: "0.2em", color: "#e9c349", textTransform: "uppercase" }}>
              PMB ADMINISTRATION
            </div>
            <h2 className="font-montserrat" style={{ fontSize: "clamp(24px, 4vw, 36px)", lineHeight: 1.15, letterSpacing: "-0.02em", fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>
              THE PEOPLE BEHIND PMB
            </h2>
            <p className="font-inter" style={{ fontSize: 13, color: "#c9c6c5", opacity: 0.8, maxWidth: 520, margin: "0 auto" }}>
              The team responsible for building, organizing and managing the PMB competitive ecosystem.
            </p>
          </div>

          {/* ─── FOUNDER: MARWANE (COMPACT SIZED) ─── */}
          <div className="flex flex-col sm:flex-row items-center gap-8 mx-auto p-6 rounded-2xl border border-white/10 bg-black/40 shadow-xl" style={{ maxWidth: 760, marginBottom: 48 }}>
            {/* Photo Container */}
            <div className="shrink-0 relative overflow-hidden rounded-xl border border-[#e9c349]/40 gold-glow" style={{ width: 220, height: 250 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="MARWANE" src={MARWANE_PHOTO} className="landing-team-photo" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%" }} />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span style={{ width: 24, height: 1, background: "#e9c349" }} />
                <span className="font-jetbrains" style={{ fontSize: 10, letterSpacing: "0.2em", color: "#e9c349", fontWeight: 700 }}>01 — LEADERSHIP</span>
              </div>
              <h4 className="font-montserrat" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#ffffff", textTransform: "uppercase" }}>
                MARWANE
              </h4>
              <p className="font-jetbrains" style={{ fontSize: 10, letterSpacing: "0.12em", color: "#c4c7c7", textTransform: "uppercase" }}>
                FIRST PRESIDENT &amp; LEADER • MAIN COACH
              </p>
              <p className="font-inter" style={{ fontSize: 12, lineHeight: "20px", color: "#a1a1aa", paddingTop: 4 }}>
                Founder of the PMB leadership structure and the person responsible for leading the organization and its competitive vision. He also serves as the main coach of the PMB team.
              </p>
            </div>
          </div>

          {/* ─── STAFF 3-COLUMN (COMPACT GRID) ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mx-auto" style={{ maxWidth: 860, marginBottom: 48 }}>
            {STAFF.map((member) => (
              <div key={member.name} className="group p-4 rounded-xl border border-white/5 bg-black/30 hover:border-[#e9c349]/30 transition-all">
                <div className="relative overflow-hidden rounded-lg mb-3 border border-white/10" style={{ height: 230 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={member.name} src={member.photo} className="landing-team-photo" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
                </div>
                <div className="space-y-1">
                  <h5 className="font-jetbrains" style={{ fontSize: 9, letterSpacing: "0.12em", color: "#e9c349", textTransform: "uppercase" }}>{member.number}</h5>
                  <h6 className="font-montserrat" style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", textTransform: "uppercase" }}>{member.name}</h6>
                  <p className="font-jetbrains" style={{ fontSize: 9, letterSpacing: "0.1em", color: "#a1a1aa", textTransform: "uppercase" }}>{member.title}</p>
                  <p className="font-inter" style={{ fontSize: 11, lineHeight: "16px", color: "#71717a", marginTop: 4 }}>{member.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Flow strip */}
          <div className="w-full py-4 border-t border-b border-white/10 text-center" style={{ marginBottom: 48 }}>
            <div className="flex items-center justify-center flex-wrap gap-4 font-jetbrains" style={{ fontSize: 10, letterSpacing: "0.2em", color: "#a1a1aa", textTransform: "uppercase" }}>
              <span>VISION</span><span style={{ color: "#e9c349" }}>→</span>
              <span>COMPETITION</span><span style={{ color: "#e9c349" }}>→</span>
              <span>OPERATIONS</span><span style={{ color: "#e9c349" }}>→</span>
              <span>MEDIA</span><span style={{ color: "#e9c349" }}>→</span>
              <span>DEVELOPMENT</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LEAGUE MANAGERS (COMPACT) ═══ */}
      <section id="leagues" className="relative overflow-hidden" style={{ background: "#0c0f0f", padding: "64px 0", borderTop: "1px solid rgba(233,195,73,0.1)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px" }}>
          <div className="text-center" style={{ marginBottom: 36 }}>
            <h2 className="font-montserrat" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.1em", color: "#e9c349", textTransform: "uppercase", marginBottom: 6 }}>PMB ADMINISTRATION</h2>
            <p className="font-jetbrains" style={{ fontSize: 10, letterSpacing: "0.15em", color: "#a1a1aa", textTransform: "uppercase" }}>The team behind the competition.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {MANAGERS.map((m) => (
              <div key={m.name} className="relative rounded-xl overflow-hidden border border-white/10 group hover:border-[#e9c349]/50 transition-all">
                <div style={{ height: 210, position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={m.name} src={m.photo} className="landing-team-photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, #121414 15%, transparent 80%)" }} />
                  <div className="absolute bottom-0 left-0 w-full p-3.5">
                    <h3 className="font-montserrat" style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "#e9c349", textTransform: "uppercase", marginBottom: 2 }}>{m.name}</h3>
                    <p className="font-jetbrains" style={{ fontSize: 9, letterSpacing: "0.12em", color: "#e2e2e2", textTransform: "uppercase" }}>{m.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TOURNAMENT PACKS & PRICING ═══ */}
      <section id="packs" className="relative overflow-hidden" style={{ background: "#0c0f0f", padding: "72px 0", borderTop: "1px solid rgba(233,195,73,0.15)", borderBottom: "1px solid rgba(233,195,73,0.15)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px" }}>
          
          <div className="text-center" style={{ marginBottom: 48 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3" style={{ background: "rgba(233,195,73,0.1)", border: "1px solid rgba(233,195,73,0.3)" }}>
              <span style={{ color: "#e9c349", fontSize: 13 }}>🏆</span>
              <span className="font-jetbrains text-xs uppercase tracking-widest text-[#e9c349] font-bold">TOURNAMENT PACKS • باقات تنظيم البطولات</span>
            </div>
            <h2 className="font-montserrat" style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#f4f4f5", textTransform: "uppercase", marginBottom: 10 }}>
              POWER YOUR TOURNAMENT
            </h2>
            <p className="font-inter text-sm max-w-xl mx-auto" style={{ color: "#a1a1aa", lineHeight: "22px" }}>
              اختر الباقة المناسبة لبطولتك (FIFA / EA FC, eFootball, أو دوريات كرة القدم المصغرة) مع منصة متكاملة ومزادات وانتقالات حية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* ─── PACK 1: MINI PACK ─── */}
            <div className="rounded-2xl p-6 flex flex-col justify-between transition-all hover:translate-y-[-4px]" style={{ background: "#141718", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-jetbrains text-xs uppercase tracking-wider text-zinc-400 font-bold">STARTER • الباقة البسيطة</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-jetbrains">8-12 Teams</span>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-montserrat text-3xl font-extrabold text-white">30 DH</span>
                    <span className="text-xs text-zinc-500 font-jetbrains">/ بطولة (~$3)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-inter">مثالية للدوريات السريعة والبطولات الكلاسيكية.</p>
                </div>
                <hr className="border-zinc-800 my-4" />
                <ul className="space-y-2.5 text-xs text-zinc-300 font-inter mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> جدول الترتيب المباشر (Standings)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> جدول المباريات والنتائج لكل جولة
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> قائمة الهدافين والإحصائيات
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> لوحة تحكم للمنظم لتسجيل النتائج
                  </li>
                </ul>
              </div>
              <a
                href="https://wa.me/?text=Hello%2C%20I%20want%20to%20order%20the%20Starter%20Pack%20(30%20DH)%20for%20my%20tournament"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-2.5 rounded-lg font-jetbrains text-xs font-bold uppercase tracking-wider transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#f4f4f5" }}
              >
                احجز الباقة (30 DH)
              </a>
            </div>

            {/* ─── PACK 2: PRO MASTER LEAGUE (FEATURED) ─── */}
            <div className="rounded-2xl p-6 flex flex-col justify-between relative transition-all hover:translate-y-[-4px]" style={{ background: "#181b1c", border: "2px solid #e9c349", boxShadow: "0 0 30px rgba(233,195,73,0.15)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full font-jetbrains text-[10px] font-extrabold uppercase tracking-widest text-black" style={{ background: "#e9c349" }}>
                ⭐ MOST POPULAR • الأكثر طلباً
              </div>
              <div>
                <div className="flex justify-between items-center mb-4 mt-1">
                  <span className="font-jetbrains text-xs uppercase tracking-wider text-[#e9c349] font-bold">PRO • الماستر ليغ والمزادات</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-jetbrains" style={{ background: "rgba(233,195,73,0.15)", color: "#e9c349" }}>Full Season</span>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-montserrat text-3xl font-extrabold text-[#e9c349]">70 DH</span>
                    <span className="text-xs text-zinc-400 font-jetbrains">/ بطولة (~$7)</span>
                  </div>
                  <p className="text-xs text-[#e9c349]/90 mt-1 font-inter font-medium">
                    (تطلع بأقل من <span className="font-bold underline">5 دراهم</span> على كل لاعب في بطولة 15 فريق!)
                  </p>
                </div>
                <hr className="border-zinc-700/60 my-4" />
                <ul className="space-y-2.5 text-xs text-zinc-200 font-inter mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> <strong>كل مميزات الباقة البسيطة</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> <strong>مزادات حية للاعبين (Live Bidding)</strong> بعد تنازلي
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> <strong>سوق الانتقالات والميزانيات والإعارات</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> <strong>كأس العرش / الأدوار الإقصائية (Knockout)</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> تسجيل البطاقات وصناع اللعب ورجل المباراة
                  </li>
                </ul>
              </div>
              <a
                href="https://wa.me/?text=Hello%2C%20I%20want%20to%20order%20the%20Master%20League%20Pro%20Pack%20(70%20DH)%20for%20my%20tournament"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-3 rounded-lg font-jetbrains text-xs font-extrabold uppercase tracking-wider text-black transition-all hover:brightness-110 shadow-lg"
                style={{ background: "linear-gradient(135deg, #e9c349, #d4a827)" }}
              >
                احجز باقة Pro الآن (70 DH)
              </a>
            </div>

            {/* ─── PACK 3: VIP ULTIMATE ─── */}
            <div className="rounded-2xl p-6 flex flex-col justify-between transition-all hover:translate-y-[-4px]" style={{ background: "#141718", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-jetbrains text-xs uppercase tracking-wider text-zinc-400 font-bold">VIP • الباقة الشاملة</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-jetbrains">Communities</span>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-montserrat text-3xl font-extrabold text-white">110 DH</span>
                    <span className="text-xs text-zinc-500 font-jetbrains">/ بطولة (~$11)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-inter">المثالية لمراكز الألعاب والبطولات الكبرى.</p>
                </div>
                <hr className="border-zinc-800 my-4" />
                <ul className="space-y-2.5 text-xs text-zinc-300 font-inter mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> <strong>كل مميزات باقة Pro كاملة</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> <strong>تشكيلة الأسبوع (TOTW)</strong> مع ترقيات اللاعبين
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> <strong>منصة تواصل وشات خاص بين المدربين</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> استطلاعات وتصويت أفضل مدرب في الشهر
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#e9c349] font-bold">✓</span> إضافة شعار بطولتكم ومساعدة كاملة في الإعداد
                  </li>
                </ul>
              </div>
              <a
                href="https://wa.me/?text=Hello%2C%20I%20want%20to%20order%20the%20VIP%20Ultimate%20Pack%20(110%20DH)%20for%20my%20tournament"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-2.5 rounded-lg font-jetbrains text-xs font-bold uppercase tracking-wider transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#f4f4f5" }}
              >
                احجز باقة VIP (110 DH)
              </a>
            </div>

          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-500 font-jetbrains">
              💡 Need custom features or permanent ownership for your organization? Contact us directly.
            </p>
          </div>

        </div>
      </section>

      {/* ═══ CTA: LEAGUE MANAGER ═══ */}
      <section className="relative w-full flex items-center justify-center overflow-hidden" style={{ height: 420, background: "#1e2020" }}>
        <div className="absolute inset-0" style={{ backgroundImage: `url('${TRANSITION_BG}')`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.25, filter: "blur(3px)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #121414, rgba(18,20,20,0.85), transparent)" }} />

        <div className="relative text-center" style={{ zIndex: 20, maxWidth: 640, padding: "0 20px" }}>
          <h4 className="font-jetbrains" style={{ fontSize: 10, letterSpacing: "0.2em", color: "#e9c349", textTransform: "uppercase", marginBottom: 10 }}>THE ENGINE OF THE COMPETITION</h4>
          <h2 className="font-montserrat" style={{ fontSize: "clamp(26px, 5vw, 42px)", lineHeight: 1.1, fontWeight: 800, textTransform: "uppercase", marginBottom: 16 }}>
            PMB LEAGUE MANAGER
          </h2>
          <p className="font-inter" style={{ fontSize: 13, lineHeight: "22px", color: "#c9c6c5", opacity: 0.9, marginBottom: 28 }}>
            From fixtures and results to standings, points, clubs, players and transfers — the League Manager brings the entire PMB competition together.
          </p>
          <Link href="/login" className="group inline-flex items-center gap-3 gold-glow" style={{ background: "#e9c349", color: "#0a0a0a", padding: "10px 24px", borderRadius: 4, textDecoration: "none", fontWeight: 800, fontSize: 12 }}>
            <span className="font-jetbrains" style={{ letterSpacing: "0.12em" }}>ENTER PMB PORTAL</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: "#0c0f0f", borderTop: "1px solid rgba(68,71,72,0.2)", padding: "32px 20px" }}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4" style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="flex items-center gap-3">
            <span className="font-montserrat" style={{ fontSize: 18, fontWeight: 800, color: "#e2e2e2" }}>PMB</span>
            <span className="font-jetbrains" style={{ fontSize: 9, letterSpacing: "0.15em", color: "#71717a" }}>EST. 2020</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowIntro(true)}
              className="font-jetbrains text-[10px] tracking-wider text-zinc-500 hover:text-[#e9c349] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>🎬</span>
              <span>REPLAY INTRO</span>
            </button>
            <p className="font-jetbrains" style={{ fontSize: 9, letterSpacing: "0.12em", color: "#71717a" }}>© 2026 PMB — PES MOROCCAN BOURGEOIS. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
