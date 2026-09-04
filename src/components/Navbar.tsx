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
                </>
              ) : (
                <>
                  <Link href="/manager/dashboard" className="text-gray-400 hover:text-pmb-gold transition">
                    Dashboard
                  </Link>
                  <Link href="/manager/players" className="text-gray-400 hover:text-pmb-gold transition">
                    Players
                  </Link>
                  <Link href="/manager/contracts" className="text-gray-400 hover:text-pmb-gold transition">
                    Contracts
                  </Link>
                  <Link href="/manager/transfers" className="text-gray-400 hover:text-pmb-gold transition">
                    Transfers
                  </Link>
                  <Link href="/manager/competition" className="text-gray-400 hover:text-pmb-gold transition">
                    Competition
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

          {/* Players / Clubs */}
          <Link
            href={playersHref}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              pathname.includes(isAdmin ? "/clubs" : "/players") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-base">👥</span>
            <span>{isAdmin ? "Clubs" : "Players"}</span>
          </Link>

          {/* Contracts (Manager only) */}
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

          {/* Transfers */}
          <Link
            href={transfersHref}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              pathname.includes("/transfers") ? "text-pmb-gold scale-105" : "text-gray-400"
            }`}
          >
            <span className="text-base">🔄</span>
            <span>Transfers</span>
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
        </div>
      </nav>
    </>
  );
}
