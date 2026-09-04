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

    // 1. If this is an Auction signing, save agreed terms and wait for Admin ratification
    const pendingAuction = await prisma.auction.findFirst({
      where: {
        playerId: params.playerId,
        currentWinnerClubId: clubId,
        status: "COMPLETED",
        adminApproved: false,
      },
    });

    if (pendingAuction) {
      await prisma.auction.update({
        where: { id: pendingAuction.id },
        data: {
          personalTermsAgreed: true,
          adminApproved: false,
          agreedSalary: new Prisma.Decimal(agreedTerms.seasonSalary),
          agreedPrime: new Prisma.Decimal(agreedTerms.primeSignature),
          agreedSeasons: agreedTerms.contractSeasonsLeft,
          agreedRole: agreedTerms.squadRole,
          agreedReleaseClause: agreedTerms.releaseClause
            ? new Prisma.Decimal(agreedTerms.releaseClause)
            : null,
        },
      });

      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { budget: true },
      });

      return NextResponse.json({
        success: true,
        contract: {
          seasonSalary: agreedTerms.seasonSalary,
          primeSignature: agreedTerms.primeSignature,
          clubBudgetAfter: club?.budget ? Number(club.budget) : 0,
        },
        awaitsAdmin: true,
        message: "تم الاتفاق على شروط العقد بنجاح! بانتظار مصادقة واعتماد الإدارة (Admin Ratification) لإتمام الصفقة رسمياً. ⚖️",
      });
    }

    // 2. If this is a Club-to-Club transfer, save agreed terms, set status to APPROVED, and wait for Admin ratification
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
          status: TransferStatus.APPROVED,
          agreedSalary: new Prisma.Decimal(agreedTerms.seasonSalary),
          agreedPrime: new Prisma.Decimal(agreedTerms.primeSignature),
          agreedSeasons: agreedTerms.contractSeasonsLeft,
          agreedRole: agreedTerms.squadRole,
          agreedReleaseClause: agreedTerms.releaseClause
            ? new Prisma.Decimal(agreedTerms.releaseClause)
            : null,
        },
      });

      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { budget: true },
      });

      return NextResponse.json({
        success: true,
        contract: {
          seasonSalary: agreedTerms.seasonSalary,
          primeSignature: agreedTerms.primeSignature,
          clubBudgetAfter: club?.budget ? Number(club.budget) : 0,
        },
        awaitsAdmin: true,
        message: "تم الاتفاق على شروط العقد بنجاح! تم رفع الصفقة رسمياً إلى إدارة الدوري (Admin) للمصادقة والاعتماد النهائي. ⚖️",
      });
    }

    // 3. Otherwise, this is an existing squad player renewing their contract with their current club
    const signed = await finalizeContractSigning(
      params.playerId,
      clubId,
      agreedTerms
    );

    return NextResponse.json({
      success: true,
      contract: signed,
      awaitsAdmin: false,
      message: "تم تجديد عقد اللاعب بنجاح! ✍️",
    });
  } catch (err: unknown) {
    console.error("Contract sign error:", err);
    const message = err instanceof Error ? err.message : "Failed to sign contract.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
