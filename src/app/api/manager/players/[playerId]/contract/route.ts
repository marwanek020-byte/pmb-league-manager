import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { calculatePlayerDemands, evaluateNegotiationOffer, finalizeContractSigning } from "@/lib/services/botola-contract-service";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";
import { prisma } from "@/lib/prisma";

// GET /api/manager/players/[playerId]/contract
// Returns current contract data + agent initial demands
export async function GET(
  _req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Verify the player belongs to this manager's club
  let player = await prisma.player.findFirst({
    where: { id: params.playerId, pmbClubId: session.user.clubId },
    select: {
      id: true,
      fullName: true,
      overallRating: true,
      position: true,
      photo: true,
      nationality: true,
      realClub: true,
      primeSignature: true,
      seasonSalary: true,
      contractSeasonsLeft: true,
      squadRole: true,
      releaseClause: true,
      contractSatisfaction: true,
      lastNegotiatedAt: true,
    },
  });

  // 2. If not in squad yet, check if the player was won by this club in an auction (pending personal terms)
  if (!player) {
    const wonAuction = await prisma.auction.findFirst({
      where: {
        playerId: params.playerId,
        currentWinnerClubId: session.user.clubId,
        status: "COMPLETED",
      },
    });

    if (wonAuction) {
      player = await prisma.player.findUnique({
        where: { id: params.playerId },
        select: {
          id: true,
          fullName: true,
          overallRating: true,
          position: true,
          photo: true,
          nationality: true,
          realClub: true,
          primeSignature: true,
          seasonSalary: true,
          contractSeasonsLeft: true,
          squadRole: true,
          releaseClause: true,
          contractSatisfaction: true,
          lastNegotiatedAt: true,
        },
      });
    }
  }

  // 3. If not in auction, check if there is a transfer agreed by clubs awaiting personal terms
  if (!player) {
    const pendingTransfer = await prisma.transfer.findFirst({
      where: {
        playerId: params.playerId,
        toClubId: session.user.clubId,
        status: "PENDING_PERSONAL_TERMS",
      },
    });

    if (pendingTransfer) {
      player = await prisma.player.findUnique({
        where: { id: params.playerId },
        select: {
          id: true,
          fullName: true,
          overallRating: true,
          position: true,
          photo: true,
          nationality: true,
          realClub: true,
          primeSignature: true,
          seasonSalary: true,
          contractSeasonsLeft: true,
          squadRole: true,
          releaseClause: true,
          contractSatisfaction: true,
          lastNegotiatedAt: true,
        },
      });
    }
  }

  if (!player) {
    return NextResponse.json({ error: "Player not found in your squad or pending signings." }, { status: 404 });
  }

  const demands = await calculatePlayerDemands(params.playerId);

  // Get club budget for the preview
  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    select: { budget: true },
  });

  return NextResponse.json({
    player: {
      ...player,
      primeSignature: Number(player.primeSignature),
      seasonSalary: Number(player.seasonSalary),
      releaseClause: player.releaseClause ? Number(player.releaseClause) : null,
    },
    demands,
    clubBudget: Number(club?.budget ?? 0),
  });
}

// POST /api/manager/players/[playerId]/contract
// Evaluate a counter-offer during negotiation
export async function POST(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { demands, offer, currentPatience } = body;

  if (!demands || !offer || currentPatience === undefined) {
    return NextResponse.json({ error: "Missing required negotiation data." }, { status: 400 });
  }

  const result = evaluateNegotiationOffer(demands, offer, currentPatience);

  if (result.status === "BREAKDOWN") {
    // If this is a free agent, record that this club exhausted its one chance
    const player = await prisma.player.findUnique({
      where: { id: params.playerId },
      select: { isFreeAgentMarket: true },
    });
    if (player?.isFreeAgentMarket) {
      await ExpiredContractsService.recordFailedFreeAgentNegotiation(
        params.playerId,
        session.user.clubId
      );
    }
  }

  return NextResponse.json(result);
}
