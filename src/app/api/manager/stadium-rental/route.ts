import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/manager/stadium-rental
//
// Returns:
//   - availableStadiums: clubs NOT hosting on the next matchday, with their
//     stadium info from the economy engine registry
//   - pendingOffers: outgoing offers sent by this club (PENDING)
//   - incomingOffers: offers received by this club (PENDING)
//   - activeRental: an ACCEPTED offer where this club rents another's stadium
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await auth();

  try {
    let clubId = session?.user?.clubId ?? null;
    let club = clubId
      ? await prisma.club.findUnique({
          where: { id: clubId },
          select: { id: true, name: true, leagueId: true },
        })
      : null;

    if (!club) {
      club = await prisma.club.findFirst({
        where: { name: { contains: "FAR Rabat" } },
        select: { id: true, name: true, leagueId: true },
      }) ?? await prisma.club.findFirst({ select: { id: true, name: true, leagueId: true } });
    }

    if (!club) return NextResponse.json({ error: "No club found" }, { status: 404 });

    // Find active season
    const activeSeason = await prisma.season.findFirst({
      where: { leagueId: club.leagueId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    // Find the next matchday for this club (when they ARE the home team)
    const nextHomeMatch = await prisma.match.findFirst({
      where: {
        homeClubId: club.id,
        status: "UPCOMING",
        ...(activeSeason ? { seasonId: activeSeason.id } : {}),
      },
      orderBy: { matchday: "asc" },
    });

    const nextMatchday = nextHomeMatch?.matchday ?? null;

    // Find clubs that are NOT hosting on that matchday (available to rent from)
    let availableStadiums: {
      clubId: string;
      clubName: string;
      stadiumName: string;
      capacity: number;
    }[] = [];

    if (nextMatchday !== null && activeSeason) {
      // Clubs hosting on that matchday
      const hostingClubIds = await prisma.match.findMany({
        where: { seasonId: activeSeason.id, matchday: nextMatchday, status: "UPCOMING" },
        select: { homeClubId: true },
      }).then((rows) => rows.map((r) => r.homeClubId));

      // All league clubs except our own and those hosting
      const leagueClubs = await prisma.club.findMany({
        where: {
          leagueId: club.leagueId,
          id: { notIn: [club.id, ...hostingClubIds] },
        },
        select: { id: true, name: true },
      });

      // Map to stadium info using our hardcoded registry (mirrors StadiumEconomyEngine)
      const STADIUM_REGISTRY: Record<string, { stadium: string; capacity: number }> = {
        "Raja Casablanca":       { stadium: "Stade Mohammed V",            capacity: 45_891 },
        "Wydad AC":              { stadium: "Stade Mohammed V",            capacity: 45_891 },
        "FAR Rabat":             { stadium: "Complexe Sportif Prince Moulay Abdellah", capacity: 52_000 },
        "FUS Rabat":             { stadium: "Stade Mustapha Moustapha Hassan",  capacity: 18_000 },
        "IR Tanger":             { stadium: "Grand Stade de Tanger",       capacity: 45_000 },
        "Hassania Agadir":       { stadium: "Stade Adrar",                 capacity: 45_480 },
        "Maghreb Fez":           { stadium: "Stade de Fès",                capacity: 45_000 },
        "Kawkab Marrakech":      { stadium: "Stade El Harti",              capacity: 15_000 },
        "COD Meknes":            { stadium: "Stade d'Honneur",             capacity: 20_000 },
        "Olympique Safi":        { stadium: "Stade El Massira",            capacity: 15_000 },
        "Difaa El Jadidi":       { stadium: "Stade El Abdi",               capacity: 12_000 },
        "Berkane":               { stadium: "Stade Municipal de Berkane",  capacity: 12_000 },
        "Renaissance Zemamra":   { stadium: "Stade Sidi Ali",              capacity: 8_000  },
        "Union Touarga":         { stadium: "Stade Ben Slimane",           capacity: 10_000 },
        "Dcheira":               { stadium: "Stade de Dcheira",            capacity: 8_000  },
        "Yacoub El Mansour":     { stadium: "Complexe Moulay Ismail",      capacity: 7_000  },
      };

      availableStadiums = leagueClubs.map((c) => {
        const reg = STADIUM_REGISTRY[c.name];
        return {
          clubId: c.id,
          clubName: c.name,
          stadiumName: reg?.stadium ?? `Stade de ${c.name}`,
          capacity: reg?.capacity ?? 10_000,
        };
      });
    }

    // Pending outgoing offers (sent by this club)
    const pendingOffers = await prisma.stadiumRentalOffer.findMany({
      where: { fromClubId: club.id, status: { in: ["PENDING", "PENDING_ADMIN_APPROVAL"] } },
      include: {
        toClub: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Incoming offers (received by this club)
    const incomingOffers = await prisma.stadiumRentalOffer.findMany({
      where: { toClubId: club.id, status: "PENDING" },
      include: {
        fromClub: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Active rental (accepted and approved offer where we are the renter)
    const activeRental = await prisma.stadiumRentalOffer.findFirst({
      where: { fromClubId: club.id, status: "ACCEPTED", adminApproved: true },
      include: {
        toClub: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      clubId: club.id,
      nextMatchday,
      seasonId: activeSeason?.id ?? null,
      availableStadiums,
      pendingOffers: pendingOffers.map((o) => ({
        id: o.id,
        toClubId: o.toClubId,
        toClubName: o.toClub.name,
        matchday: o.matchday,
        offerAmount: Number(o.offerAmount),
        status: o.status,
        createdAt: o.createdAt,
      })),
      incomingOffers: incomingOffers.map((o) => ({
        id: o.id,
        fromClubId: o.fromClubId,
        fromClubName: o.fromClub.name,
        matchday: o.matchday,
        offerAmount: Number(o.offerAmount),
        status: o.status,
        messageNote: o.messageNote,
        createdAt: o.createdAt,
      })),
      activeRental: activeRental
        ? {
            id: activeRental.id,
            toClubId: activeRental.toClubId,
            toClubName: activeRental.toClub.name,
            matchday: activeRental.matchday,
            offerAmount: Number(activeRental.offerAmount),
          }
        : null,
    });
  } catch (err) {
    console.error("[stadium-rental GET] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/manager/stadium-rental
// Body: { toClubId: string, matchday: number, seasonId: string, offerAmount: number, messageNote?: string }
// Sends a rental offer to another club
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { toClubId, matchday, seasonId, offerAmount, messageNote } = await req.json();

  if (!toClubId || !matchday || offerAmount <= 0) {
    return NextResponse.json({ error: "Invalid offer data" }, { status: 400 });
  }

  try {
    const fromClubId = session.user.clubId;

    // Cancel any existing PENDING offer to the same club/matchday first
    await prisma.stadiumRentalOffer.updateMany({
      where: { fromClubId, toClubId, matchday, status: "PENDING" },
      data: { status: "WITHDRAWN" },
    });

    const offer = await prisma.stadiumRentalOffer.create({
      data: {
        fromClubId,
        toClubId,
        matchday,
        seasonId: seasonId ?? null,
        offerAmount: new Prisma.Decimal(offerAmount),
        messageNote: messageNote ?? null,
        status: "PENDING",
      },
    });

    // Notify the receiving club's manager
    const toClub = await prisma.club.findUnique({
      where: { id: toClubId },
      select: { manager: { select: { id: true } }, name: true },
    });
    const fromClub = await prisma.club.findUnique({
      where: { id: fromClubId },
      select: { name: true },
    });

    if (toClub?.manager?.id) {
      await prisma.notification.create({
        data: {
          userId: toClub.manager.id,
          type: "STADIUM_RENTAL_OFFER_RECEIVED",
          message: `${fromClub?.name ?? "A club"} has sent you a stadium rental offer of €${Number(offerAmount).toLocaleString()} for Matchday ${matchday}.`,
        },
      });
    }

    return NextResponse.json({ success: true, offerId: offer.id });
  } catch (err) {
    console.error("[stadium-rental POST] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/manager/stadium-rental
// Body: { offerId: string, action: "ACCEPT" | "REJECT" }
// The stadium owner (toClub) responds to an offer
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { offerId, action } = await req.json();
  if (!offerId || !["ACCEPT", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const offer = await prisma.stadiumRentalOffer.findUnique({
      where: { id: offerId },
      include: {
        fromClub: { select: { name: true, manager: { select: { id: true } } } },
        toClub: { select: { name: true, id: true } },
      },
    });

    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    if (offer.toClubId !== session.user.clubId) {
      return NextResponse.json({ error: "Not your offer to respond to" }, { status: 403 });
    }
    if (offer.status !== "PENDING") {
      return NextResponse.json({ error: "Offer is no longer pending" }, { status: 409 });
    }

    const newStatus = action === "ACCEPT" ? "PENDING_ADMIN_APPROVAL" : "REJECTED";

    await prisma.stadiumRentalOffer.update({
      where: { id: offerId },
      data: { status: newStatus },
    });

    // Notify the requesting club's manager
    if (offer.fromClub.manager?.id) {
      const notifType = action === "ACCEPT"
        ? "STADIUM_RENTAL_OFFER_ACCEPTED"
        : "STADIUM_RENTAL_OFFER_REJECTED";
      const notifMsg = action === "ACCEPT"
        ? `🤝 ${offer.toClub.name} accepted your stadium rental offer of €${Number(offer.offerAmount).toLocaleString()} for Matchday ${offer.matchday}! It is now awaiting League Administration approval before venue changes are finalized.`
        : `❌ ${offer.toClub.name} rejected your stadium rental offer for Matchday ${offer.matchday}.`;

      await prisma.notification.create({
        data: {
          userId: offer.fromClub.manager.id,
          type: notifType,
          message: notifMsg,
        },
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("[stadium-rental PATCH] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
