import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClubBadge } from "@/components/ClubBadge";
import { DashboardCard } from "@/components/DashboardCard";

export default async function ManagerDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER") redirect("/unauthorized");

  // Always look up the club via the session's clubId - never via any
  // client-supplied id - so a manager can only ever see their own club.
  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId ?? "" },
    include: { league: true },
  });

  if (!club) redirect("/unauthorized");

  return (
    <div className="space-y-8">
      <section className="pmb-card flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
        <ClubBadge name={club.name} size="lg" />
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-pmb-gold">
            Welcome,
          </p>
          <h1 className="text-2xl font-bold text-white">{club.name} Manager</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="pmb-badge">{club.name}</span>
            <span className="pmb-badge">{club.league.name}</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Quick access</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            href="/manager/players"
            title="Player List"
            description="View and manage your registered players."
          />
          <DashboardCard
            href="/manager/transfers"
            title="Transfers"
            description="Check the current transfer window status."
          />
          <DashboardCard
            href="/manager/club"
            title="Club Information"
            description="View your club's profile and league details."
          />
        </div>
      </section>
    </div>
  );
}
