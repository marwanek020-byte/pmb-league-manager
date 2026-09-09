export type FormationKey =
  | "F433"
  | "F4231"
  | "F442"
  | "F352"
  | "F532"
  | "F4141"
  | "F343"
  | "F4312"
  | "F451"
  | "F541"
  | "F4411"
  | "F4222";

export type SlotRole =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "LWB"
  | "RWB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LM"
  | "RM"
  | "LW"
  | "RW"
  | "LF"
  | "RF"
  | "CF"
  | "ST"
  | "SS";

export type PitchZone = "GOALKEEPER" | "DEFENSE" | "MIDFIELD" | "ATTACK";

export interface FormationSlot {
  key: string;            // unique identifier within formation e.g. "gk", "cb1", "lw"
  label: string;          // short label on chip e.g. "GK", "CB", "LW"
  role: SlotRole;
  x: number;              // 0 to 100 percentage from left
  y: number;              // 0 to 100 percentage from top (12 = opponent goal, 88 = our goal)
  zone: PitchZone;
}

export interface FormationDefinition {
  id: FormationKey;
  name: string;           // Display name e.g. "4-3-3 Holding"
  description: string;
  slots: FormationSlot[]; // Exactly 11 slots
}

export const FORMATIONS: Record<FormationKey, FormationDefinition> = {
  F433: {
    id: "F433",
    name: "4-3-3",
    description: "Balanced attacking formation with wide wingers and a holding midfielder",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LB", role: "LB", x: 16, y: 72, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 38, y: 74, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 62, y: 74, zone: "DEFENSE" },
      { key: "rb", label: "RB", role: "RB", x: 84, y: 72, zone: "DEFENSE" },
      { key: "cdm", label: "CDM", role: "CDM", x: 50, y: 56, zone: "MIDFIELD" },
      { key: "lcm", label: "CM", role: "CM", x: 32, y: 44, zone: "MIDFIELD" },
      { key: "rcm", label: "CM", role: "CM", x: 68, y: 44, zone: "MIDFIELD" },
      { key: "lw", label: "LW", role: "LW", x: 18, y: 22, zone: "ATTACK" },
      { key: "st", label: "ST", role: "ST", x: 50, y: 16, zone: "ATTACK" },
      { key: "rw", label: "RW", role: "RW", x: 82, y: 22, zone: "ATTACK" },
    ],
  },
  F4231: {
    id: "F4231",
    name: "4-2-3-1",
    description: "Solid double pivot with an advanced playmaker behind a lone striker",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LB", role: "LB", x: 16, y: 72, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 38, y: 74, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 62, y: 74, zone: "DEFENSE" },
      { key: "rb", label: "RB", role: "RB", x: 84, y: 72, zone: "DEFENSE" },
      { key: "ldm", label: "CDM", role: "CDM", x: 36, y: 57, zone: "MIDFIELD" },
      { key: "rdm", label: "CDM", role: "CDM", x: 64, y: 57, zone: "MIDFIELD" },
      { key: "lm", label: "LM", role: "LM", x: 20, y: 38, zone: "MIDFIELD" },
      { key: "cam", label: "CAM", role: "CAM", x: 50, y: 36, zone: "MIDFIELD" },
      { key: "rm", label: "RM", role: "RM", x: 80, y: 38, zone: "MIDFIELD" },
      { key: "st", label: "ST", role: "ST", x: 50, y: 16, zone: "ATTACK" },
    ],
  },
  F442: {
    id: "F442",
    name: "4-4-2",
    description: "Classic English formation with dual strike partnership and flat midfield",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LB", role: "LB", x: 16, y: 72, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 38, y: 74, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 62, y: 74, zone: "DEFENSE" },
      { key: "rb", label: "RB", role: "RB", x: 84, y: 72, zone: "DEFENSE" },
      { key: "lm", label: "LM", role: "LM", x: 18, y: 48, zone: "MIDFIELD" },
      { key: "lcm", label: "CM", role: "CM", x: 38, y: 50, zone: "MIDFIELD" },
      { key: "rcm", label: "CM", role: "CM", x: 62, y: 50, zone: "MIDFIELD" },
      { key: "rm", label: "RM", role: "RM", x: 82, y: 48, zone: "MIDFIELD" },
      { key: "lst", label: "ST", role: "ST", x: 38, y: 18, zone: "ATTACK" },
      { key: "rst", label: "ST", role: "ST", x: 62, y: 18, zone: "ATTACK" },
    ],
  },
  F352: {
    id: "F352",
    name: "3-5-2",
    description: "Dominant midfield presence with energetic wing-backs and twin strikers",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lcb", label: "CB", role: "CB", x: 26, y: 74, zone: "DEFENSE" },
      { key: "ccb", label: "CB", role: "CB", x: 50, y: 76, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 74, y: 74, zone: "DEFENSE" },
      { key: "lwb", label: "LWB", role: "LWB", x: 14, y: 50, zone: "MIDFIELD" },
      { key: "ldm", label: "CDM", role: "CDM", x: 36, y: 56, zone: "MIDFIELD" },
      { key: "rdm", label: "CDM", role: "CDM", x: 64, y: 56, zone: "MIDFIELD" },
      { key: "cam", label: "CAM", role: "CAM", x: 50, y: 38, zone: "MIDFIELD" },
      { key: "rwb", label: "RWB", role: "RWB", x: 86, y: 50, zone: "MIDFIELD" },
      { key: "lst", label: "ST", role: "ST", x: 38, y: 18, zone: "ATTACK" },
      { key: "rst", label: "ST", role: "ST", x: 62, y: 18, zone: "ATTACK" },
    ],
  },
  F532: {
    id: "F532",
    name: "5-3-2",
    description: "Ultra-compact defensive block with lethal counter-attacking channels",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LWB", role: "LWB", x: 14, y: 68, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 32, y: 75, zone: "DEFENSE" },
      { key: "ccb", label: "CB", role: "CB", x: 50, y: 77, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 68, y: 75, zone: "DEFENSE" },
      { key: "rb", label: "RWB", role: "RWB", x: 86, y: 68, zone: "DEFENSE" },
      { key: "lcm", label: "CM", role: "CM", x: 30, y: 48, zone: "MIDFIELD" },
      { key: "ccm", label: "CM", role: "CM", x: 50, y: 50, zone: "MIDFIELD" },
      { key: "rcm", label: "CM", role: "CM", x: 70, y: 48, zone: "MIDFIELD" },
      { key: "lst", label: "ST", role: "ST", x: 38, y: 18, zone: "ATTACK" },
      { key: "rst", label: "ST", role: "ST", x: 62, y: 18, zone: "ATTACK" },
    ],
  },
  F4141: {
    id: "F4141",
    name: "4-1-4-1",
    description: "Fluid pressing shape with a shielding anchor and four-man attacking band",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LB", role: "LB", x: 16, y: 72, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 38, y: 74, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 62, y: 74, zone: "DEFENSE" },
      { key: "rb", label: "RB", role: "RB", x: 84, y: 72, zone: "DEFENSE" },
      { key: "cdm", label: "CDM", role: "CDM", x: 50, y: 60, zone: "MIDFIELD" },
      { key: "lm", label: "LM", role: "LM", x: 18, y: 40, zone: "MIDFIELD" },
      { key: "lcm", label: "CM", role: "CM", x: 38, y: 42, zone: "MIDFIELD" },
      { key: "rcm", label: "CM", role: "CM", x: 62, y: 42, zone: "MIDFIELD" },
      { key: "rm", label: "RM", role: "RM", x: 82, y: 40, zone: "MIDFIELD" },
      { key: "st", label: "ST", role: "ST", x: 50, y: 16, zone: "ATTACK" },
    ],
  },
  F343: {
    id: "F343",
    name: "3-4-3",
    description: "High-octane total football with aggressive flank overloads and 3 forwards",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lcb", label: "CB", role: "CB", x: 26, y: 74, zone: "DEFENSE" },
      { key: "ccb", label: "CB", role: "CB", x: 50, y: 76, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 74, y: 74, zone: "DEFENSE" },
      { key: "lm", label: "LM", role: "LM", x: 16, y: 50, zone: "MIDFIELD" },
      { key: "lcm", label: "CM", role: "CM", x: 38, y: 52, zone: "MIDFIELD" },
      { key: "rcm", label: "CM", role: "CM", x: 62, y: 52, zone: "MIDFIELD" },
      { key: "rm", label: "RM", role: "RM", x: 84, y: 50, zone: "MIDFIELD" },
      { key: "lw", label: "LW", role: "LW", x: 22, y: 22, zone: "ATTACK" },
      { key: "st", label: "ST", role: "ST", x: 50, y: 16, zone: "ATTACK" },
      { key: "rw", label: "RW", role: "RW", x: 78, y: 22, zone: "ATTACK" },
    ],
  },
  F4312: {
    id: "F4312",
    name: "4-3-1-2",
    description: "Narrow central dominance with diamond midfield and dual strikers",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LB", role: "LB", x: 16, y: 72, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 38, y: 74, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 62, y: 74, zone: "DEFENSE" },
      { key: "rb", label: "RB", role: "RB", x: 84, y: 72, zone: "DEFENSE" },
      { key: "lcm", label: "CM", role: "CM", x: 28, y: 54, zone: "MIDFIELD" },
      { key: "ccm", label: "CDM", role: "CDM", x: 50, y: 58, zone: "MIDFIELD" },
      { key: "rcm", label: "CM", role: "CM", x: 72, y: 54, zone: "MIDFIELD" },
      { key: "cam", label: "CAM", role: "CAM", x: 50, y: 36, zone: "MIDFIELD" },
      { key: "lst", label: "ST", role: "ST", x: 38, y: 18, zone: "ATTACK" },
      { key: "rst", label: "ST", role: "ST", x: 62, y: 18, zone: "ATTACK" },
    ],
  },
  F451: {
    id: "F451",
    name: "4-5-1",
    description: "Compact 5-man midfield controlling tempo and suffocating opponents",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LB", role: "LB", x: 16, y: 72, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 38, y: 74, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 62, y: 74, zone: "DEFENSE" },
      { key: "rb", label: "RB", role: "RB", x: 84, y: 72, zone: "DEFENSE" },
      { key: "lm", label: "LM", role: "LM", x: 16, y: 44, zone: "MIDFIELD" },
      { key: "ldm", label: "CDM", role: "CDM", x: 36, y: 52, zone: "MIDFIELD" },
      { key: "rdm", label: "CDM", role: "CDM", x: 64, y: 52, zone: "MIDFIELD" },
      { key: "rm", label: "RM", role: "RM", x: 84, y: 44, zone: "MIDFIELD" },
      { key: "cam", label: "CAM", role: "CAM", x: 50, y: 34, zone: "MIDFIELD" },
      { key: "st", label: "ST", role: "ST", x: 50, y: 16, zone: "ATTACK" },
    ],
  },
  F541: {
    id: "F541",
    name: "5-4-1",
    description: "Impenetrable bunker defense with 5 defenders and 4 midfielders",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LWB", role: "LWB", x: 14, y: 68, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 32, y: 75, zone: "DEFENSE" },
      { key: "ccb", label: "CB", role: "CB", x: 50, y: 77, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 68, y: 75, zone: "DEFENSE" },
      { key: "rb", label: "RWB", role: "RWB", x: 86, y: 68, zone: "DEFENSE" },
      { key: "lm", label: "LM", role: "LM", x: 20, y: 46, zone: "MIDFIELD" },
      { key: "lcm", label: "CM", role: "CM", x: 40, y: 48, zone: "MIDFIELD" },
      { key: "rcm", label: "CM", role: "CM", x: 60, y: 48, zone: "MIDFIELD" },
      { key: "rm", label: "RM", role: "RM", x: 80, y: 46, zone: "MIDFIELD" },
      { key: "st", label: "ST", role: "ST", x: 50, y: 18, zone: "ATTACK" },
    ],
  },
  F4411: {
    id: "F4411",
    name: "4-4-1-1",
    description: "Second striker roaming in the hole behind the central target man",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LB", role: "LB", x: 16, y: 72, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 38, y: 74, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 62, y: 74, zone: "DEFENSE" },
      { key: "rb", label: "RB", role: "RB", x: 84, y: 72, zone: "DEFENSE" },
      { key: "lm", label: "LM", role: "LM", x: 18, y: 48, zone: "MIDFIELD" },
      { key: "lcm", label: "CM", role: "CM", x: 38, y: 52, zone: "MIDFIELD" },
      { key: "rcm", label: "CM", role: "CM", x: 62, y: 52, zone: "MIDFIELD" },
      { key: "rm", label: "RM", role: "RM", x: 82, y: 48, zone: "MIDFIELD" },
      { key: "ss", label: "SS", role: "SS", x: 50, y: 32, zone: "ATTACK" },
      { key: "st", label: "ST", role: "ST", x: 50, y: 16, zone: "ATTACK" },
    ],
  },
  F4222: {
    id: "F4222",
    name: "4-2-2-2",
    description: "South American box formation with dual holding and dual attacking midfielders",
    slots: [
      { key: "gk", label: "GK", role: "GK", x: 50, y: 88, zone: "GOALKEEPER" },
      { key: "lb", label: "LB", role: "LB", x: 16, y: 72, zone: "DEFENSE" },
      { key: "lcb", label: "CB", role: "CB", x: 38, y: 74, zone: "DEFENSE" },
      { key: "rcb", label: "CB", role: "CB", x: 62, y: 74, zone: "DEFENSE" },
      { key: "rb", label: "RB", role: "RB", x: 84, y: 72, zone: "DEFENSE" },
      { key: "ldm", label: "CDM", role: "CDM", x: 36, y: 58, zone: "MIDFIELD" },
      { key: "rdm", label: "CDM", role: "CDM", x: 64, y: 58, zone: "MIDFIELD" },
      { key: "lam", label: "CAM", role: "CAM", x: 30, y: 38, zone: "MIDFIELD" },
      { key: "ram", label: "CAM", role: "CAM", x: 70, y: 38, zone: "MIDFIELD" },
      { key: "lst", label: "ST", role: "ST", x: 38, y: 18, zone: "ATTACK" },
      { key: "rst", label: "ST", role: "ST", x: 62, y: 18, zone: "ATTACK" },
    ],
  },
};

// ── Position Compatibility & Affinity Engine ──────────────────────────

/**
 * Normalizes player position string from various database formats (e.g. "Cb", "CB", "center back")
 */
export function normalizePlayerPosition(pos: string | null | undefined): string {
  if (!pos) return "SUB";
  const p = pos.trim().toUpperCase();
  if (p === "GOALKEEPER") return "GK";
  if (p === "CENTER BACK" || p === "CENTRE BACK") return "CB";
  if (p === "LEFT BACK") return "LB";
  if (p === "RIGHT BACK") return "RB";
  if (p === "DEFENSIVE MIDFIELDER") return "DMF";
  if (p === "CENTRAL MIDFIELDER") return "CMF";
  if (p === "ATTACKING MIDFIELDER") return "AMF";
  if (p === "LEFT WING" || p === "LEFT WINGER") return "LWF";
  if (p === "RIGHT WING" || p === "RIGHT WINGER") return "RWF";
  if (p === "STRIKER" || p === "CENTRE FORWARD") return "CF";
  return p;
}

/**
 * Calculates position affinity (0.5 to 1.0)
 * 1.0 = Natural position
 * 0.75 = Adjacent / secondary position
 * 0.5 = Out of position
 */
export function calculatePositionAffinity(rawPlayerPos: string, slotRole: SlotRole): number {
  const p = normalizePlayerPosition(rawPlayerPos);
  const s = slotRole.toUpperCase();

  // 1. Goalkeeper check (strictly GK)
  if (s === "GK") {
    return p === "GK" ? 1.0 : 0.5;
  }
  if (p === "GK" && s !== "GK") {
    return 0.5;
  }

  // 2. Exact match equivalents
  if (
    (p === "CB" && s === "CB") ||
    (p === "LB" && (s === "LB" || s === "LWB")) ||
    (p === "RB" && (s === "RB" || s === "RWB")) ||
    ((p === "DMF" || p === "CDM") && (s === "CDM" || s === "CM")) ||
    ((p === "CMF" || p === "CM") && (s === "CM" || s === "CDM")) ||
    ((p === "AMF" || p === "CAM") && (s === "CAM" || s === "SS")) ||
    ((p === "LWF" || p === "LW") && (s === "LW" || s === "LM")) ||
    ((p === "RWF" || p === "RW") && (s === "RW" || s === "RM")) ||
    ((p === "CF" || p === "ST") && (s === "ST" || s === "CF"))
  ) {
    return 1.0;
  }

  // 3. Adjacent / Secondary positions
  // Fullbacks to Wingbacks / Wide Midfielders
  if ((p === "LB" || p === "LWB") && (s === "CB" || s === "LM")) return 0.75;
  if ((p === "RB" || p === "RWB") && (s === "CB" || s === "RM")) return 0.75;
  if (p === "CB" && (s === "CDM" || s === "LB" || s === "RB")) return 0.75;

  // Midfielders
  if ((p === "DMF" || p === "CDM") && (s === "CB" || s === "CAM")) return 0.75;
  if ((p === "CMF" || p === "CM") && (s === "CAM" || s === "LM" || s === "RM")) return 0.75;
  if ((p === "AMF" || p === "CAM") && (s === "CM" || s === "LW" || s === "RW" || s === "ST" || s === "CF")) return 0.75;

  // Wingers
  if ((p === "LWF" || p === "LW" || p === "LM") && (s === "RW" || s === "RM" || s === "AMF" || s === "CAM" || s === "ST")) return 0.75;
  if ((p === "RWF" || p === "RW" || p === "RM") && (s === "LW" || s === "LM" || s === "AMF" || s === "CAM" || s === "ST")) return 0.75;

  // Forwards
  if ((p === "CF" || p === "ST") && (s === "LW" || s === "RW" || s === "CAM" || s === "SS")) return 0.75;

  // 4. Out of position
  return 0.5;
}

export function getAffinityColor(affinity: number): {
  border: string;
  badge: string;
  text: string;
  label: string;
} {
  if (affinity >= 0.95) {
    return {
      border: "border-emerald-500",
      badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      text: "text-emerald-400",
      label: "Natural",
    };
  }
  if (affinity >= 0.7) {
    return {
      border: "border-amber-500",
      badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      text: "text-amber-400",
      label: "Secondary",
    };
  }
  return {
    border: "border-rose-500",
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    text: "text-rose-400",
    label: "Out of Pos",
  };
}
