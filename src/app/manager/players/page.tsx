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

  try {
    const squad = await prisma.player.findMany({
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
  } catch (err: any) {
    console.error("PlayerListPage render error:", err);
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-red-500/40 bg-red-950/30 p-8 text-center text-white backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/50 text-3xl">
          ⚠️
        </div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
          Player List Diagnostics
        </h2>
        <p className="text-xs text-red-300">
          {err?.message || "An unexpected issue occurred while rendering the player list."}
        </p>
        {err?.stack && (
          <pre className="mt-4 max-h-60 overflow-auto rounded-xl bg-black/80 p-4 text-left font-mono text-[11px] leading-relaxed text-gray-400 whitespace-pre-wrap">
            {err.stack}
          </pre>
        )}
      </div>
    );
  }
}
