import { Prisma, BudgetTransactionType, MissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";
import {
  RELATIVE_MATCHDAY_MISSION_PAIRS,
  LONG_TERM_MISSION_TEMPLATES,
  TRANSFER_MISSION_TEMPLATES,
} from "@/lib/constants/mission-templates";

type TxClient = Prisma.TransactionClient;

/**
 * Generate relative/complementary missions for all fixtures of a given matchday.
 */
export async function generateMatchdayMissions(params: {
  seasonId: string;
  matchday: number;
  leagueId?: string;
}) {
  const { seasonId, matchday, leagueId } = params;

  // Find all matches for this matchday
  const matches = await prisma.match.findMany({
    where: {
      seasonId,
      matchday,
      ...(leagueId ? { leagueId } : {}),
    },
    include: {
      homeClub: { select: { id: true, name: true } },
      awayClub: { select: { id: true, name: true } },
    },
  });

  if (matches.length === 0) {
    throw new Error(`No matches found for matchday ${matchday} in this season.`);
  }

  const createdMissions = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    // Check if missions already exist for this match
    const existing = await prisma.clubMission.findFirst({
      where: { matchId: match.id },
    });

    if (existing) {
      continue; // Skip if already generated
    }

    // Pick a complementary pair (cycle through templates or use deterministic index)
    const pair =
      RELATIVE_MATCHDAY_MISSION_PAIRS[
        i % RELATIVE_MATCHDAY_MISSION_PAIRS.length
      ];

    // Create Home Mission
    const homeMission = await prisma.clubMission.create({
      data: {
        clubId: match.homeClubId,
        category: "MATCHDAY",
        title: pair.home.titleTemplate,
        description: `VS ${match.awayClub.name}: ${pair.home.descriptionTemplate}`,
        conditionType: pair.home.conditionType,
        targetValue: pair.home.targetValue,
        rewardAmount: new Prisma.Decimal(pair.home.rewardAmount),
        penaltyAmount: new Prisma.Decimal(pair.home.penaltyAmount),
        status: "ACTIVE",
        startMatchday: matchday,
        endMatchday: matchday,
        matchId: match.id,
        seasonId,
        leagueId: match.leagueId,
      },
    });

    // Create Away Mission
    const awayMission = await prisma.clubMission.create({
      data: {
        clubId: match.awayClubId,
        category: "MATCHDAY",
        title: pair.away.titleTemplate,
        description: `VS ${match.homeClub.name}: ${pair.away.descriptionTemplate}`,
        conditionType: pair.away.conditionType,
        targetValue: pair.away.targetValue,
        rewardAmount: new Prisma.Decimal(pair.away.rewardAmount),
        penaltyAmount: new Prisma.Decimal(pair.away.penaltyAmount),
        status: "ACTIVE",
        startMatchday: matchday,
        endMatchday: matchday,
        matchId: match.id,
        pairedMissionId: homeMission.id,
        seasonId,
        leagueId: match.leagueId,
      },
    });

    // Update Home Mission with paired ID
    await prisma.clubMission.update({
      where: { id: homeMission.id },
      data: { pairedMissionId: awayMission.id },
    });

    createdMissions.push(homeMission, awayMission);
  }

  return {
    totalMatches: matches.length,
    missionsCreated: createdMissions.length,
    missions: createdMissions,
  };
}

/**
 * Generate long-term missions across multi-matchday spans.
 */
export async function generateLongTermMissions(params: {
  seasonId: string;
  leagueId: string;
  startMatchday: number;
  clubIds?: string[];
}) {
  const { seasonId, leagueId, startMatchday, clubIds } = params;

  const clubs = await prisma.club.findMany({
    where: {
      leagueId,
      ...(clubIds && clubIds.length > 0 ? { id: { in: clubIds } } : {}),
    },
    select: { id: true, name: true },
  });

  const created = [];

  for (const club of clubs) {
    // Pick a random long-term template
    const template =
      LONG_TERM_MISSION_TEMPLATES[
        Math.floor(Math.random() * LONG_TERM_MISSION_TEMPLATES.length)
      ];

    const mission = await prisma.clubMission.create({
      data: {
        clubId: club.id,
        category: "LONG_TERM",
        title: template.title,
        description: template.description,
        conditionType: template.conditionType,
        targetValue: template.targetValue,
        rewardAmount: new Prisma.Decimal(template.rewardAmount),
        penaltyAmount: new Prisma.Decimal(template.penaltyAmount),
        status: "ACTIVE",
        startMatchday,
        endMatchday: startMatchday + template.spanMatchdays - 1,
        seasonId,
        leagueId,
      },
    });

    created.push(mission);
  }

  return { count: created.length, missions: created };
}

/**
 * Generate transfer missions for all clubs during a transfer window.
 */
export async function generateTransferMissions(params: {
  seasonId?: string;
  leagueId?: string;
}) {
  const { seasonId, leagueId } = params;

  const clubs = await prisma.club.findMany({
    where: {
      ...(leagueId ? { leagueId } : {}),
    },
    select: { id: true, leagueId: true },
  });

  const created = [];

  for (const club of clubs) {
    for (const template of TRANSFER_MISSION_TEMPLATES) {
      const existing = await prisma.clubMission.findFirst({
        where: {
          clubId: club.id,
          category: "TRANSFER",
          conditionType: template.conditionType,
          status: "ACTIVE",
        },
      });

      if (existing) continue;

      const mission = await prisma.clubMission.create({
        data: {
          clubId: club.id,
          category: "TRANSFER",
          title: template.title,
          description: template.description,
          conditionType: template.conditionType,
          targetValue: template.targetValue,
          rewardAmount: new Prisma.Decimal(template.rewardAmount),
          penaltyAmount: new Prisma.Decimal(template.penaltyAmount),
          status: "ACTIVE",
          seasonId,
          leagueId: club.leagueId,
        },
      });

      created.push(mission);
    }
  }

  return { count: created.length, missions: created };
}

/**
 * Reverses any mission rewards or penalties associated with a match.
 * Called when a match result is deleted or reset.
 */
export async function reverseMatchMissions(
  tx: TxClient,
  matchId: string
): Promise<void> {
  const missions = await tx.clubMission.findMany({
    where: {
      matchId,
      status: { in: ["COMPLETED", "FAILED"] },
    },
  });

  for (const mission of missions) {
    if (mission.status === "COMPLETED") {
      // Deduct reward
      const currentBudget = await lockClubBudget(tx, mission.clubId);
      await applyBudgetTransaction(tx, {
        clubId: mission.clubId,
        amount: mission.rewardAmount.negated(),
        currentBudget,
        type: BudgetTransactionType.MISSION_REWARD,
        description: `Reversed: Mission reward (${mission.title})`,
        matchId,
      });
    } else if (mission.status === "FAILED") {
      // Refund penalty
      const currentBudget = await lockClubBudget(tx, mission.clubId);
      await applyBudgetTransaction(tx, {
        clubId: mission.clubId,
        amount: mission.penaltyAmount,
        currentBudget,
        type: BudgetTransactionType.MISSION_PENALTY,
        description: `Reversed: Mission penalty refund (${mission.title})`,
        matchId,
      });
    }

    // Reset status to ACTIVE
    await tx.clubMission.update({
      where: { id: mission.id },
      data: {
        status: "ACTIVE",
        completedAt: null,
        failedAt: null,
      },
    });
  }
}

/**
 * Evaluates matchday missions and updates long-term mission progress for both clubs.
 * Must be executed within a transaction `tx` during match result submission.
 */
export async function evaluateMatchMissions(
  tx: TxClient,
  matchId: string,
  homeClubId: string,
  awayClubId: string,
  homeGoals: number,
  awayGoals: number
): Promise<{ evaluatedMissions: number }> {
  // First reverse any previous evaluations if this match was re-submitted
  await reverseMatchMissions(tx, matchId);

  // Find all ACTIVE matchday missions for this match
  const matchMissions = await tx.clubMission.findMany({
    where: {
      matchId,
      status: "ACTIVE",
    },
  });

  for (const mission of matchMissions) {
    const isHome = mission.clubId === homeClubId;
    const teamGoals = isHome ? homeGoals : awayGoals;
    const oppGoals = isHome ? awayGoals : homeGoals;

    let passed = false;

    switch (mission.conditionType) {
      case "SCORE_AT_LEAST":
        passed = teamGoals >= (mission.targetValue ?? 0);
        break;

      case "CONCEDE_AT_MOST":
        passed = oppGoals <= (mission.targetValue ?? 99);
        break;

      case "WIN_MATCH":
        passed = teamGoals > oppGoals;
        break;

      case "DRAW_OR_WIN":
        passed = teamGoals >= oppGoals;
        break;

      case "CLEAN_SHEET":
        passed = oppGoals === 0;
        break;

      case "WIN_BY_MARGIN":
        passed = teamGoals - oppGoals >= (mission.targetValue ?? 1);
        break;

      case "SCORE_AND_DRAW_OR_WIN":
        passed =
          teamGoals >= (mission.targetValue ?? 1) && teamGoals >= oppGoals;
        break;

      case "CONCEDE_MAX_AND_WIN":
        passed =
          oppGoals <= (mission.targetValue ?? 99) && teamGoals > oppGoals;
        break;

      default:
        break;
    }

    if (passed) {
      // Mark COMPLETED & Award Money
      await tx.clubMission.update({
        where: { id: mission.id },
        data: {
          status: "COMPLETED",
          currentProgress: mission.targetValue ?? 1,
          completedAt: new Date(),
        },
      });

      const currentBudget = await lockClubBudget(tx, mission.clubId);
      await applyBudgetTransaction(tx, {
        clubId: mission.clubId,
        amount: mission.rewardAmount,
        currentBudget,
        type: BudgetTransactionType.MISSION_REWARD,
        description: `Mission Completed: ${mission.title}`,
        matchId,
      });
    } else {
      // Mark FAILED & Deduct Penalty
      await tx.clubMission.update({
        where: { id: mission.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
        },
      });

      const currentBudget = await lockClubBudget(tx, mission.clubId);
      // Ensure we don't crash if penalty is larger than remaining budget
      const penalty = mission.penaltyAmount.negated();
      const actualDeduction = currentBudget.plus(penalty).isNegative()
        ? currentBudget.negated() // zero out if budget insufficient
        : penalty;

      if (!actualDeduction.isZero()) {
        await applyBudgetTransaction(tx, {
          clubId: mission.clubId,
          amount: actualDeduction,
          currentBudget,
          type: BudgetTransactionType.MISSION_PENALTY,
          description: `Mission Failed: ${mission.title}`,
          matchId,
        });
      }
    }
  }

  // ── Now evaluate LONG-TERM missions for both clubs ──────────────────────────
  for (const clubId of [homeClubId, awayClubId]) {
    const longTermMissions = await tx.clubMission.findMany({
      where: {
        clubId,
        category: "LONG_TERM",
        status: "ACTIVE",
      },
    });

    for (const lt of longTermMissions) {
      // Fetch all completed matches for this club up to the current match's matchday
      const clubMatches = await tx.match.findMany({
        where: {
          OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
          status: "COMPLETED",
          ...(lt.seasonId ? { seasonId: lt.seasonId } : {}),
          ...(lt.startMatchday ? { matchday: { gte: lt.startMatchday } } : {}),
        },
        orderBy: { matchday: "asc" },
      });

      let progress = 0;
      let missionCompleted = false;
      let missionFailed = false;

      const target = lt.targetValue ?? 1;

      if (lt.conditionType === "SCORE_TOTAL") {
        for (const m of clubMatches) {
          progress += m.homeClubId === clubId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
        }
        if (progress >= target) missionCompleted = true;
      } else if (lt.conditionType === "WIN_STREAK") {
        let currentStreak = 0;
        let maxStreak = 0;
        for (const m of clubMatches) {
          const won =
            (m.homeClubId === clubId && (m.homeGoals ?? 0) > (m.awayGoals ?? 0)) ||
            (m.awayClubId === clubId && (m.awayGoals ?? 0) > (m.homeGoals ?? 0));
          if (won) {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          } else {
            currentStreak = 0;
          }
        }
        progress = maxStreak;
        if (progress >= target) missionCompleted = true;
      } else if (lt.conditionType === "UNBEATEN_STREAK") {
        let currentStreak = 0;
        let maxStreak = 0;
        for (const m of clubMatches) {
          const unbeaten =
            (m.homeClubId === clubId && (m.homeGoals ?? 0) >= (m.awayGoals ?? 0)) ||
            (m.awayClubId === clubId && (m.awayGoals ?? 0) >= (m.homeGoals ?? 0));
          if (unbeaten) {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          } else {
            currentStreak = 0;
          }
        }
        progress = maxStreak;
        if (progress >= target) missionCompleted = true;
      } else if (lt.conditionType === "CLEAN_SHEETS_COUNT") {
        for (const m of clubMatches) {
          const oppG = m.homeClubId === clubId ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
          if (oppG === 0) progress++;
        }
        if (progress >= target) missionCompleted = true;
      }

      // Check if mission reached end matchday
      const latestMatchday = clubMatches.length > 0 ? clubMatches[clubMatches.length - 1].matchday : 0;
      if (!missionCompleted && lt.endMatchday && latestMatchday >= lt.endMatchday) {
        missionFailed = true;
      }

      if (missionCompleted) {
        await tx.clubMission.update({
          where: { id: lt.id },
          data: {
            status: "COMPLETED",
            currentProgress: progress,
            completedAt: new Date(),
          },
        });

        const currentBudget = await lockClubBudget(tx, clubId);
        await applyBudgetTransaction(tx, {
          clubId,
          amount: lt.rewardAmount,
          currentBudget,
          type: BudgetTransactionType.MISSION_REWARD,
          description: `Long-Term Mission Completed: ${lt.title}`,
          matchId,
        });
      } else if (missionFailed) {
        await tx.clubMission.update({
          where: { id: lt.id },
          data: {
            status: "FAILED",
            currentProgress: progress,
            failedAt: new Date(),
          },
        });

        const currentBudget = await lockClubBudget(tx, clubId);
        const penalty = lt.penaltyAmount.negated();
        const actualDeduction = currentBudget.plus(penalty).isNegative()
          ? currentBudget.negated()
          : penalty;

        if (!actualDeduction.isZero()) {
          await applyBudgetTransaction(tx, {
            clubId,
            amount: actualDeduction,
            currentBudget,
            type: BudgetTransactionType.MISSION_PENALTY,
            description: `Long-Term Mission Expired: ${lt.title}`,
            matchId,
          });
        }
      } else {
        // Just update progress
        await tx.clubMission.update({
          where: { id: lt.id },
          data: { currentProgress: progress },
        });
      }
    }
  }

  return { evaluatedMissions: matchMissions.length };
}

/**
 * Evaluates active transfer missions for a club when a transfer is completed.
 */
export async function evaluateTransferMissions(
  tx: TxClient,
  clubId: string,
  playerMarketValue: number
) {
  const activeMissions = await tx.clubMission.findMany({
    where: {
      clubId,
      category: "TRANSFER",
      status: "ACTIVE",
    },
  });

  for (const mission of activeMissions) {
    if (mission.conditionType === "COMPLETE_TRANSFERS") {
      const newProgress = mission.currentProgress + 1;
      const target = mission.targetValue ?? 1;

      if (newProgress >= target) {
        await tx.clubMission.update({
          where: { id: mission.id },
          data: {
            status: "COMPLETED",
            currentProgress: newProgress,
            completedAt: new Date(),
          },
        });

        const currentBudget = await lockClubBudget(tx, clubId);
        await applyBudgetTransaction(tx, {
          clubId,
          amount: mission.rewardAmount,
          currentBudget,
          type: BudgetTransactionType.MISSION_REWARD,
          description: `Transfer Mission Completed: ${mission.title}`,
        });
      } else {
        await tx.clubMission.update({
          where: { id: mission.id },
          data: { currentProgress: newProgress },
        });
      }
    } else if (mission.conditionType === "SIGN_PLAYER_VALUE") {
      const targetVal = mission.targetValue ?? 5_000_000;
      if (playerMarketValue >= targetVal) {
        await tx.clubMission.update({
          where: { id: mission.id },
          data: {
            status: "COMPLETED",
            currentProgress: playerMarketValue,
            completedAt: new Date(),
          },
        });

        const currentBudget = await lockClubBudget(tx, clubId);
        await applyBudgetTransaction(tx, {
          clubId,
          amount: mission.rewardAmount,
          currentBudget,
          type: BudgetTransactionType.MISSION_REWARD,
          description: `Transfer Mission Completed: ${mission.title}`,
        });
      }
    }
  }
}

