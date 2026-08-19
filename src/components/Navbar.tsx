import Link from "next/link";
import { ReactNode } from "react";
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
  const isAdmin = homeHref.startsWith("/admin");

  return (
    <header className="sticky top-0 z-30 border-b border-pmb-border bg-pmb-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href={homeHref}>
            <Logo size="sm" />
          </Link>

          {/* Top Navigation Bar */}
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
                <Link href="/admin/social" className="text-gray-400 hover:text-pmb-gold transition">
                  💬 Dugout
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
                <Link href="/manager/social" className="text-gray-400 hover:text-pmb-gold transition">
                  💬 Dugout
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-gray-400 sm:inline">{rightLabel}</span>
          {extra}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
