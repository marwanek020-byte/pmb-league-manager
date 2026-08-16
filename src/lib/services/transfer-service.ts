import {
  BudgetTransactionType,
  Player,
  Prisma,
  Transfer,
  TransferStatus,
  TransferType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applyBudgetTransaction,
  BudgetServiceError,
  lockClubBudget,
} from "@/lib/services/budget-service";

export type TransferServiceErrorCode =
  | "WINDOW_CLOSED"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_NOT_REGISTERED"
  | "CLUB_NOT_FOUND"
  | "SELF_TRANSFER"
  | "DUPLICATE_TRANSFER"
  | "INVALID_VALUE"
  | "TRANSFER_NOT_FOUND"
  | "INVALID_STATE"
  | "FORBIDDEN"
  | "OWNERSHIP_CONFLICT"
  | "INSUFFICIENT_BUDGET"
  | "USER_NOT_FOUND";

export class TransferServiceError extends Error {
  code: TransferServiceErrorCode;

  constructor(message: string, code: TransferServiceErrorCode) {
    super(message);
    this.name = "TransferServiceError";
    this.code = code;
  }
}

type CreateTransferInput = {
  playerId: string;
  toClubId: string;
  season: string;
  type?: TransferType;
  fee?: number;
  currency?: string;
  notes?: string;
  durationDays?: number;
  swapPlayerId?: string;
};

function isTransferType(value: unknown): value is TransferType {
  return (
    value === "PERMANENT" ||
    value === "LOAN" ||
    value === "SWAP" ||
    value === "FREE_TRANSFER"
  );
}

export async function createTransferRequest(
  userId: string,
  input: CreateTransferInput
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        clubId: true,
      },
    });

    if (!user) {
      throw new TransferServiceError("User not found.", "USER_NOT_FOUND");
    }

    if (user.role !== "CLUB_MANAGER" || !user.clubId) {
      throw new TransferServiceError(
        "Only club managers can create transfer requests.",
        "FORBIDDEN"
      );
    }

    if (user.clubId !== input.toClubId) {
      throw new TransferServiceError(
        "You can only request a transfer to your own club.",
        "FORBIDDEN"
      );
    }

    const player = await tx.player.findUnique({
      where: { id: input.playerId },
      include: {
        pmbClub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!player) {
      throw new TransferServiceError("Player not found.", "PLAYER_NOT_FOUND");
    }

    if (player.status !== "REGISTERED" || !player.pmbClubId) {
      throw new TransferServiceError(
        "This player is not registered to a club.",
        "PLAYER_NOT_REGISTERED"
      );
    }

    if (!player.pmbClub) {
      throw new TransferServiceError(
        "The player's current club could not be found.",
        "CLUB_NOT_FOUND"
      );
    }

    const fromClubId = player.pmbClubId;

    if (fromClubId === input.toClubId) {
      throw new TransferServiceError(
        "You cannot request a transfer for a player already at your club.",
        "SELF_TRANSFER"
      );
    }

    const toClub = await tx.club.findUnique({
      where: { id: input.toClubId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!toClub) {
      throw new TransferServiceError("Destination club not found.", "CLUB_NOT_FOUND");
    }

    if (!input.season?.trim()) {
      throw new TransferServiceError("Season is required.", "INVALID_VALUE");
    }

    const type = input.type ?? "PERMANENT";

    if (!isTransferType(type)) {
      throw new TransferServiceError("Invalid transfer type.", "INVALID_VALUE");
    }

    let fee: Prisma.Decimal | null = null;

    if (type !== "FREE_TRANSFER" && input.fee != null) {
      if (typeof input.fee !== "number" || !Number.isFinite(input.fee) || input.fee < 0) {
        throw new TransferServiceError("Fee must be a non-negative number.", "INVALID_VALUE");
      }

      fee = new Prisma.Decimal(input.fee);
    }

    if (type === "FREE_TRANSFER") {
      fee = null;
    }

    const currency = input.currency?.trim() || "EUR";

    const existingTransfer = await tx.transfer.findFirst({
      where: {
        playerId: player.id,
        status: {
          in: [TransferStatus.PENDING_SELLER_APPROVAL, TransferStatus.APPROVED],
        },
      },
      select: { id: true },
    });

    if (existingTransfer) {
      throw new TransferServiceError(
        "This player already has an active transfer request.",
        "DUPLICATE_TRANSFER"
      );
    }
    
    let swapPlayer: {
  id: string;
  fullName: string;
  pmbClubId: string | null;
  status: string;
} | null = null;

if (type === "SWAP") {
  if (!input.swapPlayerId) {
    throw new TransferServiceError(
      "A swap player is required.",
      "INVALID_VALUE"
    );
  }

  swapPlayer = await tx.player.findUnique({
  where: { id: input.swapPlayerId },
  select: {
    id: true,
    fullName: true,
    pmbClubId: true,
    status: true,
  },
});

  if (!swapPlayer) {
    throw new TransferServiceError(
      "Swap player not found.",
      "PLAYER_NOT_FOUND"
    );
  }

  if (swapPlayer.pmbClubId !== input.toClubId) {
    throw new TransferServiceError(
      "The swap player must belong to your club.",
      "OWNERSHIP_CONFLICT"
    );
  }

  if (swapPlayer.id === player.id) {
    throw new TransferServiceError(
      "The player cannot be swapped for himself.",
      "INVALID_VALUE"
    );
  }

  if (swapPlayer.status !== "REGISTERED") {
    throw new TransferServiceError(
      "The swap player is not registered.",
      "PLAYER_NOT_REGISTERED"
    );
  }
}
    const transferData = {
      playerId: player.id,
      fromClubId,
      toClubId: toClub.id,
      status: TransferStatus.PENDING_SELLER_APPROVAL,
      type,
      season: input.season.trim(),
      currency,
      notes: input.notes?.trim() || null,
      playerName: player.fullName,
      fromClubName: player.pmbClub.name,
      toClubName: toClub.name,
      fee,
      swapPlayerId: type === "SWAP" ? swapPlayer?.id ?? null : null,
  swapPlayerName: type === "SWAP" ? swapPlayer?.fullName ?? null : null,
      ...(type === "LOAN" ? { durationDays: input.durationDays ?? null } : {}),
      initiatedByUserId: user.id,
    } as Prisma.TransferUncheckedCreateInput;

    const transfer = await tx.transfer.create({
      data: transferData,
    });

    return transfer;
  });
}

export async function approveTransfer(userId: string, transferId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        clubId: true,
      },
    });

    if (!user) {
      throw new TransferServiceError("User not found.", "USER_NOT_FOUND");
    }

    if (user.role !== "CLUB_MANAGER" || !user.clubId) {
      throw new TransferServiceError("Only club managers can approve transfers.", "FORBIDDEN");
    }

    const transfer = await tx.transfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new TransferServiceError("Transfer request not found.", "TRANSFER_NOT_FOUND");
    }

    if (user.role === "CLUB_MANAGER" && transfer.fromClubId !== user.clubId) {
      throw new TransferServiceError("Only the player's current club can approve this transfer.", "FORBIDDEN");
    }

    if (transfer.status !== TransferStatus.PENDING_SELLER_APPROVAL) {
      throw new TransferServiceError(
        "This transfer is no longer awaiting seller approval.",
        "INVALID_STATE"
      );
    }

    return tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.APPROVED,
        respondedByUserId: user.id,
        respondedAt: new Date(),
      },
    });
  });
}

export async function rejectTransfer(userId: string, transferId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        clubId: true,
      },
    });

    if (!user) {
      throw new TransferServiceError("User not found.", "USER_NOT_FOUND");
    }

    if (user.role !== "CLUB_MANAGER" || !user.clubId) {
      throw new TransferServiceError("Only club managers can reject transfers.", "FORBIDDEN");
    }

    const transfer = await tx.transfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new TransferServiceError("Transfer request not found.", "TRANSFER_NOT_FOUND");
    }

    if (user.role === "CLUB_MANAGER" && transfer.fromClubId !== user.clubId) {
      throw new TransferServiceError("Only the player's current club can reject this transfer.", "FORBIDDEN");
    }

    if (transfer.status !== TransferStatus.PENDING_SELLER_APPROVAL) {
      throw new TransferServiceError(
        "This transfer is no longer awaiting seller approval.",
        "INVALID_STATE"
      );
    }

    const finalNotes = reason?.trim()
      ? `${transfer.notes ? `${transfer.notes}\n\n` : ""}Rejection reason: ${reason.trim()}`
      : transfer.notes;

    return tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.REJECTED,
        notes: finalNotes,
        respondedByUserId: user.id,
        respondedAt: new Date(),
      },
    });
  });
}

export async function cancelTransfer(userId: string, transferId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        clubId: true,
      },
    });

    if (!user) {
      throw new TransferServiceError("User not found.", "USER_NOT_FOUND");
    }

    if (user.role !== "CLUB_MANAGER" || !user.clubId) {
      throw new TransferServiceError("Only club managers can cancel transfers.", "FORBIDDEN");
    }

    const transfer = await tx.transfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new TransferServiceError("Transfer request not found.", "TRANSFER_NOT_FOUND");
    }

    if (transfer.toClubId !== user.clubId) {
      throw new TransferServiceError("Only the requesting club can cancel this transfer.", "FORBIDDEN");
    }

    const cancellable =
      transfer.status === TransferStatus.PENDING_SELLER_APPROVAL ||
      transfer.status === TransferStatus.APPROVED;

    if (!cancellable) {
      throw new TransferServiceError(
        "This transfer cannot be cancelled in its current state.",
        "INVALID_STATE"
      );
    }

    return tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.CANCELLED,
        respondedByUserId: user.id,
        respondedAt: new Date(),
      },
    });
  });
}

export async function completeTransfer(userId: string, transferId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new TransferServiceError("User not found.", "USER_NOT_FOUND");
    }

    if (user.role !== "ADMINISTRATOR") {
      throw new TransferServiceError("Only an administrator can complete a transfer.", "FORBIDDEN");
    }

    const transfers = await tx.$queryRaw<Transfer[]>(
      Prisma.sql`SELECT * FROM "Transfer" WHERE "id" = ${transferId} FOR UPDATE`
    );
    const transfer = transfers[0];

    if (!transfer) {
      throw new TransferServiceError("Transfer request not found.", "TRANSFER_NOT_FOUND");
    }

    if (transfer.status !== TransferStatus.APPROVED) {
      throw new TransferServiceError("Only approved transfers can be completed.", "INVALID_STATE");
    }
    if (transfer.type === TransferType.SWAP) {
  if (!transfer.swapPlayerId) {
    throw new TransferServiceError(
      "Swap player is missing from this transfer.",
      "PLAYER_NOT_FOUND"
    );
  }

  const swapPlayers = await tx.$queryRaw<Player[]>(
    Prisma.sql`
      SELECT *
      FROM "Player"
      WHERE "id" IN (${transfer.playerId}, ${transfer.swapPlayerId})
      FOR UPDATE
    `
  );

  const player = swapPlayers.find((p) => p.id === transfer.playerId);
  const swapPlayer = swapPlayers.find((p) => p.id === transfer.swapPlayerId);

  if (!player) {
    throw new TransferServiceError(
      "Player not found.",
      "PLAYER_NOT_FOUND"
    );
  }

  if (!swapPlayer) {
    throw new TransferServiceError(
      "Swap player not found.",
      "PLAYER_NOT_FOUND"
    );
  }

  if (player.pmbClubId !== transfer.fromClubId) {
    throw new TransferServiceError(
      "The player is no longer owned by the transfer's selling club.",
      "OWNERSHIP_CONFLICT"
    );
  }

  if (swapPlayer.pmbClubId !== transfer.toClubId) {
    throw new TransferServiceError(
      "The swap player is no longer owned by the requesting club.",
      "OWNERSHIP_CONFLICT"
    );
  }

  await tx.player.update({
    where: { id: player.id },
    data: {
      pmbClubId: transfer.toClubId,
    },
  });

  await tx.player.update({
    where: { id: swapPlayer.id },
    data: {
      pmbClubId: transfer.fromClubId,
    },
  });
}
    const changesOwnership =
      transfer.type === TransferType.PERMANENT ||
      transfer.type === TransferType.FREE_TRANSFER;

    if (changesOwnership) {
      const players = await tx.$queryRaw<Player[]>(
        Prisma.sql`SELECT * FROM "Player" WHERE "id" = ${transfer.playerId} FOR UPDATE`
      );
      const player = players[0];

      if (!player) {
        throw new TransferServiceError("Player not found.", "PLAYER_NOT_FOUND");
      }

      if (player.pmbClubId !== transfer.fromClubId) {
        throw new TransferServiceError(
          "The player is no longer owned by the transfer's selling club.",
          "OWNERSHIP_CONFLICT"
        );
      }

      const destinationClub = await tx.club.findUnique({
        where: { id: transfer.toClubId },
        select: { id: true },
      });

      if (!destinationClub) {
        throw new TransferServiceError("Destination club not found.", "CLUB_NOT_FOUND");
      }

      if (
        transfer.type === TransferType.PERMANENT &&
        transfer.fee &&
        transfer.fee.greaterThan(0)
      ) {
        try {
          const budgets = new Map<string, Prisma.Decimal>();

          for (const clubId of [transfer.fromClubId, transfer.toClubId].sort()) {
            budgets.set(clubId, await lockClubBudget(tx, clubId));
          }

          await applyBudgetTransaction(tx, {
            clubId: transfer.toClubId,
            amount: transfer.fee.negated(),
            currentBudget: budgets.get(transfer.toClubId)!,
            type: BudgetTransactionType.TRANSFER_OUT,
            description: `Transfer purchase: ${transfer.playerName}`,
            transferId: transfer.id,
            playerId: player.id,
          });

          await applyBudgetTransaction(tx, {
            clubId: transfer.fromClubId,
            amount: transfer.fee,
            currentBudget: budgets.get(transfer.fromClubId)!,
            type: BudgetTransactionType.TRANSFER_IN,
            description: `Transfer sale: ${transfer.playerName}`,
            transferId: transfer.id,
            playerId: player.id,
          });
        } catch (error) {
          if (error instanceof BudgetServiceError) {
            const code: TransferServiceErrorCode =
              error.code === "INVALID_AMOUNT" ? "INVALID_VALUE" : error.code;
            throw new TransferServiceError(error.message, code);
          }

          throw error;
        }
      }

      await tx.player.update({
        where: { id: player.id },
        data: { pmbClubId: transfer.toClubId },
      });
    }

    return tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.COMPLETED,
        completedAt: new Date(),
        respondedByUserId: user.id,
        respondedAt: new Date(),
      },
    });
  });
}
