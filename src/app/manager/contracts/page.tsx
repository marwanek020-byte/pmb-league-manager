import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { finalizeContractSigning } from "@/lib/services/botola-contract-service";
import { ContractsPayrollClient } from "@/components/manager/contracts/ContractsPayrollClient";
import { TransferStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "العقود والرواتب · PMB League Manager",
  description: "إدارة عقود ورواتب لاعبي فريقك في البطولة الاحترافية المغربية",
};

export default async function ContractsPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  const clubId = session.user.clubId;

  // 0. Auto-finalize any deals where personal terms were already agreed (e.g. negotiated via app/mobile)
  try {
    // Also clean up any completed auctions/transfers where player is already in club squad
    await prisma.auction.updateMany({
      where: {
        currentWinnerClubId: clubId,
        status: "COMPLETED",
        adminApproved: false,
        player: { pmbClubId: clubId, status: "REGISTERED" },
      },
      data: { adminApproved: true },
    });

    await prisma.transfer.updateMany({
      where: {
        toClubId: clubId,
        status: { not: "COMPLETED" },
        player: { pmbClubId: clubId, status: "REGISTERED" },
      },
      data: { status: TransferStatus.COMPLETED },
    });

    const agreedAuctions = await prisma.auction.findMany({
      where: {
        currentWinnerClubId: clubId,
        status: "COMPLETED",
        personalTermsAgreed: true,
        adminApproved: false,
      },
      include: { player: true },
    });

    for (const a of agreedAuctions) {
      try {
        if (a.player) {
          await finalizeContractSigning(a.playerId, clubId, {
            seasonSalary: Number(a.agreedSalary || 0),
            primeSignature: Number(a.agreedPrime || 0),
            contractSeasonsLeft: a.agreedSeasons || 1,
            squadRole: (a.agreedRole || "IMPORTANT") as any,
            releaseClause: a.agreedReleaseClause ? Number(a.agreedReleaseClause) : null,
          });
        }
        await prisma.auction.update({
          where: { id: a.id },
          data: { adminApproved: true },
        });
      } catch (err) {
        console.warn("ContractsPage auto-finalizing auction failed:", err);
      }
    }

    const agreedTransfers = await prisma.transfer.findMany({
      where: {
        toClubId: clubId,
        status: { in: ["APPROVED", "PENDING_PERSONAL_TERMS"] },
        agreedSalary: { not: null },
      },
      include: { player: true },
    });

    for (const t of agreedTransfers) {
      try {
        if (t.player) {
          await finalizeContractSigning(t.playerId, clubId, {
            seasonSalary: Number(t.agreedSalary || 0),
            primeSignature: Number(t.agreedPrime || 0),
            contractSeasonsLeft: t.agreedSeasons || 1,
            squadRole: (t.agreedRole || "IMPORTANT") as any,
            releaseClause: t.agreedReleaseClause ? Number(t.agreedReleaseClause) : null,
          });
        }
        await prisma.transfer.update({
          where: { id: t.id },
          data: { status: TransferStatus.COMPLETED },
        });
      } catch (err) {
        console.warn("ContractsPage auto-finalizing transfer failed:", err);
      }
    }
  } catch (err) {
    console.warn("ContractsPage: Auto-finalization step warning:", err);
  }

  // 1. Fetch official registered squad players (with resilient fallback if contract columns are missing)
  let serializedSquad: any[] = [];
  try {
    const squad = await prisma.player.findMany({
      where: { pmbClubId: clubId, status: "REGISTERED" },
      select: {
        id: true,
        fullName: true,
        overallRating: true,
        position: true,
        photo: true,
        nationality: true,
        realClub: true,
        marketValue: true,
        seasonSalary: true,
        primeSignature: true,
        contractSeasonsLeft: true,
        squadRole: true,
        releaseClause: true,
        contractSatisfaction: true,
        lastNegotiatedAt: true,
      },
      orderBy: [{ contractSatisfaction: "asc" }, { fullName: "asc" }],
    });

    serializedSquad = squad.map(p => ({
      ...p,
      seasonSalary:    Number(p.seasonSalary ?? 0),
      primeSignature:  Number(p.primeSignature ?? 0),
      contractSeasonsLeft: p.contractSeasonsLeft ?? 1,
      squadRole:       p.squadRole ?? "IMPORTANT",
      contractSatisfaction: p.contractSatisfaction ?? 85,
      releaseClause:   p.releaseClause ? Number(p.releaseClause) : null,
      marketValue:     p.marketValue ? Number(p.marketValue) : null,
      lastNegotiatedAt: p.lastNegotiatedAt?.toISOString() ?? null,
    }));
  } catch (err) {
    console.warn("ContractsPage: Full squad query failed, falling back to basic columns:", err);
    try {
      const basicSquad = await prisma.player.findMany({
        where: { pmbClubId: clubId, status: "REGISTERED" },
        select: {
          id: true,
          fullName: true,
          overallRating: true,
          position: true,
          photo: true,
          nationality: true,
          realClub: true,
          marketValue: true,
        },
        orderBy: { fullName: "asc" },
      });

      serializedSquad = basicSquad.map(p => ({
        ...p,
        seasonSalary: 0,
        primeSignature: 0,
        contractSeasonsLeft: 1,
        squadRole: "IMPORTANT",
        contractSatisfaction: 85,
        releaseClause: null,
        marketValue: p.marketValue ? Number(p.marketValue) : null,
        lastNegotiatedAt: null,
      }));
    } catch (fallbackErr) {
      console.error("ContractsPage: Fallback squad query also failed:", fallbackErr);
    }
  }

  // Set of all registered player IDs in the squad
  const squadIds = new Set(serializedSquad.map(p => p.id));

  // 2. Fetch pending signings (Won auctions awaiting 3D contract negotiation)
  let serializedPendingAuctions: any[] = [];
  try {
    const pendingAuctions = await prisma.auction.findMany({
      where: {
        currentWinnerClubId: clubId,
        status: "COMPLETED",
        adminApproved: false,
      },
      include: {
        player: true,
      },
    });

    serializedPendingAuctions = pendingAuctions
      .filter(a => a.player && !squadIds.has(a.playerId) && !squadIds.has(a.player.id))
      .map(a => {
        const p: any = a.player;
        return {
          ...p,
          seasonSalary:    Number(a.agreedSalary || p.seasonSalary || 0),
          primeSignature:  Number(a.agreedPrime || p.primeSignature || 0),
          releaseClause:   a.agreedReleaseClause ? Number(a.agreedReleaseClause) : (p.releaseClause ? Number(p.releaseClause) : null),
          marketValue:     p.marketValue ? Number(p.marketValue) : null,
          lastNegotiatedAt: p.lastNegotiatedAt ? new Date(p.lastNegotiatedAt).toISOString() : null,
          awaitsAdmin:     a.personalTermsAgreed,
        };
      });
  } catch (err) {
    console.warn("ContractsPage: pendingAuctions query failed:", err);
  }

  // 3. Fetch pending transfers to this club
  let serializedPendingTransfers: any[] = [];
  try {
    const pendingTransfers = await prisma.transfer.findMany({
      where: {
        toClubId: clubId,
        status: "PENDING_PERSONAL_TERMS",
      },
      include: {
        player: true,
      },
    });

    serializedPendingTransfers = pendingTransfers
      .filter(t => t.player && !squadIds.has(t.playerId) && !squadIds.has(t.player.id))
      .map(t => {
        const p: any = t.player;
        return {
          ...p,
          seasonSalary:    Number(t.agreedSalary || p.seasonSalary || 0),
          primeSignature:  Number(t.agreedPrime || p.primeSignature || 0),
          releaseClause:   t.agreedReleaseClause ? Number(t.agreedReleaseClause) : (p.releaseClause ? Number(p.releaseClause) : null),
          marketValue:     p.marketValue ? Number(p.marketValue) : null,
          lastNegotiatedAt: p.lastNegotiatedAt ? new Date(p.lastNegotiatedAt).toISOString() : null,
          awaitsAdmin:     t.status === "APPROVED",
        };
      });
  } catch (err) {
    console.warn("ContractsPage: pendingTransfers query failed:", err);
  }

  let club = null;
  try {
    club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { name: true, budget: true },
    });
  } catch (err) {
    console.warn("ContractsPage: club fetch failed:", err);
  }

  // Combine pending signings, strictly exclude anyone already in squad, and deduplicate
  const allPendingSignings = [...serializedPendingAuctions, ...serializedPendingTransfers]
    .filter(p => !squadIds.has(p.id))
    .filter((p, index, self) => index === self.findIndex(x => x.id === p.id));

  return (
    <ContractsPayrollClient
      squad={serializedSquad}
      pendingSignings={allPendingSignings}
      clubId={clubId}
      clubName={club?.name ?? ""}
      clubBudget={Number(club?.budget ?? 0)}
    />
  );
}
