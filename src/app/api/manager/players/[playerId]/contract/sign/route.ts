import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { finalizeContractSigning } from "@/lib/services/botola-contract-service";
import { agreeTransferPersonalTerms } from "@/lib/services/transfer-service";
import { ExpiredContractsService } from "@/lib/services/expired-contracts-service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// POST /api/manager/players/[playerId]/contract/sign
// Signs agreed terms: If new signing (transfer or auction), advances deal to await Admin Approval.
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
    // 0. Check if this is a Free Agent Market player (direct signing with 1 chance rule)
    const freeAgent = await prisma.player.findFirst({
      where: { id: params.playerId, isFreeAgentMarket: true, pmbClubId: null },
    });

    if (freeAgent) {
      const signed = await ExpiredContractsService.signFreeAgentDirect(
        session.user.clubId,
        params.playerId,
        agreedTerms
      );
      return NextResponse.json({ success: true, contract: signed.player, awaitsAdmin: false });
    }

    // 1. Check if the player is already an official registered player in this manager's squad (renewal)
    const squadPlayer = await prisma.player.findFirst({
      where: { id: params.playerId, pmbClubId: session.user.clubId, status: "REGISTERED" },
    });

    if (squadPlayer) {
      // Squad player renewal -> updates immediately
      const signed = await finalizeContractSigning(
        params.playerId,
        session.user.clubId,
        agreedTerms
      );
      return NextResponse.json({ success: true, contract: signed, awaitsAdmin: false });
    }

    // 2. Check if this is a pending club-to-club transfer
    const pendingTransfer = await prisma.transfer.findFirst({
      where: {
        playerId: params.playerId,
        toClubId: session.user.clubId,
        status: "PENDING_PERSONAL_TERMS",
      },
    });

    if (pendingTransfer) {
      await agreeTransferPersonalTerms(session.user.id, pendingTransfer.id, agreedTerms);
      return NextResponse.json({
        success: true,
        awaitsAdmin: true,
        transferId: pendingTransfer.id,
        message: "تم الاتفاق على البنود الشخصية بنجاح 🤝. الصفقة الآن بانتظار مصادقة الإدارة (Admin Approval).",
      });
    }

    // 3. Check if this is a pending won auction
    const pendingAuction = await prisma.auction.findFirst({
      where: {
        playerId: params.playerId,
        currentWinnerClubId: session.user.clubId,
        status: "COMPLETED",
      },
    });

    if (pendingAuction) {
      // Save agreed terms on the auction awaiting Admin ratification
      await prisma.auction.update({
        where: { id: pendingAuction.id },
        data: {
          personalTermsAgreed: true,
          agreedSalary: new Prisma.Decimal(agreedTerms.seasonSalary),
          agreedPrime: new Prisma.Decimal(agreedTerms.primeSignature),
          agreedSeasons: agreedTerms.contractSeasonsLeft,
          agreedRole: agreedTerms.squadRole,
          agreedReleaseClause: agreedTerms.releaseClause
            ? new Prisma.Decimal(agreedTerms.releaseClause)
            : null,
        },
      });

      return NextResponse.json({
        success: true,
        awaitsAdmin: true,
        auctionId: pendingAuction.id,
        message: "تم الاتفاق على بنود عقد اللاعب والوكيل 🤝. الصفقة بانتظار مصادقة الإدارة (Admin Approval).",
      });
    }

    // Fallback: If not pending, finalize directly
    const signed = await finalizeContractSigning(
      params.playerId,
      session.user.clubId,
      agreedTerms
    );
    return NextResponse.json({ success: true, contract: signed, awaitsAdmin: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sign contract.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
