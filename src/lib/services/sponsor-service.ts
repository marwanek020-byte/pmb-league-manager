import { prisma } from "@/lib/prisma";
import { Prisma, BudgetTransactionType } from "@prisma/client";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";
import {
  BOTOLA_SPONSORS,
  DRAFT_ORDER,
  SponsorDefinition,
  DraftTurnConfig,
} from "@/lib/constants/sponsors";

type TxClient = Prisma.TransactionClient;

export async function getOrCreateDraftSession() {
  let session = await prisma.sponsorDraftSession.findUnique({
    where: { id: "botola-s2-draft" },
  });

  if (!session) {
    session = await prisma.sponsorDraftSession.create({
      data: {
        id: "botola-s2-draft",
        currentTurnIndex: 0,
        isCompleted: false,
      },
    });
  }

  return session;
}

export async function getSponsorDraftState() {
  const session = await getOrCreateDraftSession();

  // Find all active/drafted contracts for this draft session
  const draftedContracts = await prisma.clubSponsorContract.findMany({
    include: {
      club: {
        select: { id: true, name: true, logo: true },
      },
    },
  });

  const draftedMap = new Map<string, { clubId: string; clubName: string; clubLogo: string | null }>();
  for (const c of draftedContracts) {
    draftedMap.set(c.sponsorId, {
      clubId: c.clubId,
      clubName: c.club.name,
      clubLogo: c.club.logo,
    });
  }

  const allSponsorsWithStatus = BOTOLA_SPONSORS.map((s) => ({
    ...s,
    isDrafted: draftedMap.has(s.id),
    draftedBy: draftedMap.get(s.id) || null,
  }));

  const currentTurnConfig: DraftTurnConfig | null =
    session.currentTurnIndex < DRAFT_ORDER.length
      ? DRAFT_ORDER[session.currentTurnIndex]
      : null;

  return {
    session,
    currentTurnIndex: session.currentTurnIndex,
    isCompleted: session.isCompleted || session.currentTurnIndex >= DRAFT_ORDER.length,
    currentTurnConfig,
    draftOrder: DRAFT_ORDER,
    sponsors: allSponsorsWithStatus,
    draftedContracts,
  };
}

export async function makeDraftPick({
  clubId,
  sponsorId,
  actorUserId,
  isAdmin = false,
}: {
  clubId: string;
  sponsorId: string;
  actorUserId?: string | null;
  isAdmin?: boolean;
}) {
  const session = await getOrCreateDraftSession();

  if (session.isCompleted || session.currentTurnIndex >= DRAFT_ORDER.length) {
    throw new Error("The Sponsor Draft is already completed!");
  }

  const currentTurn = DRAFT_ORDER[session.currentTurnIndex];

  // Resolve club by ID or name
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, budget: true },
  });

  if (!club) throw new Error("Club not found.");

  // Check if it is this club's turn (or admin override)
  const isClubTurn =
    club.name.toLowerCase().includes(currentTurn.clubName.toLowerCase()) ||
    currentTurn.clubName.toLowerCase().includes(club.name.toLowerCase());

  if (!isClubTurn && !isAdmin) {
    throw new Error(
      `It is not your turn yet! Current turn belongs to ${currentTurn.clubName} (Position #${currentTurn.position}).`
    );
  }

  // Find sponsor definition
  const sponsor = BOTOLA_SPONSORS.find((s) => s.id === sponsorId);
  if (!sponsor) throw new Error("Invalid sponsor selected.");

  // Check if sponsor already taken
  const alreadyTaken = await prisma.clubSponsorContract.findFirst({
    where: { sponsorId },
  });
  if (alreadyTaken) {
    throw new Error(`${sponsor.name} has already been drafted by another club!`);
  }

  // Check existing picks for this club in this draft
  const clubPicks = await prisma.clubSponsorContract.findMany({
    where: { clubId: club.id },
  });

  const nextSlotNumber = clubPicks.length + 1;
  const slotRule = currentTurn.allowedPicks.find((p) => p.slotNumber === nextSlotNumber);

  if (!slotRule) {
    throw new Error(`${club.name} has already drafted all their allowed sponsors (${currentTurn.allowedPicks.length})!`);
  }

  // Verify class requirement
  if (!slotRule.requiredClass.includes(sponsor.sponsorClass)) {
    throw new Error(
      `Slot #${nextSlotNumber} requires a sponsor from: ${slotRule.requiredClass.join(", ")}, but ${sponsor.name} is ${sponsor.sponsorClass}.`
    );
  }

  // 1. Create the contract
  const contract = await prisma.clubSponsorContract.create({
    data: {
      clubId: club.id,
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      sponsorClass: sponsor.sponsorClass,
      slotNumber: nextSlotNumber,
      baseValue: new Prisma.Decimal(sponsor.baseValue.toString()),
      winBonus: new Prisma.Decimal(sponsor.winBonus.toString()),
      drawBonus: new Prisma.Decimal(sponsor.drawBonus.toString()),
      status: "ACTIVE",
      consecutiveLosses: 0,
    },
  });

  // 2. Check if this club finished all their allowed picks
  const isClubFinished = nextSlotNumber >= currentTurn.allowedPicks.length;
  let nextTurnIndex = session.currentTurnIndex;
  let isCompleted = false;

  if (isClubFinished) {
    nextTurnIndex = session.currentTurnIndex + 1;
    if (nextTurnIndex >= DRAFT_ORDER.length) {
      isCompleted = true;
    }
  }

  await prisma.sponsorDraftSession.update({
    where: { id: "botola-s2-draft" },
    data: {
      currentTurnIndex: nextTurnIndex,
      isCompleted,
    },
  });

  // 3. Log activity
  await prisma.activityLog.create({
    data: {
      action: "SPONSOR_DRAFT_PICK",
      actorUserId: actorUserId ?? null,
      entityId: club.id,
      entityType: "Club",
      metadata: {
        clubName: club.name,
        sponsorName: sponsor.name,
        sponsorClass: sponsor.sponsorClass,
        slotNumber: nextSlotNumber,
        baseValue: sponsor.baseValue,
        winBonus: sponsor.winBonus,
        drawBonus: sponsor.drawBonus,
        turnAdvanced: isClubFinished,
        nextTurnIndex,
      },
    },
  });

  return {
    success: true,
    contract,
    isClubFinished,
    nextTurnIndex,
    isCompleted,
  };
}

/**
 * Applies match bonuses for active sponsors when an admin enters match results.
 * MUST only be executed for active/new season matches.
 */
export async function applySponsorMatchRewards(
  tx: TxClient,
  matchId: string,
  homeClubId: string,
  awayClubId: string,
  homeGoals: number,
  awayGoals: number,
  isNewSeasonMatch: boolean
): Promise<void> {
  // Only process if this is for the new season
  if (!isNewSeasonMatch) return;

  const isHomeWin = homeGoals > awayGoals;
  const isAwayWin = awayGoals > homeGoals;
  const isDraw = homeGoals === awayGoals;

  // Fetch active sponsor contracts
  const homeContracts = await tx.clubSponsorContract.findMany({
    where: { clubId: homeClubId, status: "ACTIVE" },
  });

  const awayContracts = await tx.clubSponsorContract.findMany({
    where: { clubId: awayClubId, status: "ACTIVE" },
  });

  // ── 1. Process Home Club ──────────────────────────────────────────────────
  if (isHomeWin) {
    // Win: Reset consecutive losses, award win bonuses
    await tx.clubSponsorContract.updateMany({
      where: { clubId: homeClubId, status: "ACTIVE" },
      data: { consecutiveLosses: 0 },
    });

    for (const contract of homeContracts) {
      const currentBudget = await lockClubBudget(tx, homeClubId);
      await applyBudgetTransaction(tx, {
        clubId: homeClubId,
        amount: contract.winBonus,
        currentBudget,
        type: BudgetTransactionType.COMPETITION_REWARD,
        description: `Sponsor Win Bonus: ${contract.sponsorName}`,
        matchId,
      });
    }
  } else if (isDraw) {
    // Draw: Reset consecutive losses, award draw bonuses
    await tx.clubSponsorContract.updateMany({
      where: { clubId: homeClubId, status: "ACTIVE" },
      data: { consecutiveLosses: 0 },
    });

    for (const contract of homeContracts) {
      const currentBudget = await lockClubBudget(tx, homeClubId);
      await applyBudgetTransaction(tx, {
        clubId: homeClubId,
        amount: contract.drawBonus,
        currentBudget,
        type: BudgetTransactionType.COMPETITION_REWARD,
        description: `Sponsor Draw Bonus: ${contract.sponsorName}`,
        matchId,
      });
    }
  } else {
    // Loss: Increment consecutive losses. If >= 5, terminate!
    for (const contract of homeContracts) {
      const newLosses = contract.consecutiveLosses + 1;
      if (newLosses >= 5) {
        await tx.clubSponsorContract.update({
          where: { id: contract.id },
          data: {
            consecutiveLosses: newLosses,
            status: "TERMINATED_5_LOSSES",
            terminatedAt: new Date(),
          },
        });
      } else {
        await tx.clubSponsorContract.update({
          where: { id: contract.id },
          data: { consecutiveLosses: newLosses },
        });
      }
    }
  }

  // ── 2. Process Away Club ──────────────────────────────────────────────────
  if (isAwayWin) {
    // Win: Reset consecutive losses, award win bonuses
    await tx.clubSponsorContract.updateMany({
      where: { clubId: awayClubId, status: "ACTIVE" },
      data: { consecutiveLosses: 0 },
    });

    for (const contract of awayContracts) {
      const currentBudget = await lockClubBudget(tx, awayClubId);
      await applyBudgetTransaction(tx, {
        clubId: awayClubId,
        amount: contract.winBonus,
        currentBudget,
        type: BudgetTransactionType.COMPETITION_REWARD,
        description: `Sponsor Win Bonus: ${contract.sponsorName}`,
        matchId,
      });
    }
  } else if (isDraw) {
    // Draw: Reset consecutive losses, award draw bonuses
    await tx.clubSponsorContract.updateMany({
      where: { clubId: awayClubId, status: "ACTIVE" },
      data: { consecutiveLosses: 0 },
    });

    for (const contract of awayContracts) {
      const currentBudget = await lockClubBudget(tx, awayClubId);
      await applyBudgetTransaction(tx, {
        clubId: awayClubId,
        amount: contract.drawBonus,
        currentBudget,
        type: BudgetTransactionType.COMPETITION_REWARD,
        description: `Sponsor Draw Bonus: ${contract.sponsorName}`,
        matchId,
      });
    }
  } else {
    // Loss: Increment consecutive losses. If >= 5, terminate!
    for (const contract of awayContracts) {
      const newLosses = contract.consecutiveLosses + 1;
      if (newLosses >= 5) {
        await tx.clubSponsorContract.update({
          where: { id: contract.id },
          data: {
            consecutiveLosses: newLosses,
            status: "TERMINATED_5_LOSSES",
            terminatedAt: new Date(),
          },
        });
      } else {
        await tx.clubSponsorContract.update({
          where: { id: contract.id },
          data: { consecutiveLosses: newLosses },
        });
      }
    }
  }
}
