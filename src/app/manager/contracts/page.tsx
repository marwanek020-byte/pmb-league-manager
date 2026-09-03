import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContractsPayrollClient } from "@/components/manager/contracts/ContractsPayrollClient";

export const metadata = {
  title: "العقود والرواتب · PMB League Manager",
  description: "إدارة عقود ورواتب لاعبي فريقك في البطولة الاحترافية المغربية",
};

export default async function ContractsPage() {
  const session = await auth();
  if (!session || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  // 1. Fetch official registered squad players
  const squad = await prisma.player.findMany({
    where: { pmbClubId: session.user.clubId, status: "REGISTERED" },
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

  // 2. Fetch pending signings (Won auctions awaiting 3D contract negotiation or Admin approval)
  const pendingAuctions = await prisma.auction.findMany({
    where: {
      currentWinnerClubId: session.user.clubId,
      status: "COMPLETED",
      adminApproved: false,
      player: {
        OR: [
          { pmbClubId: null },
          { pmbClubId: { not: session.user.clubId } },
          { status: "AVAILABLE" },
          { contractSeasonsLeft: 0 },
        ],
      },
    },
    include: {
      player: {
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
      },
    },
  });

  // 3. Fetch pending transfers to this club (awaiting personal terms or Admin approval)
  const pendingTransfers = await prisma.transfer.findMany({
    where: {
      toClubId: session.user.clubId,
      status: { in: ["PENDING_PERSONAL_TERMS", "APPROVED"] },
    },
    include: {
      player: {
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
      },
    },
  });

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    select: { name: true, budget: true },
  });

  // Serialize Decimal fields
  const serializedSquad = squad.map(p => ({
    ...p,
    seasonSalary:    Number(p.seasonSalary),
    primeSignature:  Number(p.primeSignature),
    releaseClause:   p.releaseClause ? Number(p.releaseClause) : null,
    marketValue:     p.marketValue ? Number(p.marketValue) : null,
    lastNegotiatedAt: p.lastNegotiatedAt?.toISOString() ?? null,
  }));

  const serializedPendingAuctions = pendingAuctions.map(a => ({
    ...a.player,
    seasonSalary:    Number(a.agreedSalary || a.player.seasonSalary),
    primeSignature:  Number(a.agreedPrime || a.player.primeSignature),
    releaseClause:   a.agreedReleaseClause ? Number(a.agreedReleaseClause) : (a.player.releaseClause ? Number(a.player.releaseClause) : null),
    marketValue:     a.player.marketValue ? Number(a.player.marketValue) : null,
    lastNegotiatedAt: a.player.lastNegotiatedAt?.toISOString() ?? null,
    awaitsAdmin:     a.personalTermsAgreed,
  }));

  const serializedPendingTransfers = pendingTransfers.map(t => ({
    ...t.player,
    seasonSalary:    Number(t.agreedSalary || t.player.seasonSalary),
    primeSignature:  Number(t.agreedPrime || t.player.primeSignature),
    releaseClause:   t.agreedReleaseClause ? Number(t.agreedReleaseClause) : (t.player.releaseClause ? Number(t.player.releaseClause) : null),
    marketValue:     t.player.marketValue ? Number(t.player.marketValue) : null,
    lastNegotiatedAt: t.player.lastNegotiatedAt?.toISOString() ?? null,
    awaitsAdmin:     t.status === "APPROVED",
  }));

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
      clubId={session.user.clubId}
      clubName={club?.name ?? ""}
      clubBudget={Number(club?.budget ?? 0)}
    />
  );
}
