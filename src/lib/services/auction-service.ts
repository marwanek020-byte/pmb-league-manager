import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

export type CreateAuctionInput = {
  playerId: string;
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
 * Creates and starts a new live auction for a free agent player.
 */
export async function createAuction(adminUserId: string, input: CreateAuctionInput) {
  const player = await prisma.player.findUnique({
    where: { id: input.playerId },
    select: { id: true, fullName: true, pmbClubId: true, status: true },
  });

  if (!player) {
    throw new Error("Player not found.");
  }

  if (player.pmbClubId != null && player.status === "REGISTERED") {
    throw new Error("Only unattached / free agent players can be placed on auction.");
  }

  // Check if there is already an active auction for this player
  const existingActive = await prisma.auction.findFirst({
    where: {
      playerId: input.playerId,
      status: "ACTIVE",
    },
  });

  if (existingActive) {
    throw new Error("This player already has an active auction.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.durationMinutes * 60 * 1000);
  const startingPrice = new Prisma.Decimal(input.startingPrice);
  const minIncrement = new Prisma.Decimal(input.minIncrement ?? 500000);

  const auction = await prisma.auction.create({
    data: {
      playerId: input.playerId,
      adminUserId,
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
      const winningAmount = auction.currentBid;

      // Lock winning club budget & apply debit transaction
      const currentBudget = await lockClubBudget(tx, winnerClubId);

      await applyBudgetTransaction(tx, {
        clubId: winnerClubId,
        amount: winningAmount.negated(),
        currentBudget,
        type: "AUCTION_WIN",
        description: `Won free agent auction for ${auction.player.fullName}`,
        playerId: auction.player.id,
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
      orderBy: { completedAt: "desc" },
      take: 8,
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
    OR: [
      { pmbClubId: null },
      { status: "AVAILABLE" },
    ],
  };

  if (search && search.trim().length > 0) {
    whereClause.AND = [
      {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { position: { contains: search, mode: "insensitive" } },
          { realClub: { contains: search, mode: "insensitive" } },
          { nationality: { contains: search, mode: "insensitive" } },
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
