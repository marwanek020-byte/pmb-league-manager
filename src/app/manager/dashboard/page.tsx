import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClubBadge } from "@/components/ClubBadge";
import { DashboardCard } from "@/components/DashboardCard";

export default async function ManagerDashboardPage() {
  const session = await auth();

  if (
    !session ||
    session.user.role !== "CLUB_MANAGER"
  ) {
    redirect("/unauthorized");
  }

  // Always use the authenticated manager's clubId.
  const club = await prisma.club.findUnique({
    where: {
      id: session.user.clubId ?? "",
    },
    include: {
      league: true,
      powerRating: true,
    },
  });

  if (!club) {
    redirect("/unauthorized");
  }

  const budgetDisplay = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number(club.budget));

  const powerRating =
    club.powerRating?.rating ?? 1000;

  const titles =
    club.powerRating?.titles ?? 0;

  return (
    <div className="space-y-8">
      {/* Club Header */}
      <section className="manager-hero pmb-card relative flex flex-col items-start gap-5 overflow-hidden p-7 sm:flex-row sm:items-center">
        <ClubBadge
  name={club.name}
  logo={club.logo}
  size="lg"
/>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-pmb-gold">Private Club Headquarters</p>

          <h1 className="text-2xl font-bold text-white">
            {club.name}
          </h1>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="pmb-badge">
              {club.name}
            </span>

            <span className="pmb-badge">
              {club.league.name}
            </span>
          </div>
        </div>
      </section>

      {/* Club Statistics */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Your Club Assets
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Budget */}
          <Link
            href="/manager/budget"
            className="pmb-card group p-6 transition hover:border-pmb-gold/40"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Budget
                </p>

                <p className="mt-2 text-2xl font-bold text-pmb-gold">
                  {budgetDisplay}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Available club budget
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pmb-gold/10 text-xl">
                💰
              </div>
            </div>
          </Link>

          {/* Club Power Rating */}
          <div className="pmb-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Club Power
                </p>

                <p className="mt-2 text-2xl font-bold text-white">
                  {powerRating}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Historical power rating
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pmb-gold/10 text-xl">
                ⭐
              </div>
            </div>
          </div>

          {/* Titles */}
          <div className="pmb-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Titles Won
                </p>

                <p className="mt-2 text-2xl font-bold text-pmb-gold">
                  {titles}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  League championships
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pmb-gold/10 text-xl">
                🏆
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Quick access
        </h2>

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
