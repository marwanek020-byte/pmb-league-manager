import { Prisma, PlayerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SystemSettingsService } from "@/lib/services/system-settings-service";

export class PlayerRegistrationError extends Error {
  code: "NOT_FOUND" | "ALREADY_REGISTERED" | "RACE_LOST" | "FORBIDDEN" | "LOCKED";

  constructor(code: PlayerRegistrationError["code"], message: string) {
    super(message);
    this.name = "PlayerRegistrationError";
    this.code = code;
    Object.setPrototypeOf(this, PlayerRegistrationError.prototype);
  }
}

export function isPlayerRegistrationError(err: unknown): err is PlayerRegistrationError {
  if (!err || typeof err !== "object") return false;
  if (err instanceof PlayerRegistrationError) return true;
  return (
    (err as any).name === "PlayerRegistrationError" ||
    ("code" in err && ["NOT_FOUND", "ALREADY_REGISTERED", "RACE_LOST", "FORBIDDEN", "LOCKED"].includes((err as any).code))
  );
}

type LockedPlayerRow = {
  id: string;
  status: PlayerStatus;
  pmbClubId: string | null;
  fullName: string;
};

/**
 * Registers an available player to a club.
 */
export async function registerPlayerToClub(
  playerId: string,
  clubId: string
): Promise<{ id: string; fullName: string }> {
  // Check master registration lock
  const isLocked = await SystemSettingsService.isRegistrationLocked();
  if (isLocked) {
    throw new PlayerRegistrationError(
      "LOCKED",
      "Player registrations are currently LOCKED by PMB League Administration. No club can add or register players at this time."
    );
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<LockedPlayerRow[]>(
      Prisma.sql`SELECT "id", "status", "pmbClubId", "fullName" FROM "Player" WHERE "id" = ${playerId} FOR UPDATE`
    );
    const player = rows[0];

    if (!player) {
      throw new PlayerRegistrationError("NOT_FOUND", "Player not found.");
    }

    if (player.status === "REGISTERED") {
      throw new PlayerRegistrationError(
        player.pmbClubId === clubId ? "ALREADY_REGISTERED" : "RACE_LOST",
        player.pmbClubId === clubId
          ? "This player is already registered to your club."
          : "This player has just been registered by another club."
      );
    }

    const club = await tx.club.findUnique({ where: { id: clubId }, select: { id: true } });
    if (!club) {
      throw new PlayerRegistrationError("NOT_FOUND", "Club not found.");
    }

    const updated = await tx.player.update({
      where: { id: playerId },
      data: { status: "REGISTERED", pmbClubId: clubId },
      select: { id: true, fullName: true },
    });

    return updated;
  });
}

/**
 * Creates a brand-new player directly as Registered to a club. This is
 * distinct from registerPlayerToClub(): that function moves an EXISTING
 * Available player (from the global pool, e.g. added by an Administrator)
 * to a club; this one creates the Player row itself, for the case where a
 * manager is entering a player who doesn't exist in the database yet.
 *
 * The new player is immediately eligible for the transfer system, exactly
 * like any other Registered player - completeTransfer() and the rest of
 * TransferService don't distinguish how a player became Registered.
 *
 * realClub has no equivalent field in the manager-facing form (the form
 * only asks for PMB-relevant details), but the column is required by the
 * schema, so it's set to a fixed placeholder rather than left to guess at
 * a real-world club affiliation that was never provided. An Administrator
 * can still edit/import the real club value separately if desired.
 */
export async function createPlayerForClub(
  clubId: string,
  input: {
    fullName: string;
    position: string;
    nationality: string;
    overallRating?: number | null;
    marketValue?: number | null;
  }
) {
  // Check master registration lock
  const isLocked = await SystemSettingsService.isRegistrationLocked();
  if (isLocked) {
    throw new PlayerRegistrationError(
      "LOCKED",
      "Player registrations are currently LOCKED by PMB League Administration. No club can add or create players at this time."
    );
  }

  const normalizedFullName = input.fullName.trim();
  const normalizedPosition = input.position.trim().toUpperCase();
  const normalizedNationality = input.nationality.trim();

  return prisma.$transaction(async (tx) => {
    const club = await tx.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true },
    });

    if (!club) {
      throw new PlayerRegistrationError("NOT_FOUND", "Club not found.");
    }

    const existingPlayer = await tx.player.findFirst({
      where: {
        fullName: {
          equals: normalizedFullName,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        fullName: true,
        status: true,
        pmbClubId: true,
        pmbClub: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingPlayer) {
      if (existingPlayer.status === "REGISTERED") {
        if (existingPlayer.pmbClubId === clubId) {
          throw new PlayerRegistrationError(
            "ALREADY_REGISTERED",
            `"${existingPlayer.fullName}" is already registered to your club.`
          );
        }
        throw new PlayerRegistrationError(
          "ALREADY_REGISTERED",
          `"${existingPlayer.fullName}" is already registered to ${existingPlayer.pmbClub?.name || "another club"}.`
        );
      }

      throw new PlayerRegistrationError(
        "ALREADY_REGISTERED",
        `"${existingPlayer.fullName}" already exists in the player database (Free Agent). Use "Register Existing Player" instead.`
      );
    }

    // Safely determine next playerId to avoid Postgres autoincrement sequence collisions
    const maxPlayer = await tx.player.findFirst({
      orderBy: { playerId: "desc" },
      select: { playerId: true },
    });
    const nextPlayerId = (maxPlayer?.playerId ?? 0) + 1;

    const defaultPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedFullName)}&background=16161a&color=d4af37&size=256&bold=true&font-size=0.38&rounded=true`;

    return tx.player.create({
      data: {
        playerId: nextPlayerId,
        fullName: normalizedFullName,
        position: normalizedPosition,
        nationality: normalizedNationality,
        realClub: "Free Agent",
        photo: defaultPhoto,
        overallRating: input.overallRating ?? null,
        marketValue: input.marketValue != null ? new Prisma.Decimal(input.marketValue) : null,
        status: "REGISTERED",
        pmbClubId: clubId,
      },
      include: { pmbClub: { select: { name: true } } },
    });
  });
}

/**
 * Removes a player from a club's squad, sending them back to Available.
 * Only succeeds if the player currently belongs to the requesting club -
 * a manager can never free up (or silently move) another club's player.
 */
export async function removePlayerFromClub(
  playerId: string,
  clubId: string
): Promise<{ id: string; fullName: string }> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<LockedPlayerRow[]>(
      Prisma.sql`SELECT "id", "status", "pmbClubId", "fullName" FROM "Player" WHERE "id" = ${playerId} FOR UPDATE`
    );
    const player = rows[0];

    if (!player) {
      throw new PlayerRegistrationError("NOT_FOUND", "Player not found.");
    }

    if (player.status !== "REGISTERED" || player.pmbClubId !== clubId) {
      throw new PlayerRegistrationError(
        "FORBIDDEN",
        "You can only remove players currently registered to your own club."
      );
    }

    const updated = await tx.player.update({
      where: { id: playerId },
      data: { status: "AVAILABLE", pmbClubId: null },
      select: { id: true, fullName: true },
    });

    return updated;
  });
}
