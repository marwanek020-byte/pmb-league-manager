import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/manager/stadium/confirm-prices
 * Body: { standardPrice: number, vipPrice: number }
 *
 * Saves the manager's confirmed ticket prices to their next upcoming home match.
 * If no next match exists, returns a 404.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const standardPrice = Number(body?.standardPrice);
  const vipPrice      = Number(body?.vipPrice ?? 0);

  if (!standardPrice || standardPrice < 1 || standardPrice > 500) {
    return NextResponse.json({ error: "Invalid standard ticket price (1–500)" }, { status: 400 });
  }

  const clubId = session.user.clubId;

  try {
    // Find next upcoming home match
    const activeSeason = await prisma.season.findFirst({
      where: {
        league: { clubs: { some: { id: clubId } } },
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    const nextMatch = await prisma.match.findFirst({
      where: {
        homeClubId: clubId,
        status: "UPCOMING",
        ...(activeSeason ? { seasonId: activeSeason.id } : {}),
      },
      orderBy: { matchday: "asc" },
    });

    if (!nextMatch) {
      return NextResponse.json({ error: "No upcoming home match found" }, { status: 404 });
    }

    if (nextMatch.ticketPriceConfirmed) {
      return NextResponse.json(
        { error: `Ticket prices for Matchday ${nextMatch.matchday} have already been confirmed and cannot be modified.` },
        { status: 403 }
      );
    }

    const updated = await prisma.match.update({
      where: { id: nextMatch.id },
      data: {
        standardTicketPrice:  new Prisma.Decimal(standardPrice),
        vipTicketPrice:       vipPrice > 0 ? new Prisma.Decimal(vipPrice) : null,
        ticketPriceConfirmed: true,
      },
      select: { id: true, matchday: true, standardTicketPrice: true, vipTicketPrice: true },
    });

    return NextResponse.json({
      success:        true,
      matchId:        updated.id,
      matchday:       updated.matchday,
      standardPrice:  Number(updated.standardTicketPrice),
      vipPrice:       updated.vipTicketPrice ? Number(updated.vipTicketPrice) : null,
    });
  } catch (err) {
    console.error("[confirm-prices] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/manager/stadium/confirm-prices
 *
 * Returns the current confirmed price state for the manager's next home match,
 * so the dashboard can show the "prices confirmed" badge on load.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.clubId) {
    return NextResponse.json({ confirmed: false, matchday: null });
  }

  const clubId = session.user.clubId;

  try {
    const nextMatch = await prisma.match.findFirst({
      where: { homeClubId: clubId, status: "UPCOMING" },
      orderBy: { matchday: "asc" },
      select: {
        id: true,
        matchday: true,
        standardTicketPrice: true,
        vipTicketPrice: true,
        ticketPriceConfirmed: true,
      },
    });

    if (!nextMatch) return NextResponse.json({ confirmed: false, matchday: null });

    return NextResponse.json({
      confirmed:     nextMatch.ticketPriceConfirmed,
      matchId:       nextMatch.id,
      matchday:      nextMatch.matchday,
      standardPrice: nextMatch.standardTicketPrice ? Number(nextMatch.standardTicketPrice) : null,
      vipPrice:      nextMatch.vipTicketPrice ? Number(nextMatch.vipTicketPrice) : null,
    });
  } catch (err) {
    console.error("[confirm-prices GET] Error:", err);
    return NextResponse.json({ confirmed: false, matchday: null });
  }
}
