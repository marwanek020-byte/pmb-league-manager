import { prisma } from "@/lib/prisma";
import { Prisma, CupStage, MatchEventType } from "@prisma/client";
import { lockClubBudget, applyBudgetTransaction } from "@/lib/services/budget-service";
import { BudgetTransactionType } from "@prisma/client";

// Stage Prize Configuration (Increases by €2M each round)
export const STAGE_CONFIG: Record<
  CupStage,
  { label: string; prize: Prisma.Decimal; linkedMatchday: number; matchesCount: number }
> = {
  ROUND_OF_16: {
    label: "Round of 16 (ثمن النهائي)",
    prize: new Prisma.Decimal("2000000"), // €2M
    linkedMatchday: 4,
    matchesCount: 8,
  },
  QUARTER_FINALS: {
    label: "Quarter-Finals (ربع النهائي)",
    prize: new Prisma.Decimal("4000000"), // €4M
    linkedMatchday: 8,
    matchesCount: 4,
  },
  SEMI_FINALS: {
    label: "Semi-Finals (نصف النهائي)",
    prize: new Prisma.Decimal("6000000"), // €6M
    linkedMatchday: 12,
    matchesCount: 2,
  },
  FINAL: {
    label: "Grand Final (النهائي الكبير)",
    prize: new Prisma.Decimal("8000000"), // €8M (Champion Prize)
    linkedMatchday: 16,
    matchesCount: 1,
  },
};

export interface CupEventInput {
  type: MatchEventType;
  clubId: string;
  playerId: string;
  assistPlayerId?: string | null;
  minute?: number | null;
}

export interface SaveCupMatchResultInput {
  homeGoals: number;
  awayGoals: number;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  isPenaltyShootout?: boolean;
  manOfTheMatchId?: string | null;
  events?: CupEventInput[];
}

export class ThroneCupService {
  /**
   * Find Botola Pro league in DB.
   */
  public static async getBotolaLeague() {
    return prisma.league.findFirst({
      where: { name: { contains: "BOTOLA", mode: "insensitive" } },
      include: {
        clubs: {
          orderBy: { name: "asc" },
        },
      },
    });
  }

  /**
   * Get active Throne Cup or initialize a new bracket for Botola Pro.
   */
  public static async getOrInitializeCup(forceRegenerate = false) {
    const botolaLeague = await this.getBotolaLeague();
    if (!botolaLeague) {
      throw new Error("Botola Pro league not found in the system.");
    }

    let cup = await prisma.throneCup.findFirst({
      where: { leagueId: botolaLeague.id },
      include: {
        championClub: true,
        matches: {
          include: {
            homeClub: true,
            awayClub: true,
            winnerClub: true,
            manOfTheMatch: true,
            events: {
              include: { player: true },
            },
          },
          orderBy: [{ linkedMatchday: "asc" }, { matchOrder: "asc" }],
        },
      },
    });

    if (cup && !forceRegenerate) {
      return cup;
    }

    if (cup && forceRegenerate) {
      await prisma.throneCup.delete({ where: { id: cup.id } });
    }

    // Initialize 16-team tournament tree
    const clubs = [...botolaLeague.clubs];
    // Seed / shuffle clubs
    const shuffledClubs = clubs.sort(() => Math.random() - 0.5);

    const newCup = await prisma.$transaction(async (tx) => {
      const createdCup = await tx.throneCup.create({
        data: {
          leagueId: botolaLeague.id,
          name: "Throne Cup (كأس العرش)",
          season: "2026/2027",
        },
      });

      // 1. Create Round of 16 (8 matches) with paired clubs
      for (let i = 1; i <= 8; i++) {
        const home = shuffledClubs[(i - 1) * 2] || null;
        const away = shuffledClubs[(i - 1) * 2 + 1] || null;

        await tx.throneCupMatch.create({
          data: {
            cupId: createdCup.id,
            stage: CupStage.ROUND_OF_16,
            matchOrder: i,
            linkedMatchday: 4,
            homeClubId: home?.id ?? null,
            awayClubId: away?.id ?? null,
            prizeAmount: STAGE_CONFIG.ROUND_OF_16.prize,
            nextMatchOrder: Math.ceil(i / 2),
          },
        });
      }

      // 2. Create Quarter-Finals (4 empty match slots)
      for (let i = 1; i <= 4; i++) {
        await tx.throneCupMatch.create({
          data: {
            cupId: createdCup.id,
            stage: CupStage.QUARTER_FINALS,
            matchOrder: i,
            linkedMatchday: 8,
            prizeAmount: STAGE_CONFIG.QUARTER_FINALS.prize,
            nextMatchOrder: Math.ceil(i / 2),
          },
        });
      }

      // 3. Create Semi-Finals (2 empty match slots)
      for (let i = 1; i <= 2; i++) {
        await tx.throneCupMatch.create({
          data: {
            cupId: createdCup.id,
            stage: CupStage.SEMI_FINALS,
            matchOrder: i,
            linkedMatchday: 12,
            prizeAmount: STAGE_CONFIG.SEMI_FINALS.prize,
            nextMatchOrder: 1,
          },
        });
      }

      // 4. Create Grand Final (1 empty match slot)
      await tx.throneCupMatch.create({
        data: {
          cupId: createdCup.id,
          stage: CupStage.FINAL,
          matchOrder: 1,
          linkedMatchday: 16,
          prizeAmount: STAGE_CONFIG.FINAL.prize,
          nextMatchOrder: null,
        },
      });

      return createdCup;
    });

    return prisma.throneCup.findUnique({
      where: { id: newCup.id },
      include: {
        championClub: true,
        matches: {
          include: {
            homeClub: true,
            awayClub: true,
            winnerClub: true,
            manOfTheMatch: true,
            events: {
              include: { player: true },
            },
          },
          orderBy: [{ linkedMatchday: "asc" }, { matchOrder: "asc" }],
        },
      },
    });
  }

  /**
   * Save a cup match result, award progressive round prize, and advance winner to next stage.
   */
  public static async saveMatchResult(matchId: string, input: SaveCupMatchResultInput) {
    const match = await prisma.throneCupMatch.findUnique({
      where: { id: matchId },
      include: { cup: true },
    });

    if (!match) throw new Error("Match not found.");
    if (!match.homeClubId || !match.awayClubId) {
      throw new Error("Both clubs must be set before recording a result.");
    }

    // Determine winner
    let winnerClubId: string | null = null;
    let isPenaltyShootout = Boolean(input.isPenaltyShootout);

    if (input.homeGoals > input.awayGoals) {
      winnerClubId = match.homeClubId;
      isPenaltyShootout = false;
    } else if (input.awayGoals > input.homeGoals) {
      winnerClubId = match.awayClubId;
      isPenaltyShootout = false;
    } else {
      // Draw -> requires penalties
      isPenaltyShootout = true;
      const homePens = input.homePenalties ?? 0;
      const awayPens = input.awayPenalties ?? 0;
      if (homePens === awayPens) {
        throw new Error("A knockout cup match cannot end in a draw. Please enter penalty shootout scores.");
      }
      winnerClubId = homePens > awayPens ? match.homeClubId : match.awayClubId;
    }

    const stageConfig = STAGE_CONFIG[match.stage];
    const prizeToAward = stageConfig.prize;

    return prisma.$transaction(async (tx) => {
      // 1. Delete previous events
      await tx.throneCupMatchEvent.deleteMany({ where: { matchId } });

      // 2. Insert new events
      if (input.events && input.events.length > 0) {
        await tx.throneCupMatchEvent.createMany({
          data: input.events.map((ev) => ({
            matchId,
            clubId: ev.clubId,
            playerId: ev.playerId,
            type: ev.type,
            assistPlayerId: ev.assistPlayerId || null,
            minute: ev.minute || null,
          })),
        });
      }

      // 3. Award prize money to winner if not already awarded
      if (!match.prizeAwarded && winnerClubId) {
        const currentBudget = await lockClubBudget(tx, winnerClubId);
        await applyBudgetTransaction(tx, {
          clubId: winnerClubId,
          amount: prizeToAward,
          currentBudget,
          type: BudgetTransactionType.COMPETITION_REWARD,
          description: `Throne Cup: ${stageConfig.label} Winner Prize (+€${Number(prizeToAward) / 1000000}M)`,
        });
      }

      // 4. Update current match
      const updatedMatch = await tx.throneCupMatch.update({
        where: { id: matchId },
        data: {
          homeGoals: input.homeGoals,
          awayGoals: input.awayGoals,
          homePenalties: input.homePenalties ?? null,
          awayPenalties: input.awayPenalties ?? null,
          isPenaltyShootout,
          winnerClubId,
          status: "COMPLETED",
          playedAt: new Date(),
          manOfTheMatchId: input.manOfTheMatchId || null,
          prizeAwarded: true,
        },
      });

      // 5. Automatically advance winner to next stage
      let nextStage: CupStage | null = null;
      if (match.stage === CupStage.ROUND_OF_16) nextStage = CupStage.QUARTER_FINALS;
      else if (match.stage === CupStage.QUARTER_FINALS) nextStage = CupStage.SEMI_FINALS;
      else if (match.stage === CupStage.SEMI_FINALS) nextStage = CupStage.FINAL;

      if (nextStage && match.nextMatchOrder && winnerClubId) {
        const slotKey = match.matchOrder % 2 === 1 ? "homeClubId" : "awayClubId";
        await tx.throneCupMatch.update({
          where: {
            cupId_stage_matchOrder: {
              cupId: match.cupId,
              stage: nextStage,
              matchOrder: match.nextMatchOrder,
            },
          },
          data: {
            [slotKey]: winnerClubId,
          },
        });
      }

      // 6. If Grand Final, set champion on ThroneCup
      if (match.stage === CupStage.FINAL && winnerClubId) {
        await tx.throneCup.update({
          where: { id: match.cupId },
          data: { championClubId: winnerClubId },
        });
      }

      return updatedMatch;
    });
  }

  /**
   * Cancel and reset a cup match result, reverse prize, and reset next bracket slot.
   */
  public static async cancelMatchResult(matchId: string) {
    const match = await prisma.throneCupMatch.findUnique({
      where: { id: matchId },
      include: { cup: true },
    });

    if (!match) throw new Error("Match not found.");

    const stageConfig = STAGE_CONFIG[match.stage];
    const previousWinner = match.winnerClubId;

    return prisma.$transaction(async (tx) => {
      // 1. Reverse financial reward if awarded
      if (match.prizeAwarded && previousWinner) {
        const currentBudget = await lockClubBudget(tx, previousWinner);
        await applyBudgetTransaction(tx, {
          clubId: previousWinner,
          amount: stageConfig.prize.negated(),
          currentBudget,
          type: BudgetTransactionType.COMPETITION_REWARD,
          description: `Reversed: Throne Cup ${stageConfig.label} Prize (-€${Number(stageConfig.prize) / 1000000}M)`,
        });
      }

      // 2. Clear next stage slot if applicable
      let nextStage: CupStage | null = null;
      if (match.stage === CupStage.ROUND_OF_16) nextStage = CupStage.QUARTER_FINALS;
      else if (match.stage === CupStage.QUARTER_FINALS) nextStage = CupStage.SEMI_FINALS;
      else if (match.stage === CupStage.SEMI_FINALS) nextStage = CupStage.FINAL;

      if (nextStage && match.nextMatchOrder) {
        const slotKey = match.matchOrder % 2 === 1 ? "homeClubId" : "awayClubId";
        await tx.throneCupMatch.update({
          where: {
            cupId_stage_matchOrder: {
              cupId: match.cupId,
              stage: nextStage,
              matchOrder: match.nextMatchOrder,
            },
          },
          data: {
            [slotKey]: null,
          },
        });
      }

      // 3. Clear champion if Final
      if (match.stage === CupStage.FINAL) {
        await tx.throneCup.update({
          where: { id: match.cupId },
          data: { championClubId: null },
        });
      }

      // 4. Delete events
      await tx.throneCupMatchEvent.deleteMany({ where: { matchId } });

      // 5. Reset match back to UPCOMING
      const resetMatch = await tx.throneCupMatch.update({
        where: { id: matchId },
        data: {
          homeGoals: null,
          awayGoals: null,
          homePenalties: null,
          awayPenalties: null,
          isPenaltyShootout: false,
          winnerClubId: null,
          status: "UPCOMING",
          playedAt: null,
          manOfTheMatchId: null,
          prizeAwarded: false,
        },
      });

      return resetMatch;
    });
  }
}
