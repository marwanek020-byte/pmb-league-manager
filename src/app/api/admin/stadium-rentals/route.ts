import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stadium-rentals
 * Lists stadium rental requests requiring administrator approval,
 * as well as recent approved/rejected rentals.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pendingRentals = await prisma.stadiumRentalOffer.findMany({
      where: { status: "PENDING_ADMIN_APPROVAL" },
      include: {
        fromClub: { select: { id: true, name: true, logo: true } },
        toClub: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const recentRentals = await prisma.stadiumRentalOffer.findMany({
      where: {
        status: { in: ["ACCEPTED", "REJECTED"] },
      },
      include: {
        fromClub: { select: { id: true, name: true, logo: true } },
        toClub: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      pending: pendingRentals.map((r) => ({
        id: r.id,
        matchday: r.matchday,
        fromClub: r.fromClub,
        toClub: r.toClub,
        offerAmount: Number(r.offerAmount),
        messageNote: r.messageNote,
        createdAt: r.createdAt,
      })),
      recent: recentRentals.map((r) => ({
        id: r.id,
        matchday: r.matchday,
        fromClub: r.fromClub,
        toClub: r.toClub,
        offerAmount: Number(r.offerAmount),
        status: r.status,
        adminApproved: r.adminApproved,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("[admin stadium-rentals GET] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
