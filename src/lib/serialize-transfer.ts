import type {
  Transfer,
  TransferStatus,
  TransferType,
} from "@prisma/client";

export type TransferDTO = {
  id: string;
  playerId: string;
  swapPlayerId: string | null;
  swapPlayerName: string | null;
  durationDays: number;
  fromClubId: string;
  toClubId: string;
  status: TransferStatus;
  type: TransferType;
  season: string;
  currency: string;
  notes: string | null;
  playerName: string;
  fromClubName: string;
  toClubName: string;
  fee: number | null;
  agreedSalary?: number | null;
  agreedPrime?: number | null;
  agreedSeasons?: number | null;
  agreedRole?: string | null;
  agreedReleaseClause?: number | null;
  initiatedByUserId: string;
  respondedByUserId: string | null;
  respondedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TransferWithOptionalSwapPlayer = Transfer & {
  swapPlayer?: {
    id: string;
    fullName: string;
  } | null;
  swapPlayerId?: string | null;
  swapPlayerName?: string | null;
  durationDays?: number | null;
};

export function serializeTransfer(
  transfer: TransferWithOptionalSwapPlayer
): TransferDTO {
  return {
    id: transfer.id,
    playerId: transfer.playerId,
    swapPlayerId: transfer.swapPlayer?.id ?? transfer.swapPlayerId ?? null,
    swapPlayerName: transfer.swapPlayerName ?? transfer.swapPlayer?.fullName ?? null,
    durationDays: transfer.durationDays ?? 0,
    fromClubId: transfer.fromClubId,
    toClubId: transfer.toClubId,
    status: transfer.status,
    type: transfer.type,
    season: transfer.season,
    currency: transfer.currency,
    notes: transfer.notes,
    playerName: transfer.playerName,
    fromClubName: transfer.fromClubName,
    toClubName: transfer.toClubName,
    fee: transfer.fee ? Number(transfer.fee) : null,
    agreedSalary: transfer.agreedSalary ? Number(transfer.agreedSalary) : null,
    agreedPrime: transfer.agreedPrime ? Number(transfer.agreedPrime) : null,
    agreedSeasons: transfer.agreedSeasons ?? null,
    agreedRole: transfer.agreedRole ?? null,
    agreedReleaseClause: transfer.agreedReleaseClause ? Number(transfer.agreedReleaseClause) : null,
    initiatedByUserId: transfer.initiatedByUserId,
    respondedByUserId: transfer.respondedByUserId,
    respondedAt: transfer.respondedAt
      ? transfer.respondedAt.toISOString()
      : null,
    completedAt: transfer.completedAt
      ? transfer.completedAt.toISOString()
      : null,
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString(),
  };
}