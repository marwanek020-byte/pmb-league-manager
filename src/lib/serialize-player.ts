import { Player, PlayerStatus } from "@prisma/client";

export type PlayerDTO = {
  id: string;
  playerId: number;
  fullName: string;
  position: string;
  realClub: string;
  nationality: string;
  dateOfBirth: string | null;
  overallRating: number | null;
  marketValue: number | null;
  photo: string | null;
  pmbClubId: string | null;
  pmbClubName: string | null;
  status: PlayerStatus;
  createdAt: string;
  updatedAt: string;
};

function safeIsoDate(d: unknown): string | null {
  if (!d) return null;
  try {
    const date = d instanceof Date ? d : new Date(d as string);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

export function serializePlayer(
  player: Player & { pmbClub?: { name: string } | null }
): PlayerDTO {
  const nowIso = new Date().toISOString();

  return {
    id: player.id,
    playerId: player.playerId ?? 0,
    fullName: player.fullName ?? "Unknown Player",
    position: player.position ?? "SUB",
    realClub: player.realClub ?? "Free Agent",
    nationality: player.nationality ?? "PMB",
    dateOfBirth: safeIsoDate(player.dateOfBirth),
    overallRating: player.overallRating ?? null,
    marketValue: player.marketValue ? Number(player.marketValue) : null,
    photo: player.photo ?? null,
    pmbClubId: player.pmbClubId ?? null,
    pmbClubName: player.pmbClub?.name ?? null,
    status: player.status,
    createdAt: safeIsoDate(player.createdAt) ?? nowIso,
    updatedAt: safeIsoDate(player.updatedAt) ?? nowIso,
  };
}
