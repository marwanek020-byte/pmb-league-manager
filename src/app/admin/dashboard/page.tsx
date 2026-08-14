import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LeagueOverview } from "@/components/admin/LeagueOverview";
import { TransferWindowControls } from "@/components/admin/TransferWindowControls";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    leagues,
    transferWindow,
    transferWindowHistory,
    transferWindowHistoryTotal,
    clubCount,
    managerCount,
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
  ]);

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </div>

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
