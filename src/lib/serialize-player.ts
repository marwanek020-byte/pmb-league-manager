import { PlayerStatus } from "@prisma/client";

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

// Only the fields we actually use — avoids selecting columns that may not
// exist in the production DB (e.g. seasonSalary, primeSignature).
export type PlayerRow = {
  id: string;
  playerId: number | null;
  fullName: string | null;
  position: string | null;
  realClub: string | null;
  nationality: string | null;
  dateOfBirth: Date | null;
  overallRating: number | null;
  marketValue: { toNumber: () => number } | number | null; // Decimal or number
  photo: string | null;
  pmbClubId: string | null;
  pmbClub?: { name: string } | null;
  status: PlayerStatus;
  createdAt: Date;
  updatedAt: Date;
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

export function serializePlayer(player: PlayerRow): PlayerDTO {
  const nowIso = new Date().toISOString();

  const mv = player.marketValue;
  const marketValue = mv == null
    ? null
    : typeof mv === "object" && "toNumber" in mv
      ? mv.toNumber()
      : Number(mv);

  return {
    id: player.id,
    playerId: player.playerId ?? 0,
    fullName: player.fullName ?? "Unknown Player",
    position: player.position ?? "SUB",
    realClub: player.realClub ?? "Free Agent",
    nationality: player.nationality ?? "PMB",
    dateOfBirth: safeIsoDate(player.dateOfBirth),
    overallRating: player.overallRating ?? null,
    marketValue: marketValue ?? null,
    photo: player.photo ?? null,
    pmbClubId: player.pmbClubId ?? null,
    pmbClubName: player.pmbClub?.name ?? null,
    status: player.status,
    createdAt: safeIsoDate(player.createdAt) ?? nowIso,
    updatedAt: safeIsoDate(player.updatedAt) ?? nowIso,
  };
}
