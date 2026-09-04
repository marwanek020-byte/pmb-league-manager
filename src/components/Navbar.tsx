"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

export function Navbar({
  homeHref,
  rightLabel,
  extra,
}: {
  homeHref: string;
  rightLabel: string;
  /** Optional extra content shown between rightLabel and the sign-out button - e.g. the manager's budget indicator. Admin usage omits this. */
  extra?: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = homeHref.startsWith("/admin");

  const socialHref = isAdmin ? "/admin/social" : "/manager/social";
  const auctionsHref = isAdmin ? "/admin/auctions" : "/manager/auctions";
  const competitionHref = isAdmin ? "/admin/competition" : "/manager/competition";
  const transfersHref = isAdmin ? "/admin/transfers" : "/manager/transfers";
  const playersHref = isAdmin ? "/admin/clubs" : "/manager/players";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-pmb-border bg-pmb-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href={homeHref}>
              <Logo size="sm" />
            </Link>

            {/* Desktop Navigation Bar (Unchanged) */}
            <nav className="hidden md:flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              {isAdmin ? (
                <>
                  <Link href="/admin/dashboard" className="text-gray-400 hover:text-pmb-gold transition">
                    Dashboard
                  </Link>
                  <Link href="/admin/clubs" className="text-gray-400 hover:text-pmb-gold transition">
                    Clubs
                  </Link>
                  <Link href="/admin/competition" className="text-gray-400 hover:text-pmb-gold transition">
                    Competition
                  </Link>
                  <Link href="/admin/transfers" className="text-gray-400 hover:text-pmb-gold transition">
                    Transfers
                  </Link>
                  <Link href="/admin/auctions" className="flex items-center gap-1.5 text-pmb-gold hover:text-white transition">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Live Auctions
                  </Link>
                  <Link href="/admin/free-agents" className="flex items-center gap-1 text-emerald-400 hover:text-white transition">
                    <span>🏪</span>
                    <span>Free Agent Store</span>
                  </Link>
                  <Link href="/admin/social" className="text-gray-400 hover:text-pmb-gold transition">
                    💬 Dugout
                  </Link>
                  <Link href="/admin/ai-scout" className="flex items-center gap-1 text-pmb-gold hover:text-white transition">
                    <span>🤖</span>
                    <span>AI Scout</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/manager/dashboard" className="text-gray-400 hover:text-pmb-gold transition">
                    Dashboard
                  </Link>
                  <Link href="/manager/players" className="text-gray-400 hover:text-pmb-gold transition">
                    Players
                  </Link>
                  <Link href="/manager/contracts" className="flex items-center gap-1 text-pmb-gold hover:text-white transition">
                    <span>📝</span>
                    <span>Contracts</span>
                  </Link>
                  <Link href="/manager/transfers" className="text-gray-400 hover:text-pmb-gold transition">
                    Transfers
                  </Link>
                  <Link href="/manager/competition" className="text-gray-400 hover:text-pmb-gold transition">
                    Competition
                  </Link>
                  <Link href="/manager/auctions" className="flex items-center gap-1.5 text-pmb-gold hover:text-white transition">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Live Auctions
                  </Link>
                  <Link href="/manager/free-agents" className="flex items-center gap-1 text-emerald-400 hover:text-white transition">
                    <span>🏪</span>
                    <span>Free Agent Store</span>
                  </Link>
                  <Link href="/manager/social" className="text-gray-400 hover:text-pmb-gold transition">
                    💬 Dugout
                  </Link>
                  <Link href="/manager/ultras" className="flex items-center gap-1 text-pmb-gold hover:text-white transition">
                    <span>🛡️</span>
                    <span>Curva Ultras</span>
                  </Link>
                  <Link href="/manager/scouting" className="flex items-center gap-1 rounded-full border border-pmb-gold/40 bg-pmb-gold/10 px-2.5 py-0.5 text-pmb-gold hover:bg-pmb-gold hover:text-black transition">
                    <span>🤖</span>
                    <span>AI Scout</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Top Quick Dugout Button */}
            <Link
              href={socialHref}
              className="flex md:hidden items-center gap-1 rounded-xl border border-pmb-gold/40 bg-pmb-gold/15 px-2.5 py-1 text-xs font-bold text-pmb-gold"
            >
              <span>💬</span>
              <span>Dugout</span>
            </Link>

            <span className="hidden text-sm text-gray-400 sm:inline">{rightLabel}</span>
            {extra}
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ═══ MOBILE BOTTOM NAVIGATION DOCK (Phones only, never affects desktop) ═══ */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-black/95 backdrop-blur-xl px-2 py-2 shadow-[0_-10px_25px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-around">
          {/* Dashboard */}
          <Link
            href={homeHref}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              pathname.endsWith("/dashboard") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-base">📊</span>
            <span>Home</span>
          </Link>

          {/* Dugout Social Hub */}
          <Link
            href={socialHref}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition ${
              pathname.includes("/social")
                ? "text-pmb-gold scale-105"
                : "text-amber-300 font-bold"
            }`}
          >
            <span className="text-base relative">
              💬
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <span>Dugout</span>
          </Link>

          {/* Live Auctions */}
          <Link
            href={auctionsHref}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              pathname.includes("/auctions") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-base relative">
              ⚡
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-ping" />
            </span>
            <span>Auctions</span>
          </Link>

          {/* Competition */}
          <Link
            href={competitionHref}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              pathname.includes("/competition") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-base">🏆</span>
            <span>Matches</span>
          </Link>

          {/* Transfers / Squad */}
          <Link
            href={transfersHref}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              pathname.includes("/transfers") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-base">🔄</span>
            <span>Transfers</span>
          </Link>

          {/* Free Agent Store */}
          {!isAdmin && (
            <Link
              href="/manager/free-agents"
              className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                pathname.includes("/free-agents") ? "text-emerald-400 scale-105" : "text-gray-400"
              }`}
            >
              <span className="text-base">🏪</span>
              <span>Free Agents</span>
            </Link>
          )}

          {/* Contracts */}
          {!isAdmin && (
            <Link
              href="/manager/contracts"
              className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                pathname.includes("/contracts") ? "text-pmb-gold scale-105" : "text-gray-400"
              }`}
            >
              <span className="text-base">📝</span>
              <span>Contracts</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
