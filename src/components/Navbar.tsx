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
  const freeAgentsHref = isAdmin ? "/admin/free-agents" : "/manager/free-agents";
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

            {/* Desktop Navigation Bar */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-4 text-xs font-bold uppercase tracking-wider">
              {isAdmin ? (
                <>
                  <Link
                    href="/admin/dashboard"
                    className={`transition ${pathname === "/admin/dashboard" ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/auctions"
                    className={`transition ${pathname.startsWith("/admin/auctions") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Auctions
                  </Link>
                  <Link
                    href="/admin/free-agents"
                    className={`transition ${pathname.startsWith("/admin/free-agents") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Free Agents
                  </Link>
                  <Link
                    href="/admin/clubs"
                    className={`transition ${pathname.startsWith("/admin/clubs") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Clubs
                  </Link>
                  <Link
                    href="/admin/competition"
                    className={`transition ${pathname.startsWith("/admin/competition") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Competition
                  </Link>
                  <Link
                    href="/admin/transfers"
                    className={`transition ${pathname.startsWith("/admin/transfers") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Transfers
                  </Link>
                  <Link
                    href="/admin/ai-scout"
                    className={`transition ${pathname.startsWith("/admin/ai-scout") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    AI Scout
                  </Link>
                  <Link
                    href="/admin/social"
                    className={`transition ${pathname.startsWith("/admin/social") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    The Dugout
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/manager/dashboard"
                    className={`transition ${pathname === "/manager/dashboard" ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/manager/auctions"
                    className={`transition ${pathname.startsWith("/manager/auctions") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Auctions
                  </Link>
                  <Link
                    href="/manager/free-agents"
                    className={`transition ${pathname.startsWith("/manager/free-agents") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Free Agents
                  </Link>
                  <Link
                    href="/manager/players"
                    className={`transition ${pathname.startsWith("/manager/players") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Players
                  </Link>
                  <Link
                    href="/manager/contracts"
                    className={`transition ${pathname.startsWith("/manager/contracts") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Contracts
                  </Link>
                  <Link
                    href="/manager/transfers"
                    className={`transition ${pathname.startsWith("/manager/transfers") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Transfers
                  </Link>
                  <Link
                    href="/manager/competition"
                    className={`transition ${pathname.startsWith("/manager/competition") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Competition
                  </Link>
                  <Link
                    href="/manager/stadium"
                    className={`transition ${pathname.startsWith("/manager/stadium") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    Stadium
                  </Link>
                  <Link
                    href="/manager/social"
                    className={`transition ${pathname.startsWith("/manager/social") ? "text-pmb-gold font-black" : "text-gray-400 hover:text-pmb-gold"}`}
                  >
                    The Dugout
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-gray-400 lg:inline">{rightLabel}</span>
            {extra}
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ═══ MOBILE BOTTOM NAVIGATION DOCK (Phones only, never affects desktop) ═══ */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-black/95 backdrop-blur-xl px-1 py-2 shadow-[0_-10px_25px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-around overflow-x-auto no-scrollbar gap-0.5">
          {/* Dashboard */}
          <Link
            href={homeHref}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
              pathname.endsWith("/dashboard") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-sm">📊</span>
            <span>Home</span>
          </Link>

          {/* Auctions */}
          <Link
            href={auctionsHref}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
              pathname.includes("/auctions") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-sm">🔨</span>
            <span>Auctions</span>
          </Link>

          {/* Free Agents */}
          <Link
            href={freeAgentsHref}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
              pathname.includes("/free-agents") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-sm">🆓</span>
            <span>Free Agents</span>
          </Link>

          {/* Players / Clubs */}
          <Link
            href={playersHref}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
              pathname.includes(isAdmin ? "/clubs" : "/players") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-sm">👥</span>
            <span>{isAdmin ? "Clubs" : "Players"}</span>
          </Link>

          {/* Transfers */}
          <Link
            href={transfersHref}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
              pathname.includes("/transfers") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-sm">🔄</span>
            <span>Transfers</span>
          </Link>

          {/* Admin: AI Scout / Manager: Contracts */}
          {isAdmin ? (
            <Link
              href="/admin/ai-scout"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
                pathname.includes("/ai-scout") ? "text-pmb-gold scale-105" : "text-gray-400"
              }`}
            >
              <span className="text-sm">🤖</span>
              <span>AI Scout</span>
            </Link>
          ) : (
            <Link
              href="/manager/contracts"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
                pathname.includes("/contracts") ? "text-pmb-gold scale-105" : "text-gray-400"
              }`}
            >
              <span className="text-sm">📝</span>
              <span>Contracts</span>
            </Link>
          )}

          {/* Competition */}
          <Link
            href={competitionHref}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
              pathname.includes("/competition") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-sm">🏆</span>
            <span>Matches</span>
          </Link>

          {/* Dugout / Social */}
          <Link
            href={socialHref}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0 transition ${
              pathname.includes("/social") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-sm">💬</span>
            <span>Dugout</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
