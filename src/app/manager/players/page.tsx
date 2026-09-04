import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializePlayer, PlayerDTO } from "@/lib/serialize-player";
import { PlayerListClient } from "@/components/manager/PlayerListClient";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Infer the exact type that Prisma returns with the pmbClub include
type PlayerWithClub = Prisma.PlayerGetPayload<{
  include: { pmbClub: { select: { name: true } } };
}>;

export default async function PlayerListPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  let rawSquad: PlayerWithClub[] = [];

  try {
    rawSquad = await prisma.player.findMany({
      where: { pmbClubId: session.user.clubId, status: "REGISTERED" },
      include: { pmbClub: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });
  } catch (err) {
    console.error("PlayerListPage DB error:", err);
  }

  const initialSquad: PlayerDTO[] = rawSquad.map(serializePlayer);

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
        initialSquad={initialSquad}
        clubName={session.user.clubName ?? ""}
        clubId={session.user.clubId}
      />
    </div>
  );
}
