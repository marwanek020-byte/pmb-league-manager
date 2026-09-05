import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LeagueOverview } from "@/components/admin/LeagueOverview";
import { TransferWindowControls } from "@/components/admin/TransferWindowControls";
import { RegistrationLockToggle } from "@/components/admin/RegistrationLockToggle";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    leagues,
    transferWindow,
    transferWindowHistory,
    transferWindowHistoryTotal,
    clubCount,
    managerCount,
    liveAuctionCount,
    aiScoutEnabledClubCount,
    freeAgentCount,
  ] = await Promise.all([
    prisma.league.findMany({
      orderBy: { name: "asc" },
      include: {
        clubs: {
          orderBy: { name: "asc" },
          include: {
            manager: true,
            players: {
              where: { status: "REGISTERED" },
              select: { id: true },
            },
          },
        },
      },
    }),

    prisma.transferWindow.findUnique({
      where: { id: "singleton" },
    }),

    prisma.transferWindowHistory.findMany({
      include: {
        changedBy: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),

    prisma.transferWindowHistory.count(),

    prisma.club.count(),

    prisma.user.count({
      where: {
        role: "CLUB_MANAGER",
      },
    }),

    prisma.auction.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.club.count({
      where: {
        aiScoutEnabled: true,
      },
    }),

    prisma.player.count({
      where: {
        isFreeAgentMarket: true,
      },
    }),
  ]);

  const activeAuctionCount = liveAuctionCount ?? 0;
  const activeAiScoutClubCount = aiScoutEnabledClubCount ?? 0;
  const activeFreeAgentCount = freeAgentCount ?? 0;

  const leagueData = leagues.map((league) => ({
    id: league.id,
    name: league.name,
    country: league.country,
    clubs: league.clubs.map((club) => ({
      id: club.id,
      name: club.name,
      logo: club.logo,
      managerUsername: club.manager?.username ?? null,
      registeredPlayerCount: club.players.length,
    })),
  }));

  return (
    <div className="space-y-8">
      <section className="admin-hero relative overflow-hidden rounded-2xl border border-pmb-gold/35 p-7 sm:p-10">
        <img src="/branding/pmb-lion.jpg" alt="PMB lion" className="absolute -right-8 top-7 h-40 w-40 rounded-full object-cover opacity-35 sm:right-12 sm:h-52 sm:w-52" />
        <div className="relative max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[.25em] text-pmb-gold">PMB Headquarters · Global Authority</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl">The football <span className="text-pmb-gold">empire.</span></h1>
          <p className="mt-4 text-sm leading-6 text-gray-300">Control every league, club, player, season and transfer across the PMB ecosystem.</p>
          <p className="mt-7 text-[10px] font-bold uppercase tracking-[.2em] text-pmb-gold">PES MOROCCAN BOURGEOIS</p>
        </div>
      </section>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="pmb-card border-pmb-gold/30 p-6">
          <p className="text-3xl font-bold text-pmb-gold">
            {leagues.length}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Active Leagues</p>
        </div>

        <div className="pmb-card border-pmb-gold/30 p-6">
          <p className="text-3xl font-bold text-pmb-gold">
            {clubCount}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Total Clubs</p>
        </div>

        <div className="pmb-card border-pmb-gold/30 p-6">
          <p className="text-3xl font-bold text-pmb-gold">
            {managerCount}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Club Managers</p>
        </div>

        <div className="pmb-card border-amber-500/40 p-6 bg-gradient-to-br from-amber-950/20 to-pmb-charcoal/80">
          <p className="text-3xl font-bold text-amber-400 flex items-center justify-between">
            <span>{activeAuctionCount}</span>
            {activeAuctionCount > 0 && <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Active Auctions</p>
        </div>

        <div className="pmb-card border-emerald-500/40 p-6 bg-gradient-to-br from-emerald-950/20 to-pmb-charcoal/80">
          <p className="text-3xl font-bold text-emerald-400">
            {activeFreeAgentCount}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Free Agents</p>
        </div>

        <div className="pmb-card border-cyan-500/40 p-6 bg-gradient-to-br from-cyan-950/20 to-pmb-charcoal/80">
          <p className="text-3xl font-bold text-cyan-400">
            {activeAiScoutClubCount}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">AI Scout Clubs</p>
        </div>
      </div>

      {/* ═══ ADMIN FEATURES: AUCTIONS, FREE AGENTS, AI SCOUT, DUGOUT ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Live Auctions Card */}
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-pmb-charcoal/80 to-pmb-black p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xl">🔨</span>
              {activeAuctionCount > 0 ? (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-300 animate-pulse">
                  {activeAuctionCount} Active
                </span>
              ) : (
                <span className="rounded-full bg-gray-800 border border-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-gray-400">
                  Ready
                </span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-bold text-white">Live Player Auctions</h3>
            <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
              Launch real-time bidding wars for contested stars or free agents with automated countdown clocks and budget protection.
            </p>
          </div>
          <Link
            href="/admin/auctions"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 px-4 text-xs uppercase tracking-wider transition"
          >
            Open Auction Room →
          </Link>
        </div>

        {/* Free Agent Store Card */}
        <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-pmb-charcoal/80 to-pmb-black p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xl">🆓</span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                {activeFreeAgentCount} Available
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-white">Free Agent Store</h3>
            <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
              Browse unassigned talent, manage direct signings with 0 € transfer fee, and release expired contracts to the market.
            </p>
          </div>
          <Link
            href="/admin/free-agents"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 px-4 text-xs uppercase tracking-wider transition"
          >
            Open Free Agent Store →
          </Link>
        </div>

        {/* AI Scout & Intelligence Card */}
        <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 via-pmb-charcoal/80 to-pmb-black p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xl">🤖</span>
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-cyan-300">
                {activeAiScoutClubCount}/{clubCount} Active
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-white">AI Scout Intelligence</h3>
            <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
              Configure club tier subscriptions (BASIC, PRO, ELITE) and empower managers with automated scout algorithms.
            </p>
          </div>
          <Link
            href="/admin/ai-scout"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2.5 px-4 text-xs uppercase tracking-wider transition"
          >
            Manage AI Scout →
          </Link>
        </div>

        {/* The Dugout Social Lounge Card */}
        <div className="rounded-xl border border-pmb-gold/40 bg-gradient-to-br from-pmb-gold/15 via-pmb-charcoal/80 to-pmb-black p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xl">💬</span>
              <span className="rounded-full bg-pmb-gold/20 border border-pmb-gold/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-pmb-gold">
                HQ Lounge
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-white">The Dugout · Social Hub</h3>
            <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
              Post official league communiqués, discuss transfer rumors, and interact directly with all club managers.
            </p>
          </div>
          <Link
            href="/admin/social"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-pmb-gold hover:bg-yellow-400 text-black font-bold py-2.5 px-4 text-xs uppercase tracking-wider transition"
          >
            Enter The Dugout →
          </Link>
        </div>
      </div>

      {/* Master Player Registration & Roster Lock */}
      <RegistrationLockToggle />

      {/* Season Management */}
      <div className="space-y-4 rounded-xl border border-pmb-border bg-pmb-charcoal/70 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Season Management
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Create seasons, manage final classifications, and
              preserve historical club results.
            </p>
          </div>

          <Link
            href="/admin/seasons"
            className="pmb-btn-primary rounded-full px-6 py-3 text-sm font-semibold"
          >
            Season Management
          </Link>
        </div>
      </div>

      {/* Competition Control Center */}
      <div className="space-y-4 rounded-xl border border-pmb-gold/30 bg-gradient-to-br from-pmb-charcoal/70 to-pmb-black/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-pmb-gold">
              Competition Engine
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Competition Control Center
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Generate fixtures, enter match results and let the system
              automatically calculate standings across all 7 leagues.
            </p>
          </div>

          <Link
            href="/admin/competition"
            className="pmb-btn-primary rounded-full px-6 py-3 text-sm font-semibold whitespace-nowrap"
          >
            Open Control Center →
          </Link>
        </div>
      </div>

      {/* Club Power Rating */}
      <div className="space-y-4 rounded-xl border border-pmb-border bg-pmb-charcoal/70 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Club Power Rating
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Historical ranking based on completed seasons.
            </p>
          </div>

          <Link
            href="/admin/power-ratings"
            className="pmb-btn-primary rounded-full px-6 py-3 text-sm font-semibold"
          >
            View Power Ranking
          </Link>
        </div>
      </div>

      {/* Hall of Fame */}
      <div className="space-y-4 rounded-xl border border-pmb-border bg-pmb-charcoal/70 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Hall of Fame
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              View the historical achievements of PMB clubs.
            </p>
          </div>

          <Link
            href="/admin/hall-of-fame"
            className="pmb-btn-primary rounded-full px-6 py-3 text-sm font-semibold"
          >
            Hall of Fame
          </Link>
        </div>
      </div>

      {/* Transfer Window */}
      <TransferWindowControls
        initialIsOpen={transferWindow?.isOpen ?? false}
        initialHistory={transferWindowHistory.map((entry) => ({
          id: entry.id,
          previousIsOpen: entry.previousIsOpen,
          newIsOpen: entry.newIsOpen,
          action: entry.action,
          createdAt: entry.createdAt.toISOString(),
          changedBy: entry.changedBy,
        }))}
        initialHistoryTotal={transferWindowHistoryTotal}
      />

      {/* Transfers */}
      <div className="space-y-4 rounded-xl border border-pmb-border bg-pmb-charcoal/70 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Transfers
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Manage transfer requests in a dedicated admin page.
            </p>
          </div>

          <Link
            href="/admin/transfers"
            className="pmb-btn-primary rounded-full px-6 py-3 text-sm font-semibold"
          >
            Transfer Management
          </Link>
        </div>
      </div>

      {/* League Overview */}
      <LeagueOverview leagues={leagueData} />
    </div>
  );
}
