import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeTransfer } from "@/lib/serialize-transfer";
import { TransferStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: TransferStatus[] = ["PENDING_SELLER_APPROVAL", "APPROVED"];

export async function GET() {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId;

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
      select: { id: true, name: true, logo: true, budget: true },
    });

    const [windowRecord, awaitingCount, activeCount, completedCount, rejectedCount] = await Promise.all([
      prisma.transferWindow.findUnique({ where: { id: "singleton" } }),
      prisma.transfer.count({ where: { fromClubId: clubId, status: "PENDING_SELLER_APPROVAL" } }),
      prisma.transfer.count({ where: { toClubId: clubId, status: { in: ACTIVE_STATUSES } } }),
      prisma.transfer.count({
        where: { status: "COMPLETED", OR: [{ fromClubId: clubId }, { toClubId: clubId }] },
      }),
      prisma.transfer.count({
        where: { status: "REJECTED", OR: [{ fromClubId: clubId }, { toClubId: clubId }] },
      }),
    ]);

    // Fetch incoming (bids you initiated as buyer)
    const incomingRaw = await prisma.transfer.findMany({
      where: { toClubId: clubId },
      include: {
        player: true,
        fromClub: { select: { id: true, name: true, logo: true } },
        toClub: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Fetch outgoing (offers sent for your players as seller)
    const outgoingRaw = await prisma.transfer.findMany({
      where: { fromClubId: clubId },
      include: {
        player: true,
        fromClub: { select: { id: true, name: true, logo: true } },
        toClub: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Fetch completed
    const completedRaw = await prisma.transfer.findMany({
      where: { status: "COMPLETED", OR: [{ fromClubId: clubId }, { toClubId: clubId }] },
      include: {
        player: true,
        fromClub: { select: { id: true, name: true, logo: true } },
        toClub: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    // Fetch rejected
    const rejectedRaw = await prisma.transfer.findMany({
      where: { status: "REJECTED", OR: [{ fromClubId: clubId }, { toClubId: clubId }] },
      include: {
        player: true,
        fromClub: { select: { id: true, name: true, logo: true } },
        toClub: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      club: {
        id: club?.id ?? clubId,
        name: club?.name ?? "Your Club",
        logo: club?.logo ?? null,
        budget: Number(club?.budget ?? 0),
      },
      windowOpen: windowRecord?.isOpen ?? false,
      stats: {
        awaitingMyApproval: awaitingCount,
        myActiveRequests: activeCount,
        completed: completedCount,
        rejected: rejectedCount,
      },
      incoming: incomingRaw.map(serializeTransfer),
      outgoing: outgoingRaw.map(serializeTransfer),
      completed: completedRaw.map(serializeTransfer),
      rejected: rejectedRaw.map(serializeTransfer),
    });
  } catch (error) {
    console.error("Error fetching app transfer window data:", error);
    return NextResponse.json({ error: "Failed to load transfer data" }, { status: 500 });
  }
}
