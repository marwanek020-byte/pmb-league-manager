import { MissionConditionType } from "@prisma/client";

export type RelativeMatchdayMissionPair = {
  id: string;
  name: string;
  home: {
    conditionType: MissionConditionType;
    targetValue: number;
    titleTemplate: string;
    descriptionTemplate: string;
    rewardAmount: number; // in EUR
    penaltyAmount: number; // in EUR
  };
  away: {
    conditionType: MissionConditionType;
    targetValue: number;
    titleTemplate: string;
    descriptionTemplate: string;
    rewardAmount: number; // in EUR
    penaltyAmount: number; // in EUR
  };
};

/**
 * Complementary / Relative matchday missions.
 * When two teams face off, each team receives an opposing mission
 * designed to create maximum stakes and tension!
 */
export const RELATIVE_MATCHDAY_MISSION_PAIRS: RelativeMatchdayMissionPair[] = [
  {
    id: "offensive-blitz-vs-fortress-win",
    name: "Offensive Blitz vs Fortress Victory",
    home: {
      conditionType: "SCORE_AND_DRAW_OR_WIN",
      targetValue: 3,
      titleTemplate: "Attack Fire: Score 3+ & Don't Lose",
      descriptionTemplate: "Score at least 3 goals in this match and avoid defeat (draw or win).",
      rewardAmount: 2_500_000,
      penaltyAmount: 1_200_000,
    },
    away: {
      conditionType: "CONCEDE_MAX_AND_WIN",
      targetValue: 2,
      titleTemplate: "Iron Wall: Concede ≤ 2 Goals & Win",
      descriptionTemplate: "Concede no more than 2 goals against your opponent and take the 3 points.",
      rewardAmount: 2_800_000,
      penaltyAmount: 1_400_000,
    },
  },
  {
    id: "clean-sheet-vs-goal-machine",
    name: "Clean Sheet Defense vs Relentless Attack",
    home: {
      conditionType: "CLEAN_SHEET",
      targetValue: 0,
      titleTemplate: "Lockdown: Keep a Clean Sheet",
      descriptionTemplate: "Concede 0 goals in this fixture.",
      rewardAmount: 2_000_000,
      penaltyAmount: 1_000_000,
    },
    away: {
      conditionType: "SCORE_AT_LEAST",
      targetValue: 2,
      titleTemplate: "Sharp Shooters: Score 2+ Goals",
      descriptionTemplate: "Put at least 2 goals past their defense.",
      rewardAmount: 2_000_000,
      penaltyAmount: 1_000_000,
    },
  },
  {
    id: "statement-win-vs-stubborn-resistance",
    name: "Dominant Margin vs Defensive Stand",
    home: {
      conditionType: "WIN_BY_MARGIN",
      targetValue: 2,
      titleTemplate: "Masterclass: Win by 2+ Goals",
      descriptionTemplate: "Defeat your opponent by a margin of 2 or more goals.",
      rewardAmount: 3_000_000,
      penaltyAmount: 1_500_000,
    },
    away: {
      conditionType: "CONCEDE_AT_MOST",
      targetValue: 1,
      titleTemplate: "Steel Bastion: Concede at most 1 Goal",
      descriptionTemplate: "Do not allow the opponent to score more than 1 goal.",
      rewardAmount: 2_200_000,
      penaltyAmount: 1_100_000,
    },
  },
  {
    id: "must-win-vs-grind-result",
    name: "Victory Mandate vs Spoil the Party",
    home: {
      conditionType: "WIN_MATCH",
      targetValue: 1,
      titleTemplate: "Glory Mandate: Claim Victory",
      descriptionTemplate: "Win this match at all costs.",
      rewardAmount: 2_000_000,
      penaltyAmount: 1_000_000,
    },
    away: {
      conditionType: "DRAW_OR_WIN",
      targetValue: 1,
      titleTemplate: "Resilience: Draw or Win Away",
      descriptionTemplate: "Secure at least a point on enemy territory (draw or win).",
      rewardAmount: 1_800_000,
      penaltyAmount: 900_000,
    },
  },
  {
    id: "goal-carnival-clash",
    name: "High Scoring Clash vs Counter Wall",
    home: {
      conditionType: "SCORE_AT_LEAST",
      targetValue: 3,
      titleTemplate: "Triple Threat: Score 3+ Goals",
      descriptionTemplate: "Score 3 or more goals during the 90 minutes.",
      rewardAmount: 2_500_000,
      penaltyAmount: 1_250_000,
    },
    away: {
      conditionType: "CONCEDE_AT_MOST",
      targetValue: 2,
      titleTemplate: "Containment: Concede ≤ 2 Goals",
      descriptionTemplate: "Hold the opposition attack to 2 goals or fewer.",
      rewardAmount: 1_800_000,
      penaltyAmount: 900_000,
    },
  },
];

export type LongTermMissionTemplate = {
  id: string;
  title: string;
  description: string;
  conditionType: MissionConditionType;
  targetValue: number;
  spanMatchdays: number;
  rewardAmount: number;
  penaltyAmount: number;
};

export const LONG_TERM_MISSION_TEMPLATES: LongTermMissionTemplate[] = [
  {
    id: "winning-streak-3",
    title: "Golden Run: 3 Consecutive Wins",
    description: "Win 3 league matches in a row across upcoming rounds.",
    conditionType: "WIN_STREAK",
    targetValue: 3,
    spanMatchdays: 4,
    rewardAmount: 5_000_000,
    penaltyAmount: 2_500_000,
  },
  {
    id: "goal-fest-13",
    title: "Bombardment: Score 13 Goals in 4 Matches",
    description: "Score a combined total of at least 13 goals over the next 4 matchdays.",
    conditionType: "SCORE_TOTAL",
    targetValue: 13,
    spanMatchdays: 4,
    rewardAmount: 6_000_000,
    penaltyAmount: 3_000_000,
  },
  {
    id: "unbeaten-4",
    title: "The Invincibles: 4 Matches Unbeaten",
    description: "Avoid defeat across the next 4 consecutive league matches.",
    conditionType: "UNBEATEN_STREAK",
    targetValue: 4,
    spanMatchdays: 4,
    rewardAmount: 4_500_000,
    penaltyAmount: 2_000_000,
  },
  {
    id: "clean-sheets-3",
    title: "Fortress Wall: 3 Clean Sheets in 5 Matches",
    description: "Keep at least 3 clean sheets across the next 5 matchdays.",
    conditionType: "CLEAN_SHEETS_COUNT",
    targetValue: 3,
    spanMatchdays: 5,
    rewardAmount: 5_500_000,
    penaltyAmount: 2_500_000,
  },
];

export type TransferMissionTemplate = {
  id: string;
  title: string;
  description: string;
  conditionType: MissionConditionType;
  targetValue: number;
  rewardAmount: number;
  penaltyAmount: number;
};

export const TRANSFER_MISSION_TEMPLATES: TransferMissionTemplate[] = [
  {
    id: "window-activity-2",
    title: "Market Mover: Complete 2 Transfers",
    description: "Successfully complete at least 2 incoming or outgoing transfers during this window.",
    conditionType: "COMPLETE_TRANSFERS",
    targetValue: 2,
    rewardAmount: 3_000_000,
    penaltyAmount: 1_500_000,
  },
  {
    id: "marquee-signing-5m",
    title: "Galáctico Signing: Secure a €5M+ Star",
    description: "Sign any player with a market value of at least €5,000,000 this window.",
    conditionType: "SIGN_PLAYER_VALUE",
    targetValue: 5_000_000,
    rewardAmount: 4_000_000,
    penaltyAmount: 2_000_000,
  },
];

