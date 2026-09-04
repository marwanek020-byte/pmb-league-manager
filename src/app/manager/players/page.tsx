import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializePlayer, PlayerDTO } from "@/lib/serialize-player";
import { PlayerListClient } from "@/components/manager/PlayerListClient";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type PlayerWithClub = Prisma.PlayerGetPayload<{
  include: { pmbClub: { select: { name: true } } };
}>;

export default async function PlayerListPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  let rawSquad: PlayerWithClub[] = [];
  let dbError: string | null = null;

  try {
    rawSquad = await prisma.player.findMany({
      where: { pmbClubId: session.user.clubId, status: "REGISTERED" },
      include: { pmbClub: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });
  } catch (err: any) {
    console.error("PlayerListPage DB error:", err);
    dbError = err?.message ?? "DB error";
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

      {/* Server-side debug — remove after fix confirmed */}
      <div className="rounded-xl border border-yellow-500/40 bg-yellow-950/20 p-4 text-xs font-mono text-yellow-300 space-y-1">
        <p>📦 Server clubId: <strong>{session.user.clubId}</strong></p>
        <p>📊 Server found: <strong>{rawSquad.length}</strong> raw rows, serialized to <strong>{initialSquad.length}</strong> players</p>
        {dbError && <p className="text-red-400">❌ DB Error: {dbError}</p>}
        {initialSquad.slice(0, 3).map((p) => (
          <p key={p.id} className="text-green-400">✓ {p.fullName} ({p.status})</p>
        ))}
      </div>

      <PlayerListClient
        initialSquad={initialSquad}
        clubName={session.user.clubName ?? ""}
        clubId={session.user.clubId}
      />
    </div>
  );
}
