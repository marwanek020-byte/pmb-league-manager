import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ClubBadge } from "@/components/ClubBadge";
import { PlayerListClient } from "@/components/manager/PlayerListClient";
import { prisma } from "@/lib/prisma";
import { serializePlayer } from "@/lib/serialize-player";
import { ClubBudgetManager } from "@/components/admin/ClubBudgetManager";

export const dynamic = "force-dynamic";

export default async function AdminClubPage({
  params,
}: {
  params: { clubId: string };
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMINISTRATOR") {
    redirect("/unauthorized");
  }

  const club = await prisma.club.findUnique({
    where: { id: params.clubId },
    select: {
      id: true,
      name: true,
      logo: true,
      budget: true,
      aiScoutEnabled: true,
      aiScoutTier: true,
      league: {
        select: {
          name: true,
        },
      },
      manager: {
        select: {
          username: true,
        },
      },
      players: {
        where: {
          pmbClubId: params.clubId,
        },
        include: {
          pmbClub: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          fullName: "asc",
        },
      },
    },
  });

  if (!club) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/dashboard"
          className="text-sm text-gray-400 hover:text-pmb-gold"
        >
          &larr; Back to clubs
        </Link>

        <div className="pmb-card p-8 text-center">
          <h1 className="text-xl font-semibold text-white">
            Club not found
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            This club may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const registeredPlayerCount = club.players.filter(
    (player) => player.status === "REGISTERED"
  ).length;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/dashboard"
        className="inline-block text-sm text-gray-400 hover:text-pmb-gold"
      >
        &larr; Back to clubs
      </Link>

      {/* Club header */}
      <section className="pmb-card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        {club.logo ? (
          <img
            src={club.logo}
            alt={`${club.name} badge`}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <ClubBadge name={club.name} size="lg" />
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Club
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white">
            {club.name}
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            {registeredPlayerCount} registered{" "}
            {registeredPlayerCount === 1 ? "player" : "players"}
          </p>
        </div>
      </section>

      {/* Club information */}
      <section className="pmb-card p-6">
        <h2 className="text-lg font-semibold text-white">
          Club information
        </h2>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              League
            </dt>
            <dd className="mt-1 text-white">
              {club.league.name}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Manager
            </dt>
            <dd className="mt-1 text-white">
              {club.manager?.username ?? "No manager assigned"}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Club ID
            </dt>
            <dd className="mt-1 break-all font-mono text-sm text-gray-300">
              {club.id}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              AI Chief Scout Access
            </dt>
            <dd className="mt-1 flex items-center gap-2">
              {club.aiScoutEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-pmb-gold/50 bg-pmb-gold/20 px-2.5 py-0.5 text-xs font-bold text-pmb-gold">
                  🌟 VIP PRO ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                  🔒 Standard (Disabled)
                </span>
              )}
              <Link
                href="/admin/ai-scout"
                className="text-xs font-bold text-pmb-gold hover:underline ml-2"
              >
                Manage in AI Hub →
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      {/* Budget management */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Club Budget
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Manage this club&apos;s budget and view its complete financial
            history.
          </p>
        </div>

        <ClubBudgetManager
          clubId={club.id}
          initialBudget={club.budget.toFixed(2)}
        />
      </section>

      {/* Player list */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Player list
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Current roster based on Player.pmbClubId.
          </p>
        </div>

        <PlayerListClient
  initialSquad={club.players.map(serializePlayer)}
  clubName={club.name}
  clubId={club.id}
  readOnly
  adminCanRemove
/>
      </section>
    </div>
  );
}