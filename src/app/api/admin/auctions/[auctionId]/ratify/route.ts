import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { finalizeContractSigning, validateForeignQuota } from "@/lib/services/botola-contract-service";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";

export async function POST(
  _req: Request,
  { params }: { params: { auctionId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const auction = await prisma.auction.findUnique({
    where: { id: params.auctionId },
    include: {
      player: true,
      currentWinnerClub: true,
    },
  });

  if (!auction) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  if (!auction.currentWinnerClubId) {
    return NextResponse.json({ error: "No winning club found for this auction." }, { status: 400 });
  }

  if (!auction.personalTermsAgreed) {
    return NextResponse.json(
      { error: "Personal terms with player and agent have not been agreed yet." },
      { status: 400 }
    );
  }

  if (auction.adminApproved) {
    return NextResponse.json(
      { error: "This signing has already been approved." },
      { status: 400 }
    );
  }

  try {
    // Validate Botola Pro 5 Foreign Players Quota
    const quotaCheck = await validateForeignQuota(
      auction.currentWinnerClubId,
      auction.player.nationality
    );
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.message }, { status: 400 });
    }

    const agreedTerms = {
      seasonSalary: Number(auction.agreedSalary || 0),
      primeSignature: Number(auction.agreedPrime || 0),
      contractSeasonsLeft: auction.agreedSeasons || 1,
      squadRole: (auction.agreedRole || "IMPORTANT") as any,
      releaseClause: auction.agreedReleaseClause ? Number(auction.agreedReleaseClause) : null,
    };

    // Finalize player registration and prime de signature
    await finalizeContractSigning(
      auction.playerId,
      auction.currentWinnerClubId,
      agreedTerms
    );

    // Mark auction admin-approved
    const updatedAuction = await prisma.auction.update({
      where: { id: auction.id },
      data: { adminApproved: true },
      include: { player: true, currentWinnerClub: true },
    });

    // Announce breaking transfer
    UltrasSocialService.publishTransferAnnouncement({
      playerName: auction.player.fullName,
      position: auction.player.position,
      overallRating: auction.player.overallRating || 75,
      feeEur: Number(auction.currentBid || 0),
      fromClubName: "Free Agent / League Auction",
      toClubName: auction.currentWinnerClub?.name || "New Club",
      buyerClubId: auction.currentWinnerClubId,
      transferType: "PERMANENT",
    }).catch((err) => {
      console.error("[AuctionRatify] Failed to publish Ultras announcement:", err);
    });

    return NextResponse.json({ success: true, auction: updatedAuction });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to ratify auction signing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
