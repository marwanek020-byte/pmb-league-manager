import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClubBadge } from "@/components/ClubBadge";

export default async function ClubInformationPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER") redirect("/unauthorized");

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId ?? "" },
    include: {
      league: true,
      manager: true,
      _count: { select: { players: true } },
    },
  });

  if (!club) redirect("/unauthorized");

  const stats = [
    { label: "Players Registered", value: club._count.players },
    { label: "Transfers In", value: 0 },
    { label: "Transfers Out", value: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Club Information</h1>
        <p className="mt-1 text-sm text-gray-400">Your club&apos;s profile at a glance.</p>
      </div>

      <div className="pmb-card flex items-center gap-5 p-6">
        <ClubBadge name={club.name} size="lg" />
        <div>
          <h2 className="text-xl font-bold text-white">{club.name}</h2>
          <p className="text-sm text-gray-400">{club.league.name}</p>
        </div>
      </div>

      <div className="pmb-card p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Club Name</dt>
            <dd className="mt-1 text-white">{club.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">League</dt>
            <dd className="mt-1 text-white">{club.league.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Manager Username</dt>
            <dd className="mt-1 text-white">{club.manager?.username ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="pmb-card p-6 text-center">
            <p className="text-3xl font-bold text-pmb-gold">{stat.value}</p>
            <p className="mt-1 text-sm text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
