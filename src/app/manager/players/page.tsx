import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializePlayer } from "@/lib/serialize-player";
import { PlayerListClient } from "@/components/manager/PlayerListClient";

export const dynamic = "force-dynamic";

export default async function PlayerListPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  let squad: Awaited<ReturnType<typeof prisma.player.findMany>> = [];
  let queryError: string | null = null;

  try {
    squad = await prisma.player.findMany({
      where: { pmbClubId: session.user.clubId, status: "REGISTERED" },
      include: { pmbClub: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });
  } catch (err: any) {
    console.error("PlayerListPage: failed to load squad:", err);
    queryError = err?.message ?? "Unknown DB error";
  }

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

      {/* Temporary debug info - remove after fixing */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4 font-mono text-xs text-yellow-300">
        <p>🔍 Debug: clubId in session = <strong>{session.user.clubId}</strong></p>
        <p>Players found by query: <strong>{squad.length}</strong></p>
        {queryError && <p className="text-red-400">❌ Query error: {queryError}</p>}
      </div>

      <PlayerListClient
        initialSquad={squad.map(serializePlayer)}
        clubName={session.user.clubName ?? ""}
        clubId={session.user.clubId}
      />
    </div>
  );
}
