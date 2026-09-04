import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { finalizeContractSigning } from "@/lib/services/botola-contract-service";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";
import { prisma } from "@/lib/prisma";
import { Prisma, TransferStatus } from "@prisma/client";

// POST /api/manager/players/[playerId]/contract/sign
// Signs agreed terms and immediately finalizes player registration and contract in the database.
export async function POST(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { agreedTerms } = body;

  if (!agreedTerms) {
    return NextResponse.json({ error: "Missing agreed contract terms." }, { status: 400 });
  }

  try {
    const clubId = session.user.clubId;

    // 0. Check if this is a Free Agent Market player
    const freeAgent = await prisma.player.findFirst({
      where: { id: params.playerId, isFreeAgentMarket: true, pmbClubId: null },
    });

    if (freeAgent) {
      const signed = await ExpiredContractsService.signFreeAgentDirect(
        clubId,
        params.playerId,
        agreedTerms
      );
      return NextResponse.json({ success: true, contract: signed.player, awaitsAdmin: false });
    }

    // Finalize player registration, salary, prime, satisfaction, and budget deduction directly in DB
    const signed = await finalizeContractSigning(
      params.playerId,
      clubId,
      agreedTerms
    );

    // If there is an associated completed auction for this player and club, mark it approved & finalized
    const pendingAuction = await prisma.auction.findFirst({
      where: {
        playerId: params.playerId,
        currentWinnerClubId: clubId,
        status: "COMPLETED",
      },
    });

    if (pendingAuction) {
      await prisma.auction.update({
        where: { id: pendingAuction.id },
        data: {
          personalTermsAgreed: true,
          adminApproved: true,
          agreedSalary: new Prisma.Decimal(agreedTerms.seasonSalary),
          agreedPrime: new Prisma.Decimal(agreedTerms.primeSignature),
          agreedSeasons: agreedTerms.contractSeasonsLeft,
          agreedRole: agreedTerms.squadRole,
          agreedReleaseClause: agreedTerms.releaseClause
            ? new Prisma.Decimal(agreedTerms.releaseClause)
            : null,
        },
      });
    }

    // If there is an associated pending transfer for this player and club, mark it completed
    const pendingTransfer = await prisma.transfer.findFirst({
      where: {
        playerId: params.playerId,
        toClubId: clubId,
        status: { in: ["PENDING_PERSONAL_TERMS", "APPROVED"] },
      },
    });

    if (pendingTransfer) {
      await prisma.transfer.update({
        where: { id: pendingTransfer.id },
        data: {
          status: TransferStatus.COMPLETED,
          agreedSalary: new Prisma.Decimal(agreedTerms.seasonSalary),
          agreedPrime: new Prisma.Decimal(agreedTerms.primeSignature),
          agreedSeasons: agreedTerms.contractSeasonsLeft,
          agreedRole: agreedTerms.squadRole,
          agreedReleaseClause: agreedTerms.releaseClause
            ? new Prisma.Decimal(agreedTerms.releaseClause)
            : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      contract: signed,
      awaitsAdmin: false,
      message: "تم توقيع العقد بنجاح وانضم اللاعب رسمياً إلى الفريق! ✍️",
    });
  } catch (err: unknown) {
    console.error("Contract sign error:", err);
    const message = err instanceof Error ? err.message : "Failed to sign contract.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
