"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  ChartNoAxesCombined,
  CircleDot,
  History,
  MapPin,
  MessageCircle,
  Pause,
  Play,
  Plus,
  ScanLine,
  Shield,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import {
  ClubBadge,
  cn,
  countdown,
  eur,
  useNow,
  type Club,
} from "./shared";

export interface MarketUpdate {
  id: string;
  text: string;
}

interface DashboardProps {
  club: Club;
  managerUsername: string;
  leagueName: string;
  leagueVerified?: boolean;
  budgetEur: number;
  loyalty: number;
  morale: "Euphoria" | "United" | "Ultimatum" | "Pyro Pressure";
  nextMatch: {
    id: string;
    home: Club;
    away: Club;
    stadium: string;
    kickoffAt: string;
  } | null;
  marketUpdates: MarketUpdate[];
  marketConnected: boolean;
  serverOffsetMs?: number;
  onOpenScanner?: (matchId: string) => void;
}

const navigation = [
  {
    href: "/manager/dashboard",
    label: "Dashboard",
    Icon: ChartNoAxesCombined,
  },
  { href: "/manager/auctions", label: "Auctions", Icon: Zap },
  { href: "/manager/tactics", label: "Squad", Icon: Users },
  { href: "/manager/competition", label: "Matchdays", Icon: CircleDot },
  { href: "/manager/social", label: "The Dugout", Icon: MessageCircle },
];

function ManagerNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Manager navigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50
        border-t border-white/10 bg-black/95 px-2 pt-2 backdrop-blur-2xl
        md:static md:mb-8 md:rounded-2xl md:border md:p-2"
    >
      <div className="mx-auto grid max-w-4xl grid-cols-5 gap-1">
        {navigation.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href === "/manager/tactics" &&
              ["/manager/players", "/manager/contracts", "/manager/tactics"].includes(pathname));

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1",
                "rounded-xl px-1 text-[10px] font-semibold transition",
                "md:min-h-12 md:flex-row md:gap-2 md:text-sm",
                active
                  ? "bg-pmb-gold/10 text-pmb-gold-light"
                  : "text-pmb-text-secondary hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MoraleGauge({
  value,
  status,
}: {
  value: number;
  status: DashboardProps["morale"];
}) {
  const clamped = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;
  const circumference = 2 * Math.PI * 52;
  const positive = status === "Euphoria" || status === "United";

  return (
    <section className="pmb-card p-6" aria-labelledby="morale-title">
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-pmb-gold-light" aria-hidden="true" />
        <h2 id="morale-title" className="pmb-heading text-sm text-white">
          Curva Ultras
        </h2>
      </div>

      <div
        role="meter"
        aria-label="Fan loyalty"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped}% — ${status}`}
        className="relative mx-auto my-4 h-44 w-44"
      >
        <svg viewBox="0 0 128 128" className="h-full w-full" aria-hidden="true">
          <circle
            cx="64"
            cy="64"
            r="52"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="9"
          />
          <circle
            cx="64"
            cy="64"
            r="52"
            fill="none"
            stroke={positive ? "#10B981" : "#FDE047"}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            transform="rotate(-90 64 64)"
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>

        <div aria-hidden="true" className="absolute inset-0 grid place-content-center text-center">
          <strong className="pmb-data text-4xl text-white">{clamped}%</strong>
          <span className="mt-1 text-xs text-pmb-text-secondary">Fan loyalty</span>
        </div>
      </div>

      <div className="text-center">
        <span className={cn("pmb-pill", positive ? "pmb-positive" : "text-pmb-gold-light")}>
          {status}
        </span>
        <p className="mt-3 text-sm text-pmb-text-secondary">
          The stands remember every performance.
        </p>
      </div>
    </section>
  );
}

export default function DashboardView({
  club,
  managerUsername,
  leagueName,
  leagueVerified = true,
  budgetEur,
  loyalty,
  morale,
  nextMatch,
  marketUpdates,
  marketConnected,
  serverOffsetMs = 0,
  onOpenScanner,
}: DashboardProps) {
  const now = useNow(serverOffsetMs);
  const [tickerPaused, setTickerPaused] = useState(false);
  const kickoff = nextMatch ? Date.parse(nextMatch.kickoffAt) : NaN;
  const remaining =
    now !== null && Number.isFinite(kickoff) ? kickoff - now : null;

  return (
    <main className="mx-auto min-h-dvh max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-10">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only">
        Skip to dashboard
      </a>

      <header className="mb-6 flex items-center justify-between">
        <Link href="/manager/dashboard" className="pmb-heading text-lg text-white">
          PMB <span className="text-pmb-gold-light">League Manager</span>
        </Link>
        <span className="pmb-pill hidden sm:inline-flex">Manager HQ</span>
      </header>

      <ManagerNavigation />

      <div id="dashboard-content" className="space-y-6">
        {/* Hero Identity Banner */}
        <section className="pmb-card relative overflow-hidden bg-gold-ambient p-5 md:p-8">
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <ClubBadge club={club} className="h-20 w-20 md:h-24 md:w-24" />
              <div className="min-w-0">
                <p className="pmb-eyebrow">Executive manager</p>
                <h1 className="pmb-heading mt-1 text-2xl text-white md:text-4xl">
                  {club.name}
                </h1>
                <p className="mt-1 text-pmb-text-secondary">
                  @{managerUsername.replace(/^@/, "")}
                </p>
                <span className="pmb-pill mt-3">
                  {leagueVerified && (
                    <BadgeCheck
                      size={14}
                      className="text-pmb-gold-light"
                      aria-label="Verified league"
                    />
                  )}
                  {leagueName}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-pmb-gold/25 bg-pmb-void/90 p-4 shadow-gold">
              <p className="pmb-eyebrow flex items-center gap-2">
                <Wallet size={15} aria-hidden="true" />
                Transfer vault
              </p>
              <p className="pmb-data mt-2 text-2xl font-bold text-pmb-gold-light md:text-3xl">
                {eur(budgetEur)}
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/manager/budget" className="pmb-button-secondary">
                  <Plus size={16} aria-hidden="true" /> Budget
                </Link>
                <Link href="/manager/budget" className="pmb-button-secondary">
                  <History size={16} aria-hidden="true" /> History
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Matchday & Morale Grid */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <section className="pmb-card overflow-hidden" aria-labelledby="matchday-title">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <h2 id="matchday-title" className="pmb-heading text-white">
                Matchday command
              </h2>
              <span className="pmb-pill">Competition</span>
            </div>

            {nextMatch ? (
              <div className="bg-turf-ambient p-5 md:p-8">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex min-w-0 flex-col items-center gap-3 text-center">
                    <ClubBadge club={nextMatch.home} />
                    <h3 className="text-sm font-bold text-white md:text-lg">
                      {nextMatch.home.name}
                    </h3>
                    <span className="pmb-eyebrow">Home</span>
                  </div>

                  <div className="text-center">
                    <span className="pmb-heading text-2xl text-pmb-text-secondary">VS</span>
                    <p className="pmb-data mt-3 rounded-xl bg-black/40 px-3 py-2 text-sm text-pmb-gold-light md:text-xl">
                      {remaining === null
                        ? "—"
                        : remaining > 0
                        ? countdown(remaining)
                        : "Kick-off reached"}
                    </p>
                    <span className="sr-only">Scheduled kick-off countdown</span>
                  </div>

                  <div className="flex min-w-0 flex-col items-center gap-3 text-center">
                    <ClubBadge club={nextMatch.away} />
                    <h3 className="text-sm font-bold text-white md:text-lg">
                      {nextMatch.away.name}
                    </h3>
                    <span className="pmb-eyebrow">Away</span>
                  </div>
                </div>

                <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-pmb-text-secondary">
                  <MapPin size={16} aria-hidden="true" />
                  {nextMatch.stadium}
                </p>

                {onOpenScanner && (
                  <button
                    type="button"
                    onClick={() => onOpenScanner(nextMatch.id)}
                    className="pmb-button-primary mt-6 w-full"
                  >
                    <ScanLine size={19} aria-hidden="true" />
                    Submit Match Result · AI Scan
                  </button>
                )}
              </div>
            ) : (
              <p className="p-8 text-pmb-text-secondary">
                No upcoming fixture has been scheduled.
              </p>
            )}
          </section>

          <MoraleGauge value={loyalty} status={morale} />
        </div>

        {/* Transfer Market Wire / Ticker */}
        <section className="pmb-card ticker overflow-hidden" aria-label="Transfer market updates">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Zap size={17} className="text-pmb-gold-light" aria-hidden="true" />
            <h2 className="pmb-heading text-sm text-white">Transfer wire</h2>
            <span className={cn("pmb-pill", marketConnected && "pmb-positive")}>
              {marketConnected ? "Connected" : "Offline"}
            </span>
            <button
              type="button"
              aria-label={tickerPaused ? "Resume ticker" : "Pause ticker"}
              aria-pressed={tickerPaused}
              onClick={() => setTickerPaused((value) => !value)}
              className="pmb-icon-button ml-auto"
            >
              {tickerPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          </div>

          {marketUpdates.length > 0 ? (
            <>
              <div aria-hidden="true" className="overflow-hidden py-4">
                <div
                  className="ticker-track flex w-max animate-ticker"
                  style={{ animationPlayState: tickerPaused ? "paused" : "running" }}
                >
                  {[0, 1].map((copy) => (
                    <div key={copy} className="flex shrink-0">
                      {marketUpdates.map((update) => (
                        <span key={update.id} className="flex items-center gap-3 px-6 text-sm text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-pmb-gold" />
                          {update.text}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <ul className="sr-only" aria-label="Latest transfers">
                {marketUpdates.map((update) => (
                  <li key={update.id}>{update.text}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="p-4 text-sm text-pmb-text-secondary">
              No transfer updates available.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
