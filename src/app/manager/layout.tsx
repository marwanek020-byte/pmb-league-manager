import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { LiveFeed } from "@/components/LiveFeed";
import { ClubThemeShell } from "@/components/ClubThemeShell";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "CLUB_MANAGER") {
    redirect("/unauthorized");
  }

  const club = session.user.clubId
    ? await prisma.club.findUnique({
        where: { id: session.user.clubId },
        select: { budget: true, name: true, league: { select: { name: true } } },
      })
    : null;

  const budgetDisplay = club
    ? new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        maximumFractionDigits: 0,
      }).format(Number(club.budget.toFixed(2)))
    : null;

  return (
    <ClubThemeShell clubName={club?.name ?? session.user.clubName ?? "PMB"} leagueName={club?.league.name ?? session.user.leagueName ?? "VIP League"}>
    <div className="min-h-screen">
      <Navbar
        homeHref="/manager/dashboard"
        rightLabel={`${session.user.clubName ?? "Club"} Manager`}
        extra={
          budgetDisplay && (
            <Link
              href="/manager/budget"
              className="hidden items-center gap-1.5 rounded-full border border-pmb-gold/30 bg-pmb-gold/10 px-3 py-1 text-sm font-semibold text-pmb-gold transition hover:bg-pmb-gold/20 sm:flex"
              title="View budget history"
            >
              {budgetDisplay}
            </Link>
          )
        }
      />

      {/* PMB animated live feed */}
      <LiveFeed />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
    </ClubThemeShell>
  );
}
