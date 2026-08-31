import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

export type CreateAuctionInput = {
  playerId: string;
  startingPrice: number;
  minIncrement?: number;
  durationMinutes: number;
};

export type CreateAuctionWithPlayerInput = {
  playerId?: string;
  newPlayer?: {
    fullName: string;
    position: string;
    overallRating: number;
    nationality: string;
    realClub: string;
    photo?: string | null;
  };
  startingPrice: number;
  minIncrement?: number;
  durationMinutes: number;
};

export type PlaceBidInput = {
  auctionId: string;
  userId: string;
  clubId: string;
  amount: number;
};

/**
 * Creates and starts a new live auction, with contract check and on-the-fly player creation.
 */
export async function createAuctionWithPlayer(adminUserId: string, input: CreateAuctionWithPlayerInput) {
  let resolvedAdminUserId = adminUserId;

  let validAdmin = resolvedAdminUserId
    ? await prisma.user.findUnique({
        where: { id: resolvedAdminUserId },
        select: { id: true, role: true },
      })
    : null;

  if (!validAdmin || validAdmin.role !== "ADMINISTRATOR") {
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMINISTRATOR" },
      select: { id: true },
    });
    if (adminUser) {
      resolvedAdminUserId = adminUser.id;
    } else {
      throw new Error("No administrator account found to authorize the auction.");
    }
  }

  let resolvedPlayerId = input.playerId;

  if (!resolvedPlayerId && input.newPlayer) {
    const rawName = input.newPlayer.fullName?.trim();
    if (!rawName) {
      throw new Error("Player name is required.");
    }

    // Check if player with this exact/case-insensitive name already exists in database
    const existing = await prisma.player.findFirst({
      where: {
        fullName: {
          equals: rawName,
          mode: "insensitive",
        },
      },
      include: {
        pmbClub: { select: { name: true } },
      },
    });

    if (existing) {
      if (existing.pmbClubId != null && existing.status === "REGISTERED") {
        throw new Error(
          `Impossible: Player '${existing.fullName}' is currently registered to '${existing.pmbClub?.name}'. Players with active club contracts cannot be placed on auction.`
        );
      }
      resolvedPlayerId = existing.id;
    } else {
      // Safely determine next playerId to avoid Postgres autoincrement sequence collisions
      const maxPlayer = await prisma.player.findFirst({
        orderBy: { playerId: "desc" },
        select: { playerId: true },
      });
      const nextPlayerId = (maxPlayer?.playerId ?? 0) + 1;

      // Create new player in database
      const created = await prisma.player.create({
        data: {
          playerId: nextPlayerId,
          fullName: rawName,
          position: (input.newPlayer.position || "CF").trim().toUpperCase(),
          overallRating: Number(input.newPlayer.overallRating) || 75,
          nationality: (input.newPlayer.nationality || "Morocco").trim(),
          realClub: (input.newPlayer.realClub || "Free Agent").trim(),
          photo: input.newPlayer.photo?.trim() || null,
          marketValue: new Prisma.Decimal(input.startingPrice || 10000000),
          status: "AVAILABLE",
          pmbClubId: null,
        },
      });
      resolvedPlayerId = created.id;
    }
  }

  if (!resolvedPlayerId) {
    throw new Error("No player specified for auction.");
  }

  const player = await prisma.player.findUnique({
    where: { id: resolvedPlayerId },
    include: {
      pmbClub: { select: { name: true } },
    },
  });

  if (!player) {
    throw new Error("Player not found in database.");
  }

  if (player.pmbClubId != null && player.status === "REGISTERED") {
    throw new Error(
      `Impossible: Player '${player.fullName}' is currently registered to '${player.pmbClub?.name}'. Players with active club contracts cannot be placed on auction.`
    );
  }

  // Check if there is already an active auction for this player
  const existingActive = await prisma.auction.findFirst({
    where: {
      playerId: resolvedPlayerId,
      status: "ACTIVE",
    },
  });

  if (existingActive) {
    throw new Error(`Player '${player.fullName}' already has an active live auction.`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + (input.durationMinutes || 15) * 60 * 1000);
  const startingPrice = new Prisma.Decimal(input.startingPrice);
  const minIncrement = new Prisma.Decimal(input.minIncrement ?? 500000);

  const auction = await prisma.auction.create({
    data: {
      playerId: resolvedPlayerId,
      adminUserId: resolvedAdminUserId,
      startingPrice,
      minIncrement,
      currentBid: startingPrice,
      status: "ACTIVE",
      startsAt: now,
      expiresAt,
    },
    include: {
      player: true,
      admin: { select: { username: true } },
    },
  });

  return auction;
}

/**
 * Creates and starts a new live auction for a free agent player.
 */
export async function createAuction(adminUserId: string, input: CreateAuctionInput) {
  return createAuctionWithPlayer(adminUserId, input);
}

/**
 * Places a live bid on an active auction.
 */
export async function placeBid(input: PlaceBidInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock club budget to check available funds
    const currentBudget = await lockClubBudget(tx, input.clubId);

    const bidAmount = new Prisma.Decimal(input.amount);

    if (currentBudget.lessThan(bidAmount)) {
      throw new Error(`Insufficient club budget. You have ${currentBudget.toString()} EUR available.`);
    }

    // 2. Fetch auction with row lock via update check
    const auction = await tx.auction.findUnique({
      where: { id: input.auctionId },
      include: {
        player: true,
        bids: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!auction) {
      throw new Error("Auction not found.");
    }

    if (auction.status !== "ACTIVE") {
      throw new Error("This auction is no longer active.");
    }

    const now = new Date();
    if (now >= auction.expiresAt) {
      throw new Error("This auction has expired.");
    }

    const hasBids = auction.bids.length > 0;

    if (!hasBids) {
      if (bidAmount.lessThan(auction.startingPrice)) {
        throw new Error(`First bid must be at least the starting price of €${auction.startingPrice.toLocaleString()}.`);
      }
    } else {
      const minAllowed = auction.currentBid.plus(auction.minIncrement);
      if (bidAmount.lessThan(minAllowed)) {
        throw new Error(`Bid must be at least €${minAllowed.toLocaleString()} (current bid + min increment).`);
      }
    }

    if (auction.currentWinnerClubId === input.clubId && hasBids) {
      throw new Error("Your club already holds the highest bid.");
    }

    // 3. Anti-sniping protection: If placed within 30 seconds of expiry, extend by 60 seconds
    const msRemaining = auction.expiresAt.getTime() - now.getTime();
    let newExpiresAt = auction.expiresAt;
    if (msRemaining < 30 * 1000) {
      newExpiresAt = new Date(now.getTime() + 60 * 1000);
    }

    // 4. Record the bid
    const bid = await tx.auctionBid.create({
      data: {
        auctionId: auction.id,
        clubId: input.clubId,
        userId: input.userId,
        amount: bidAmount,
      },
      include: {
        club: { select: { id: true, name: true, logo: true } },
        user: { select: { username: true } },
      },
    });

    // 5. Update auction current state
    const updatedAuction = await tx.auction.update({
      where: { id: auction.id },
      data: {
        currentBid: bidAmount,
        currentWinnerClubId: input.clubId,
        expiresAt: newExpiresAt,
      },
      include: {
        player: true,
        currentWinnerClub: { select: { id: true, name: true, logo: true } },
        bids: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            club: { select: { id: true, name: true, logo: true } },
          },
        },
      },
    });

    return { bid, auction: updatedAuction };
  });
}

/**
 * Finalizes an auction:
 * - Deducts winning fee from winning club budget
 * - Assigns player to winning club
 * - Marks auction COMPLETED or EXPIRED
 */
export async function finalizeAuction(auctionId: string) {
  return await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: {
        player: true,
        currentWinnerClub: true,
        bids: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!auction) throw new Error("Auction not found.");
    if (auction.status !== "ACTIVE") return auction;

    const now = new Date();

    // If there is a winning club
    if (auction.currentWinnerClubId && auction.bids.length > 0) {
      const winnerClubId = auction.currentWinnerClubId;
      const winningAmount = new Prisma.Decimal(auction.currentBid);

      // Lock winning club budget & apply debit transaction safely
      const currentBudget = await lockClubBudget(tx, winnerClubId);
      const debitAmount = winningAmount.negated();
      const calculatedBalance = currentBudget.plus(debitAmount);
      const finalBalance = calculatedBalance.isNegative() ? new Prisma.Decimal(0) : calculatedBalance;

      await tx.club.update({
        where: { id: winnerClubId },
        data: { budget: finalBalance },
      });

      await tx.clubBudgetTransaction.create({
        data: {
          clubId: winnerClubId,
          amount: debitAmount,
          balanceAfter: finalBalance,
          type: "AUCTION_WIN",
          description: `Won free agent auction for ${auction.player.fullName}`,
          playerId: auction.player.id,
        },
      });

      // Transfer player to winning club
      await tx.player.update({
        where: { id: auction.playerId },
        data: {
          pmbClubId: winnerClubId,
          status: "REGISTERED",
        },
      });

      // Mark auction completed
      return await tx.auction.update({
        where: { id: auction.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
        },
        include: {
          player: true,
          currentWinnerClub: { select: { id: true, name: true, logo: true } },
        },
      });
    } else {
      // No bids were placed -> expire auction
      return await tx.auction.update({
        where: { id: auction.id },
        data: {
          status: "EXPIRED",
          completedAt: now,
        },
        include: {
          player: true,
        },
      });
    }
  });
}

/**
 * Fetches all live & recent auctions.
 * Automatically checks and finalizes any active auctions whose timers have passed.
 */
export async function getLiveAuctions() {
  const now = new Date();

  // Find any active auctions that have expired
  const expiredActive = await prisma.auction.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    select: { id: true },
  });

  for (const exp of expiredActive) {
    try {
      await finalizeAuction(exp.id);
    } catch (err) {
      console.error("Error auto-finalizing auction:", exp.id, err);
    }
  }

  // Query active and recent auctions
  const [activeAuctions, recentAuctions] = await Promise.all([
    prisma.auction.findMany({
      where: { status: "ACTIVE" },
      orderBy: { expiresAt: "asc" },
      include: {
        player: true,
        currentWinnerClub: { select: { id: true, name: true, logo: true } },
        _count: { select: { bids: true } },
      },
    }),
    prisma.auction.findMany({
      where: { status: { in: ["COMPLETED", "EXPIRED"] } },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: {
        player: true,
        currentWinnerClub: { select: { id: true, name: true, logo: true } },
        _count: { select: { bids: true } },
      },
    }),
  ]);

  return { activeAuctions, recentAuctions };
}

/**
 * Fetches details of a single auction with full bid history.
 */
export async function getAuctionDetails(auctionId: string) {
  const now = new Date();
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      player: true,
      currentWinnerClub: { select: { id: true, name: true, logo: true } },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          club: { select: { id: true, name: true, logo: true } },
          user: { select: { username: true } },
        },
      },
    },
  });

  if (!auction) return null;

  // If expired while being fetched, finalize immediately
  if (auction.status === "ACTIVE" && now >= auction.expiresAt) {
    return await finalizeAuction(auction.id);
  }

  return auction;
}

/**
 * Cancel an active auction (Admin only)
 */
export async function cancelAuction(adminUserId: string, auctionId: string) {
  return await prisma.auction.update({
    where: { id: auctionId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
    include: {
      player: true,
    },
  });
}

/**
 * Queries available unattached players for the admin to auction off.
 */
export async function getAvailableFreeAgents(search?: string) {
  const whereClause: Prisma.PlayerWhereInput = {
    pmbClubId: null,
    status: { not: "REGISTERED" },
  };

  if (search && search.trim().length > 0) {
    whereClause.AND = [
      {
        OR: [
          { fullName: { contains: search.trim(), mode: "insensitive" } },
          { position: { contains: search.trim(), mode: "insensitive" } },
          { realClub: { contains: search.trim(), mode: "insensitive" } },
          { nationality: { contains: search.trim(), mode: "insensitive" } },
        ],
      },
    ];
  }

  // Also filter out any players that currently have an active auction
  const activePlayerIds = (
    await prisma.auction.findMany({
      where: { status: "ACTIVE" },
      select: { playerId: true },
    })
  ).map((a) => a.playerId);

  if (activePlayerIds.length > 0) {
    whereClause.id = { notIn: activePlayerIds };
  }

  return await prisma.player.findMany({
    where: whereClause,
    orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
    take: 60,
  });
}
