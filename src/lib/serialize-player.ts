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
  // Contract details (read-only inspection)
  seasonSalary?: number;
  primeSignature?: number;
  contractSeasonsLeft?: number;
  squadRole?: string;
  releaseClause?: number | null;
  contractSatisfaction?: number;
  lastNegotiatedAt?: string | null;
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
  // Contract scalar fields
  seasonSalary?: { toNumber?: () => number } | number | null;
  primeSignature?: { toNumber?: () => number } | number | null;
  contractSeasonsLeft?: number | null;
  squadRole?: string | null;
  releaseClause?: { toNumber?: () => number } | number | null;
  contractSatisfaction?: number | null;
  lastNegotiatedAt?: Date | string | null;
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

  const salary = player.seasonSalary == null
    ? 0
    : typeof player.seasonSalary === "object" && player.seasonSalary !== null && "toNumber" in player.seasonSalary
      ? (player.seasonSalary as any).toNumber()
      : Number(player.seasonSalary);

  const prime = player.primeSignature == null
    ? 0
    : typeof player.primeSignature === "object" && player.primeSignature !== null && "toNumber" in player.primeSignature
      ? (player.primeSignature as any).toNumber()
      : Number(player.primeSignature);

  const release = player.releaseClause == null
    ? null
    : typeof player.releaseClause === "object" && player.releaseClause !== null && "toNumber" in player.releaseClause
      ? (player.releaseClause as any).toNumber()
      : Number(player.releaseClause);

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
    seasonSalary: salary,
    primeSignature: prime,
    contractSeasonsLeft: player.contractSeasonsLeft ?? 1,
    squadRole: player.squadRole ?? "IMPORTANT",
    releaseClause: release,
    contractSatisfaction: player.contractSatisfaction ?? 85,
    lastNegotiatedAt: safeIsoDate(player.lastNegotiatedAt),
  };
}
