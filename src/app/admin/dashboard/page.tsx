import { prisma } from "@/lib/prisma";
import { LeagueOverview } from "@/components/admin/LeagueOverview";
import { TransferWindowControls } from "@/components/admin/TransferWindowControls";

export default async function AdminDashboardPage() {
  const [leagues, transferWindow, clubCount, managerCount] = await Promise.all([
    prisma.league.findMany({
      orderBy: { name: "asc" },
      include: {
        clubs: {
          orderBy: { name: "asc" },
          include: { manager: true },
        },
      },
    }),
    prisma.transferWindow.findUnique({ where: { id: "singleton" } }),
    prisma.club.count(),
    prisma.user.count({ where: { role: "CLUB_MANAGER" } }),
  ]);

  const leagueData = leagues.map((league) => ({
    id: league.id,
    name: league.name,
    country: league.country,
    clubs: league.clubs.map((club) => ({
      id: club.id,
      name: club.name,
      managerUsername: club.manager?.username ?? null,
    })),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Administrator Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          Overview of all leagues, clubs, and manager accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="pmb-card p-6 text-center">
          <p className="text-3xl font-bold text-pmb-gold">{leagues.length}</p>
          <p className="mt-1 text-sm text-gray-400">Leagues</p>
        </div>
        <div className="pmb-card p-6 text-center">
          <p className="text-3xl font-bold text-pmb-gold">{clubCount}</p>
          <p className="mt-1 text-sm text-gray-400">Clubs</p>
        </div>
        <div className="pmb-card p-6 text-center">
          <p className="text-3xl font-bold text-pmb-gold">{managerCount}</p>
          <p className="mt-1 text-sm text-gray-400">Club Managers</p>
        </div>
      </div>

      <TransferWindowControls initialIsOpen={transferWindow?.isOpen ?? false} />

      <LeagueOverview leagues={leagueData} />
    </div>
  );
}
