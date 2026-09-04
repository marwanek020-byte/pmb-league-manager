import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContractsPayrollClient } from "@/components/manager/contracts/ContractsPayrollClient";

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

  // 2. Fetch pending signings (Won auctions awaiting 3D contract negotiation or Admin approval)
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

    serializedPendingAuctions = pendingAuctions.map(a => {
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
        status: { in: ["PENDING_PERSONAL_TERMS", "APPROVED"] },
      },
      include: {
        player: true,
      },
    });

    serializedPendingTransfers = pendingTransfers.map(t => {
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

  // Combine pending signings and deduplicate by player ID
  const allPendingSignings = [...serializedPendingAuctions];
  for (const pt of serializedPendingTransfers) {
    if (!allPendingSignings.some(p => p.id === pt.id)) {
      allPendingSignings.push(pt);
    }
  }

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
