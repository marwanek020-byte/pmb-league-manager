/**
 * expired-contracts-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 * 1. Automatic transfer of expired unrenewed player contracts to Admin Custody.
 * 2. Admin decision: Launch live auction OR Release to Free Agent Market (0 € fee).
 * 3. Manager direct contract negotiation & signing of Free Agents without club fee.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";
import { validateForeignQuota } from "@/lib/services/botola-contract-service";
import type { NegotiationOffer } from "@/lib/services/botola-contract-service";

export class ExpiredContractsService {
  /**
   * 1. Scan and transfer all players whose contracts have expired (contractSeasonsLeft <= 0)
   *    and whose managers haven't renewed them, transferring them directly to Admin Custody.
   */
  static async checkAndTransferExpiredContracts() {
    // Find all players registered to a club whose contract has reached 0 seasons
    const expiredPlayers = await prisma.player.findMany({
      where: {
        pmbClubId: { not: null },
        contractSeasonsLeft: { lte: 0 },
      },
      include: {
        pmbClub: { select: { id: true, name: true, managerId: true } },
      },
    });

    if (expiredPlayers.length === 0) {
      return { transferredCount: 0, players: [] };
    }

    const transferred: Array<{ id: string; name: string; formerClub: string }> = [];

    for (const player of expiredPlayers) {
      const formerClubId = player.pmbClubId!;
      const formerClubName = player.pmbClub?.name || "ناديه السابق";
      const managerId = player.pmbClub?.managerId;

      await prisma.$transaction(async (tx) => {
        // Strip player from club & place into Admin Custody
        await tx.player.update({
          where: { id: player.id },
          data: {
            pmbClubId: null,
            status: "AVAILABLE",
            isFreeAgentMarket: false,
            adminCustodyStatus: "PENDING_ADMIN_DECISION",
            expiredFromClubId: formerClubId,
            expiredFromClubName: formerClubName,
            contractExpiredAt: new Date(),
            contractSeasonsLeft: 0,
            seasonSalary: 0,
            primeSignature: 0,
            releaseClause: null,
            contractSatisfaction: 80,
          },
        });

        // Send alert notification to former club manager if applicable
        if (managerId) {
          await tx.notification.create({
            data: {
              userId: managerId,
              type: "TRANSFER_COMPLETED",
              message: `⚠️ انتهى رسمياً عقد اللاعب ${player.fullName} دون تجديد. تم سحب بطاقة اللاعب ونقلها إلى عهدة الإدارة (Admin Custody) لاتخاذ القرار.`,
            },
          });
        }
      });

      // Announce on Ultras Social
      UltrasSocialService.publishTransferAnnouncement({
        playerName: player.fullName,
        position: player.position,
        overallRating: player.overallRating ?? 75,
        feeEur: 0,
        fromClubName: formerClubName,
        toClubName: "عهدة الإدارة (Admin Custody)",
        transferType: "FREE_TRANSFER",
      }).catch(() => {});

      transferred.push({
        id: player.id,
        name: player.fullName,
        formerClub: formerClubName,
      });
    }

    return {
      transferredCount: transferred.length,
      players: transferred,
    };
  }

  /**
   * 2. Query all players currently in Admin Custody awaiting decision.
   */
  static async getAdminExpiredCustodyPlayers() {
    return await prisma.player.findMany({
      where: {
        adminCustodyStatus: "PENDING_ADMIN_DECISION",
        pmbClubId: null,
      },
      orderBy: { contractExpiredAt: "desc" },
    });
  }

  /**
   * 3. Admin Option B: Release player to Free Agent Market with NO market value (0 €).
   *    Managers can talk directly with the player and his agent about salary and contract terms.
   */
  static async adminReleaseToFreeAgentMarket(adminUserId: string, playerId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMINISTRATOR") {
      throw new Error("Unauthorized: Only Administrators can release players to the Free Agent Market.");
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, fullName: true, position: true, overallRating: true, expiredFromClubName: true },
    });

    if (!player) {
      throw new Error("Player not found.");
    }

    const updated = await prisma.player.update({
      where: { id: playerId },
      data: {
        marketValue: new Prisma.Decimal(0), // No market value (0 € transfer fee)
        isFreeAgentMarket: true,
        adminCustodyStatus: "FREE_AGENT_MARKET",
        status: "AVAILABLE",
        pmbClubId: null,
      },
    });

    // Announce to Ultras Social Network
    UltrasSocialService.publishTransferAnnouncement({
      playerName: player.fullName,
      position: player.position,
      overallRating: player.overallRating ?? 75,
      feeEur: 0,
      fromClubName: "سوق اللاعبين الأحرار",
      toClubName: "متاح للتفاوض المباشر (0 €)",
      transferType: "FREE_TRANSFER",
    }).catch(() => {});

    return {
      success: true,
      message: `تم طرح اللاعب ${player.fullName} رسمياً في سوق اللاعبين الأحرار (Free Agent) بقيمة انتقال مجانية (0 €). بإمكان الأندية الآن التفاوض المباشر معه على الأجر والعقد!`,
      player: updated,
    };
  }

  /**
   * 4. Query players available on the Free Agent Market (0 € market value, open for direct contract talk).
   *    Attaches hasFailedAttempt indicating if the inquiring club has already used their 1 chance.
   */
  static async getFreeAgentMarketPlayers(search?: string, currentClubId?: string) {
    const whereClause: Prisma.PlayerWhereInput = {
      isFreeAgentMarket: true,
      pmbClubId: null,
      status: "AVAILABLE",
    };

    if (search && search.trim().length > 0) {
      const q = search.trim();
      whereClause.AND = [
        {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { position: { contains: q, mode: "insensitive" } },
            { nationality: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const players = await prisma.player.findMany({
      where: whereClause,
      orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
      take: 60,
    });

    return players.map((p) => {
      const failedClubs = (p.failedFreeAgentClubIds || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const hasFailedAttempt = currentClubId ? failedClubs.includes(currentClubId) : false;
      return {
        ...p,
        marketValue: 0,
        hasFailedAttempt,
      };
    });
  }

  /**
   * 5. Record that a club failed its negotiation with a free agent (1 chance rule).
   */
  static async recordFailedFreeAgentNegotiation(playerId: string, clubId: string) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, failedFreeAgentClubIds: true, fullName: true },
    });

    if (!player) return;

    const existingClubs = (player.failedFreeAgentClubIds || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (!existingClubs.includes(clubId)) {
      existingClubs.push(clubId);
      await prisma.player.update({
        where: { id: playerId },
        data: {
          failedFreeAgentClubIds: existingClubs.join(","),
        },
      });
    }
  }

  /**
   * 6. Manager direct signing of a Free Agent:
   *    No transfer fee is paid to any club!
   *    The manager just pays the agreed signing bonus (prime de signature) if any,
   *    and commits to the season salary within the 0 - 400K cap.
   *    Strictly enforces the ONE CHANCE rule.
   */
  static async signFreeAgentDirect(
    clubId: string,
    playerId: string,
    agreedTerms: NegotiationOffer
  ) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new Error("Player not found.");
    }

    if (player.pmbClubId != null) {
      throw new Error("This player already belongs to a club.");
    }

    if (!player.isFreeAgentMarket) {
      throw new Error("This player is not currently listed on the Free Agent Market.");
    }

    // Enforce 1-chance rule: Check if club has already failed negotiation with this free agent
    const failedClubs = (player.failedFreeAgentClubIds || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (failedClubs.includes(clubId)) {
      throw new Error("⛔ لقد استنفد ناديك فرصته الوحيدة للتفاوض مع هذا اللاعب. رفض الوكيل واللاعب التوقيع بعد فشل المحادثات السابقة.");
    }

    // Validate foreign player quota for this club
    await validateForeignQuota(clubId, player.nationality);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true, budget: true },
    });

    if (!club) {
      throw new Error("Club not found.");
    }

    const primeSignature = Number(agreedTerms.primeSignature || 0);
    const seasonSalary = Math.min(400_000, Math.max(0, Number(agreedTerms.seasonSalary || 0)));

    if (primeSignature > Number(club.budget)) {
      throw new Error(
        `Insufficient club budget for signing bonus. Required: ${primeSignature.toLocaleString(
          "fr-MA"
        )} €, Available: ${Number(club.budget).toLocaleString("fr-MA")} €.`
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalBalance = new Prisma.Decimal(club.budget);

      // Debit signing bonus if applicable
      if (primeSignature > 0) {
        const currentBudget = await lockClubBudget(tx, clubId);
        finalBalance = await applyBudgetTransaction(tx, {
          clubId,
          amount: new Prisma.Decimal(primeSignature).negated(),
          currentBudget,
          type: "PRIME_DE_SIGNATURE",
          description: `منحة توقيع للاعب الحر: ${player.fullName}`,
          playerId: player.id,
        });
      }

      // Register player to club
      const updatedPlayer = await tx.player.update({
        where: { id: player.id },
        data: {
          pmbClubId: clubId,
          status: "REGISTERED",
          isFreeAgentMarket: false,
          adminCustodyStatus: null,
          contractSeasonsLeft: agreedTerms.contractSeasonsLeft || 2,
          seasonSalary: new Prisma.Decimal(seasonSalary),
          primeSignature: new Prisma.Decimal(primeSignature),
          squadRole: agreedTerms.squadRole || "IMPORTANT",
          releaseClause: agreedTerms.releaseClause ? new Prisma.Decimal(agreedTerms.releaseClause) : null,
          contractSatisfaction: 90,
          lastNegotiatedAt: new Date(),
        },
      });

      return {
        player: updatedPlayer,
        clubBudgetAfter: Number(finalBalance),
      };
    });

    // Announce to Ultras Social Network
    UltrasSocialService.publishTransferAnnouncement({
      playerName: player.fullName,
      position: player.position,
      overallRating: player.overallRating ?? 75,
      feeEur: 0,
      fromClubName: "لاعب حر (Free Agent)",
      toClubName: club.name,
      buyerClubId: club.id,
      transferType: "FREE_TRANSFER",
    }).catch(() => {});

    return {
      success: true,
      message: `تم التعاقد رسمياً مع اللاعب الحر ${player.fullName} بنجاح! براتب سنوي ${seasonSalary.toLocaleString(
        "fr-MA"
      )} €${primeSignature > 0 ? ` ومنحة توقيع ${primeSignature.toLocaleString("fr-MA")} €` : ""}. تم تسجيل اللاعب في تشكيلة ${club.name}.`,
      player: result.player,
      clubBudgetAfter: result.clubBudgetAfter,
    };
  }
}
