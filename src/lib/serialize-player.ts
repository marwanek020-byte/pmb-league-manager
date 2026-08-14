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

export function serializePlayer(
  player: Player & { pmbClub?: { name: string } | null }
): PlayerDTO {
  return {
    id: player.id,
    playerId: player.playerId,
    fullName: player.fullName,
    position: player.position,
    realClub: player.realClub,
    nationality: player.nationality,
    dateOfBirth: player.dateOfBirth ? player.dateOfBirth.toISOString() : null,
    overallRating: player.overallRating ?? null,
    marketValue: player.marketValue ? Number(player.marketValue) : null,
    photo: player.photo ?? null,
    pmbClubId: player.pmbClubId,
    pmbClubName: player.pmbClub?.name ?? null,
    status: player.status,
    createdAt: player.createdAt.toISOString(),
    updatedAt: player.updatedAt.toISOString(),
  };
}
