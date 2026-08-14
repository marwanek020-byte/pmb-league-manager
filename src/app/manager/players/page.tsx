import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializePlayer } from "@/lib/serialize-player";
import { PlayerListClient } from "@/components/manager/PlayerListClient";

export default async function PlayerListPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  const squad = await prisma.player.findMany({
    // Always scoped to the session's own club - a manager can never load
    // another club's squad by any means, URL-based or otherwise.
    where: { pmbClubId: session.user.clubId, status: "REGISTERED" },
    include: { pmbClub: { select: { name: true } } },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Player List</h1>
          <p className="mt-1 text-sm text-gray-400">
            Players currently registered to {session.user.clubName ?? "your club"}.
          </p>
        </div>
      </div>

      <PlayerListClient
        initialSquad={squad.map(serializePlayer)}
        clubName={session.user.clubName ?? ""}
        clubId={session.user.clubId}
      />
    </div>
  );
}
