import { Prisma, PlayerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class PlayerRegistrationError extends Error {
  code: "NOT_FOUND" | "ALREADY_REGISTERED" | "RACE_LOST" | "FORBIDDEN";

  constructor(code: PlayerRegistrationError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

type LockedPlayerRow = {
  id: string;
  status: PlayerStatus;
  pmbClubId: string | null;
  fullName: string;
};

/**
 * Registers an available player to a club.
 *
 * This is the one function in the whole app allowed to move a player from
 * Available -> Registered, and it is the single place the "one player, one
 * club, ever" rule is enforced. Two managers can call this for the same
 * player at the exact same millisecond; only one will succeed.
 *
 * How the race is closed:
 * 1. `SELECT ... FOR UPDATE` inside a transaction takes a row lock on the
 *    specific player. If another request already holds that lock (because
 *    it's mid-registration for the same player), Postgres makes this call
 *    wait until the first transaction commits or rolls back - they cannot
 *    interleave.
 * 2. Once the lock is acquired, we re-check status inside the transaction
 *    (not the value the caller saw before making the request, which could
 *    already be stale). If it's no longer Available, we abort with
 *    RACE_LOST instead of ever writing a second club onto the same player.
 */
export async function registerPlayerToClub(
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
  return prisma.$transaction(async (tx) => {
    const club = await tx.club.findUnique({
  where: { id: clubId },
  select: { id: true },
});

if (!club) {
  throw new PlayerRegistrationError("NOT_FOUND", "Club not found.");
}

const existingPlayer = await tx.player.findFirst({
  where: {
    fullName: {
      equals: input.fullName,
      mode: "insensitive",
    },
    position: {
      equals: input.position,
      mode: "insensitive",
    },
    nationality: {
      equals: input.nationality,
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
    throw new PlayerRegistrationError(
      "ALREADY_REGISTERED",
      `${existingPlayer.fullName} is already registered to another club.`
    );
  }

  throw new PlayerRegistrationError(
    "ALREADY_REGISTERED",
    `${existingPlayer.fullName} already exists in the player database. Use "Register Existing Player" instead.`
  );
}

return tx.player.create({
      data: {
        fullName: input.fullName,
        position: input.position,
        nationality: input.nationality,
        realClub: "Free Agent",
        overallRating: input.overallRating ?? null,
        marketValue: input.marketValue ?? null,
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
