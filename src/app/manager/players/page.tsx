import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializePlayer, PlayerDTO } from "@/lib/serialize-player";
import { PlayerListClient } from "@/components/manager/PlayerListClient";

export const dynamic = "force-dynamic";

// Explicit select — only fields that exist in ALL environments.
// Avoids selecting seasonSalary / primeSignature which may be missing
// from the Vercel production database.
const PLAYER_SELECT = {
  id: true,
  playerId: true,
  fullName: true,
  position: true,
  realClub: true,
  nationality: true,
  dateOfBirth: true,
  overallRating: true,
  marketValue: true,
  photo: true,
  pmbClubId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  pmbClub: { select: { name: true } },
} as const;

export default async function PlayerListPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  let rawSquad: Awaited<ReturnType<typeof prisma.player.findMany<{ select: typeof PLAYER_SELECT }>>> = [];

  try {
    rawSquad = await prisma.player.findMany({
      where: { pmbClubId: session.user.clubId, status: "REGISTERED" },
      select: PLAYER_SELECT,
      orderBy: { fullName: "asc" },
    });
  } catch (err: any) {
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
