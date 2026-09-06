import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";
import { StadiumEconomyEngine } from "@/lib/services/stadium-economy-engine";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: { offerId: string } };

/**
 * PATCH /api/admin/stadium-rentals/[offerId]
 * Body: { action: "APPROVE" | "REJECT" }
 *
 * Admin approves or rejects a stadium rental agreement that was accepted by both managers.
 * Upon approval:
 *  1. Rental fee transferred between clubs
 *  2. Match venue relocated to owner's stadium
 *  3. Official PMB Dugout announcement posted
 *  4. Both club managers notified
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await req.json().catch(() => ({}));
  if (!["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Must be APPROVE or REJECT." }, { status: 400 });
  }

  const { offerId } = params;

  try {
    const offer = await prisma.stadiumRentalOffer.findUnique({
      where: { id: offerId },
      include: {
        fromClub: {
          select: {
            id: true,
            name: true,
            manager: { select: { id: true, username: true } },
          },
        },
        toClub: {
          select: {
            id: true,
            name: true,
            manager: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Rental offer not found." }, { status: 404 });
    }

    if (offer.status !== "PENDING_ADMIN_APPROVAL") {
      return NextResponse.json(
        { error: `Offer is not pending admin approval (current status: ${offer.status}).` },
        { status: 409 }
      );
    }

    const reg = StadiumEconomyEngine.BOTOLA_STADIUM_REGISTRY[offer.toClub.name];
    const venueName = reg?.stadium ?? `Stade de ${offer.toClub.name}`;

    if (action === "REJECT") {
      await prisma.stadiumRentalOffer.update({
        where: { id: offerId },
        data: { status: "REJECTED", adminApproved: false },
      });

      // Notify both managers
      const rejectMsg = `❌ League administration has rejected the stadium rental agreement between ${offer.fromClub.name} and ${offer.toClub.name} for Matchday ${offer.matchday}.`;
      if (offer.fromClub.manager?.id) {
        await prisma.notification.create({
          data: {
            userId: offer.fromClub.manager.id,
            type: "STADIUM_RENTAL_OFFER_REJECTED",
            message: rejectMsg,
          },
        });
      }
      if (offer.toClub.manager?.id) {
        await prisma.notification.create({
          data: {
            userId: offer.toClub.manager.id,
            type: "STADIUM_RENTAL_OFFER_REJECTED",
            message: rejectMsg,
          },
        });
      }

      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    // ── APPROVE FLOW ─────────────────────────────────────────────────────────
    let linkedMatchId: string | null = null;

    await prisma.$transaction(async (tx) => {
      // 1. Transfer rental fee
      const renterBudget = await lockClubBudget(tx, offer.fromClubId);
      await applyBudgetTransaction(tx, {
        clubId: offer.fromClubId,
        amount: new Prisma.Decimal(offer.offerAmount).negated(),
        currentBudget: renterBudget,
        type: "STADIUM_RENTAL_FEE",
        description: `Stadium rental fee — Matchday ${offer.matchday} at ${venueName} (${offer.toClub.name})`,
      });

      const ownerBudget = await lockClubBudget(tx, offer.toClubId);
      await applyBudgetTransaction(tx, {
        clubId: offer.toClubId,
        amount: new Prisma.Decimal(offer.offerAmount),
        currentBudget: ownerBudget,
        type: "STADIUM_RENTAL_INCOME",
        description: `Stadium rental income from ${offer.fromClub.name} — Matchday ${offer.matchday}`,
      });

      // 2. Relocate upcoming match venue
      let match = await tx.match.findFirst({
        where: {
          homeClubId: offer.fromClubId,
          matchday: offer.matchday,
          ...(offer.seasonId ? { seasonId: offer.seasonId } : {}),
        },
      });

      if (!match) {
        match = await tx.match.findFirst({
          where: {
            homeClubId: offer.fromClubId,
            matchday: offer.matchday,
          },
          orderBy: { createdAt: "desc" },
        });
      }

      if (match) {
        linkedMatchId = match.id;
        await tx.match.update({
          where: { id: match.id },
          data: {
            overrideStadiumName: venueName,
            overrideHostClubId: offer.toClubId,
          },
        });
      }

      // 3. Mark offer accepted and approved
      await tx.stadiumRentalOffer.update({
        where: { id: offerId },
        data: {
          status: "ACCEPTED",
          adminApproved: true,
          linkedMatchId,
        },
      });
    });

    // ── Dugout Social Announcement ───────────────────────────────────────────
    try {
      const mediaBotId = await (UltrasSocialService as any).getOrCreateBotUser("pmb_sports_media", "ADMINISTRATOR");
      const postContent = `📍 **OFFICIEL | موافقة الرابطة على نقل ملعب المباراة** 🏟️
━━━━━━━━━━━━━━━━━━━━━━━━━━
وافقت إدارة **PMB League** رسمياً على طلب نادي **${offer.fromClub.name}** بخوض مباراته في الجولة **${offer.matchday}** على أرضية **${venueName}** التابع لنادي **${offer.toClub.name}**.

🤝 جاء هذا النقل بعد اتفاق ودي بين إدارتي الناديين ودفع رسوم الإيجار البالغة **€${Number(offer.offerAmount).toLocaleString()}**.

#PMBLeague #BotolaPro #StadiumRental #ملاعب_البطولة`;

      await prisma.post.create({
        data: {
          content: postContent,
          tag: "STATEMENT",
          userId: mediaBotId,
          clubId: offer.fromClubId,
        },
      });
    } catch (socialErr) {
      console.error("[admin stadium-rentals] Failed to post social announcement:", socialErr);
    }

    // ── Notifications to Managers ────────────────────────────────────────────
    const approveMsgRenter = `✅ League administration has approved your stadium rental agreement! Your Matchday ${offer.matchday} home match will be played at ${venueName}. Rental fee €${Number(offer.offerAmount).toLocaleString()} transferred.`;
    const approveMsgOwner = `✅ League administration has approved your stadium rental agreement with ${offer.fromClub.name}! Rental income €${Number(offer.offerAmount).toLocaleString()} credited to your club budget.`;

    if (offer.fromClub.manager?.id) {
      await prisma.notification.create({
        data: {
          userId: offer.fromClub.manager.id,
          type: "STADIUM_RENTAL_OFFER_ACCEPTED",
          message: approveMsgRenter,
        },
      });
    }

    if (offer.toClub.manager?.id) {
      await prisma.notification.create({
        data: {
          userId: offer.toClub.manager.id,
          type: "STADIUM_RENTAL_OFFER_ACCEPTED",
          message: approveMsgOwner,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: "ACCEPTED",
      linkedMatchId,
      venueName,
    });
  } catch (err) {
    console.error("[admin stadium-rentals PATCH] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
