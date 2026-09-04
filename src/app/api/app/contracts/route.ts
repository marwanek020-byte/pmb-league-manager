import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId;

    // Fallback if not logged in or no club assigned
    if (!clubId) {
      const farRabat = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
      });
      clubId = farRabat?.id || (await prisma.club.findFirst())?.id;
    }

    if (!clubId) {
      return NextResponse.json({ error: "No club found" }, { status: 404 });
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        logo: true,
        budget: true,
        league: { select: { name: true, country: true } },
      },
    });

    const isBotola =
      club?.league?.name?.toUpperCase().includes("BOTOLA") ||
      club?.league?.country?.toLowerCase() === "morocco" ||
      false;

    // 1. Registered squad players
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

    const serializedSquad = squad.map((p) => ({
      ...p,
      seasonSalary: Number(p.seasonSalary ?? 0),
      primeSignature: Number(p.primeSignature ?? 0),
      contractSeasonsLeft: p.contractSeasonsLeft ?? 1,
      squadRole: p.squadRole ?? "IMPORTANT",
      contractSatisfaction: p.contractSatisfaction ?? 85,
      releaseClause: p.releaseClause ? Number(p.releaseClause) : null,
      marketValue: p.marketValue ? Number(p.marketValue) : null,
      lastNegotiatedAt: p.lastNegotiatedAt?.toISOString() ?? null,
    }));

    // Deduplicate squad if duplicate player records exist
    const squadMap = new Map<string, any>();
    for (const p of serializedSquad) {
      const name = (p.fullName || "").trim().toLowerCase();
      const existing = squadMap.get(name);
      if (!existing || Number(p.seasonSalary || 0) > Number(existing.seasonSalary || 0)) {
        squadMap.set(name, p);
      }
    }
    const finalSquad = Array.from(squadMap.values());
    const squadIds = new Set(finalSquad.map((p) => p.id));
    const squadNames = new Set(finalSquad.map((p) => (p.fullName || "").trim().toLowerCase()));

    // 2. Pending signings (won auctions awaiting personal terms)
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

    const serializedPendingAuctions = pendingAuctions
      .filter(
        (a) =>
          a.player &&
          !squadIds.has(a.playerId) &&
          !squadIds.has(a.player.id) &&
          !squadNames.has((a.player.fullName || "").trim().toLowerCase())
      )
      .map((a) => {
        const p: any = a.player;
        return {
          ...p,
          seasonSalary: Number(a.agreedSalary || p.seasonSalary || 0),
          primeSignature: Number(a.agreedPrime || p.primeSignature || 0),
          releaseClause: a.agreedReleaseClause
            ? Number(a.agreedReleaseClause)
            : p.releaseClause
            ? Number(p.releaseClause)
            : null,
          marketValue: p.marketValue ? Number(p.marketValue) : null,
          lastNegotiatedAt: p.lastNegotiatedAt
            ? new Date(p.lastNegotiatedAt).toISOString()
            : null,
          awaitsAdmin: a.personalTermsAgreed,
        };
      });

    // 3. Pending transfers
    const pendingTransfers = await prisma.transfer.findMany({
      where: {
        toClubId: clubId,
        status: { in: ["PENDING_PERSONAL_TERMS", "APPROVED"] },
      },
      include: {
        player: true,
      },
    });

    const serializedPendingTransfers = pendingTransfers
      .filter(
        (t) =>
          t.player &&
          !squadIds.has(t.playerId) &&
          !squadIds.has(t.player.id) &&
          !squadNames.has((t.player.fullName || "").trim().toLowerCase())
      )
      .map((t) => {
        const p: any = t.player;
        return {
          ...p,
          seasonSalary: Number(t.agreedSalary || p.seasonSalary || 0),
          primeSignature: Number(t.agreedPrime || p.primeSignature || 0),
          releaseClause: t.agreedReleaseClause
            ? Number(t.agreedReleaseClause)
            : p.releaseClause
            ? Number(p.releaseClause)
            : null,
          marketValue: p.marketValue ? Number(p.marketValue) : null,
          lastNegotiatedAt: p.lastNegotiatedAt
            ? new Date(p.lastNegotiatedAt).toISOString()
            : null,
          awaitsAdmin: t.status === "APPROVED",
        };
      });

    const allPendingSignings = [
      ...serializedPendingAuctions,
      ...serializedPendingTransfers,
    ].filter(
      (p, index, self) =>
        index ===
        self.findIndex(
          (x) =>
            x.id === p.id ||
            (x.fullName || "").trim().toLowerCase() ===
              (p.fullName || "").trim().toLowerCase()
        )
    );

    return NextResponse.json({
      club: {
        id: club?.id ?? clubId,
        name: club?.name ?? "",
        logo: club?.logo ?? null,
        budget: Number(club?.budget ?? 0),
      },
      isBotola,
      squad: finalSquad,
      pendingSignings: allPendingSignings,
    });
  } catch (error) {
    console.error("Error fetching app contracts data:", error);
    return NextResponse.json(
      { error: "Failed to load contracts data" },
      { status: 500 }
    );
  }
}
