import { prisma } from "@/lib/prisma";

export type TacticalArchetype =
  | "POACHER"
  | "TARGET_FORWARD"
  | "INSIDE_FORWARD"
  | "CLASSIC_WINGER"
  | "PLAYMAKER"
  | "BOX_TO_BOX"
  | "ANCHOR_MAN"
  | "BALL_PLAYING_DEFENDER"
  | "NO_NONSENSE_CB"
  | "INVERTED_FULLBACK"
  | "ATTACKING_FULLBACK"
  | "SWEEPER_KEEPER"
  | "SHOT_STOPPER";

export type PlayerFitBreakdown = {
  score: number; // 0 to 100
  tier: "PERFECT_STARTER" | "HIGH_UPGRADE" | "SOLID_DEPTH" | "DEVELOPMENT" | "RISKY_FIT";
  tierLabel: string;
  archetype: TacticalArchetype;
  archetypeLabel: string;
  pillars: {
    qualityDelta: { score: number; label: string; starterOvrDiff: number };
    positionalUrgency: { score: number; label: string; currentDepth: number };
    financialValue: { score: number; label: string; budgetPercentage: number };
    tacticalSuitability: { score: number; label: string };
    squadChemistry: { score: number; label: string; isDomestic: boolean };
  };
  recommendationReason: string;
};

export class PlayerFitService {
  /**
   * Determine tactical archetype based on position and rating profile
   */
  static getPlayerArchetype(position: string, overallRating: number = 75): { archetype: TacticalArchetype; label: string } {
    const pos = position.toUpperCase();
    if (pos === "GK") {
      if (overallRating >= 80) return { archetype: "SWEEPER_KEEPER", label: "🧤 Sweeper Keeper" };
      return { archetype: "SHOT_STOPPER", label: "🧤 Traditional Shot-Stopper" };
    }
    if (pos === "CB") {
      if (overallRating >= 80) return { archetype: "BALL_PLAYING_DEFENDER", label: "🛡️ Ball-Playing Defender" };
      return { archetype: "NO_NONSENSE_CB", label: "🛡️ Stopper / No-Nonsense CB" };
    }
    if (pos === "LB" || pos === "RB" || pos === "LWB" || pos === "RWB") {
      if (overallRating >= 78) return { archetype: "ATTACKING_FULLBACK", label: "⚡ Overlapping Attacking Fullback" };
      return { archetype: "INVERTED_FULLBACK", label: "🛡️ Defensive Inverted Fullback" };
    }
    if (pos === "DMF" || pos === "DM") {
      return { archetype: "ANCHOR_MAN", label: "⚙️ Defensive Anchor / Destroyer" };
    }
    if (pos === "CMF" || pos === "CM") {
      return { archetype: "BOX_TO_BOX", label: "⚙️ Box-to-Box Engine" };
    }
    if (pos === "AMF" || pos === "CAM") {
      return { archetype: "PLAYMAKER", label: "🎯 Advanced Playmaker / #10" };
    }
    if (pos === "LWF" || pos === "RWF" || pos === "LW" || pos === "RW") {
      if (overallRating >= 80) return { archetype: "INSIDE_FORWARD", label: "⚡ Inside Forward / Goal Threat" };
      return { archetype: "CLASSIC_WINGER", label: "⚡ Direct Winger / Crosser" };
    }
    if (pos === "CF" || pos === "ST") {
      if (overallRating >= 82) return { archetype: "POACHER", label: "⚽ Elite Poacher / Finisher" };
      return { archetype: "TARGET_FORWARD", label: "⚽ Physical Target Forward" };
    }
    return { archetype: "BOX_TO_BOX", label: "⚙️ Dynamic Player" };
  }

  /**
   * Calculate 5-Pillar Player Fit Score (0-100) for a target player against a manager's club
   */
  static calculateFitScore(params: {
    player: { id: string; fullName: string; position: string; overallRating: number | null; marketValue: number | null; nationality: string };
    clubSquad: Array<{ position: string; overallRating: number | null; nationality: string }>;
    clubBudget: number;
    clubLeagueCountry?: string;
  }): PlayerFitBreakdown {
    const { player, clubSquad, clubBudget, clubLeagueCountry = "Morocco" } = params;
    const pRating = player.overallRating ?? 75;
    const pVal = Number(player.marketValue ?? 0);
    const pPos = player.position.toUpperCase();

    // 1. Quality Delta Pillar (25%)
    // Compare with current highest starter in same position group
    const samePosSquad = clubSquad.filter((s) => s.position.toUpperCase() === pPos);
    const currentBestStarter = samePosSquad.length > 0
      ? Math.max(...samePosSquad.map((s) => s.overallRating ?? 75))
      : 70;
    const starterDiff = pRating - currentBestStarter;
    let qualityScore = 50 + starterDiff * 7;
    qualityScore = Math.max(10, Math.min(100, Math.round(qualityScore)));

    // 2. Positional Urgency Pillar (25%)
    let urgencyScore = 50;
    const depth = samePosSquad.length;
    if (depth === 0) urgencyScore = 100; // Critical emergency!
    else if (depth === 1) urgencyScore = 85;
    else if (depth === 2) urgencyScore = 65;
    else if (depth === 3) urgencyScore = 40;
    else urgencyScore = 20; // Surplus

    // 3. Financial Value Pillar (20%)
    let valueScore = 60;
    if (pVal === 0) {
      valueScore = 100; // Free Agent Gem
    } else if (clubBudget > 0) {
      const budgetPct = (pVal / clubBudget) * 100;
      if (budgetPct <= 15) valueScore = 95;
      else if (budgetPct <= 35) valueScore = 85;
      else if (budgetPct <= 60) valueScore = 70;
      else if (budgetPct <= 90) valueScore = 50;
      else if (budgetPct <= 100) valueScore = 35;
      else valueScore = 10; // Exceeds budget
    }

    // 4. Tactical Suitability (15%)
    let tacticalScore = 75;
    if (pRating >= 82) tacticalScore += 15;
    else if (pRating >= 78) tacticalScore += 10;
    if (starterDiff > 0) tacticalScore += 10;
    tacticalScore = Math.min(100, tacticalScore);

    // 5. Squad Chemistry & Domestic Synergy (15%)
    const isDomestic =
      player.nationality?.toLowerCase().includes("moroc") ||
      player.nationality?.toLowerCase() === clubLeagueCountry.toLowerCase();
    let chemistryScore = isDomestic ? 95 : 75;

    // Weighted Total Score
    const totalScore = Math.round(
      qualityScore * 0.25 +
      urgencyScore * 0.25 +
      valueScore * 0.20 +
      tacticalScore * 0.15 +
      chemistryScore * 0.15
    );

    // Determine Tier Label
    let tier: PlayerFitBreakdown["tier"] = "SOLID_DEPTH";
    let tierLabel = "🟢 Solid Depth Fit";
    if (totalScore >= 88) {
      tier = "PERFECT_STARTER";
      tierLabel = "⭐ Perfect Starting XI Fit";
    } else if (totalScore >= 78) {
      tier = "HIGH_UPGRADE";
      tierLabel = "🔥 High-Value Upgrade";
    } else if (totalScore >= 60) {
      tier = "SOLID_DEPTH";
      tierLabel = "🟢 Squad Rotation Fit";
    } else if (totalScore >= 45) {
      tier = "DEVELOPMENT";
      tierLabel = "🟡 Development Prospect";
    } else {
      tier = "RISKY_FIT";
      tierLabel = "⚠️ Low Priority / Risky Fit";
    }

    const { archetype, label: archetypeLabel } = this.getPlayerArchetype(pPos, pRating);

    // Narrative Reason
    let recommendationReason = "";
    if (starterDiff > 0) {
      recommendationReason = `Immediately upgrades your starting ${pPos} by +${starterDiff} OVR.`;
    } else if (depth <= 1) {
      recommendationReason = `Provides vital depth in an undermanned ${pPos} slot (${depth} currently).`;
    } else if (pVal === 0) {
      recommendationReason = `Zero transfer fee opportunity to strengthen squad quality.`;
    } else {
      recommendationReason = `Reliable rotational option with high tactical flexibility.`;
    }

    return {
      score: totalScore,
      tier,
      tierLabel,
      archetype,
      archetypeLabel,
      pillars: {
        qualityDelta: {
          score: qualityScore,
          label: starterDiff > 0 ? `+${starterDiff} OVR vs current starter` : `${starterDiff} OVR vs starter`,
          starterOvrDiff: starterDiff,
        },
        positionalUrgency: {
          score: urgencyScore,
          label: `${depth} current in squad (${depth === 0 ? "Critical" : depth === 1 ? "Low Depth" : "Covered"})`,
          currentDepth: depth,
        },
        financialValue: {
          score: valueScore,
          label: pVal === 0 ? "Free Transfer" : `€${(pVal / 1_000_000).toFixed(1)}M (${((pVal / Math.max(1, clubBudget)) * 100).toFixed(0)}% budget)`,
          budgetPercentage: clubBudget > 0 ? Math.round((pVal / clubBudget) * 100) : 100,
        },
        tacticalSuitability: {
          score: tacticalScore,
          label: `${archetypeLabel} profile`,
        },
        squadChemistry: {
          score: chemistryScore,
          label: isDomestic ? "Domestic Synergy (+15%)" : "International Talent",
          isDomestic,
        },
      },
      recommendationReason,
    };
  }
}
