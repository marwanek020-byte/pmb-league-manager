import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { LiveFeed } from "@/components/LiveFeed";
import { ClubThemeShell } from "@/components/ClubThemeShell";

import { UnreadMessageNotifier } from "@/components/UnreadMessageNotifier";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  if (session.user.role === "ADMINISTRATOR") {
    redirect("/admin/dashboard");
  }

  if (session.user.role !== "CLUB_MANAGER") {
    redirect("/unauthorized");
  }

  const club = session.user.clubId
    ? await prisma.club.findUnique({
        where: { id: session.user.clubId },
        select: { budget: true, name: true, logo: true, league: { select: { name: true } } },
      }).catch(() => null)
    : null;

  const budgetDisplay = club?.budget != null
    ? new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(Number(club.budget))
    : null;

  return (
    <ClubThemeShell
      clubName={club?.name ?? session.user.clubName ?? "PMB"}
      clubLogo={club?.logo}
      leagueName={club?.league?.name ?? session.user.leagueName ?? "VIP League"}
    >
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

      {/* Real-time Unread Direct Message Toast */}
      <UnreadMessageNotifier />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
    </ClubThemeShell>
  );
}
