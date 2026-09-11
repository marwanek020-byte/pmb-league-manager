"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  FORMATIONS,
  FormationKey,
  FormationSlot,
  SlotRole,
  calculatePositionAffinity,
  getAffinityColor,
  normalizePlayerPosition,
  getAvailableSlotRoles,
  getRoleDisplayLabel,
} from "@/lib/formations";
import { PlayerDTO } from "@/lib/serialize-player";
import { isMoroccanNationality } from "@/lib/services/botola-contract-service";
import {
  Crown,
  Award,
  Zap,
  RotateCcw,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  Search,
  ChevronRight,
  Shield,
  Sliders,
} from "lucide-react";

interface StarterAssignment {
  slotKey: string;
  slotRole: string;
  playerId: string;
}

interface SetPieceAssign {
  playerId: string;
  type: "CAPTAIN" | "VICE_CAPTAIN" | "PENALTY" | "FREE_KICK_SHORT" | "CORNER_LEFT" | "CORNER_RIGHT";
}

interface Props {
  clubId: string;
  clubName: string;
  squad: PlayerDTO[];
  initialFormation?: FormationKey;
  initialStarters?: Record<string, string>; // slotKey -> playerId
  initialSlotRoles?: Record<string, string>; // slotKey -> slotRole (e.g. "SS", "CDM", "CM")
  initialSubstitutes?: string[];            // playerIds
  initialCaptainId?: string | null;
  initialViceCaptainId?: string | null;
  onSaved?: () => void;
}

export function FormationBoard({
  clubId,
  clubName,
  squad,
  initialFormation = "F433",
  initialStarters = {},
  initialSlotRoles = {},
  initialSubstitutes = [],
  initialCaptainId = null,
  initialViceCaptainId = null,
  onSaved,
}: Props) {
  // ── State ─────────────────────────────────────────────────────────────
  const [formationKey, setFormationKey] = useState<FormationKey>(initialFormation);
  const [starters, setStarters] = useState<Record<string, string>>(initialStarters);
  const [slotRoles, setSlotRoles] = useState<Record<string, SlotRole>>(() => {
    const roles: Record<string, SlotRole> = {};
    const currentDef = FORMATIONS[initialFormation] || FORMATIONS.F433;
    currentDef.slots.forEach((s) => {
      roles[s.key] = (initialSlotRoles[s.key] as SlotRole) || s.role;
    });
    return roles;
  });
  const [activePositionMenuSlotKey, setActivePositionMenuSlotKey] = useState<string | null>(null);
  const [substitutes, setSubstitutes] = useState<string[]>(initialSubstitutes);
  const [captainId, setCaptainId] = useState<string | null>(initialCaptainId);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(initialViceCaptainId);

  // Selection / Interaction
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [squadSearch, setSquadSearch] = useState("");
  const [selectedFilterPos, setSelectedFilterPos] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"STARTERS" | "BENCH" | "ROLES">("STARTERS");

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "SUCCESS" | "ERROR" | null; message: string }>({
    type: null,
    message: "",
  });

  const activeFormation = FORMATIONS[formationKey] || FORMATIONS.F433;

  // Player lookup map
  const playerMap = useMemo(() => {
    return new Map(squad.map((p) => [p.id, p]));
  }, [squad]);

  // Set of assigned player IDs
  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(starters).forEach((id) => id && ids.add(id));
    substitutes.forEach((id) => id && ids.add(id));
    return ids;
  }, [starters, substitutes]);

  // Foreign quota calculation (max 5 in starting XI)
  const foreignStartersCount = useMemo(() => {
    let count = 0;
    Object.values(starters).forEach((id) => {
      const p = playerMap.get(id);
      if (p && !isMoroccanNationality(p.nationality)) {
        count++;
      }
    });
    return count;
  }, [starters, playerMap]);

  // Total starter count
  const starterCount = Object.keys(starters).filter((k) => starters[k]).length;

  // Average OVR of starting XI
  const startingAvgOvr = useMemo(() => {
    const ratings: number[] = [];
    Object.values(starters).forEach((id) => {
      const p = playerMap.get(id);
      if (p && p.overallRating) ratings.push(p.overallRating);
    });
    if (ratings.length === 0) return 0;
    return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
  }, [starters, playerMap]);

  // ── Formation Change Handler ──────────────────────────────────────────
  const handleFormationChange = (newKey: FormationKey) => {
    setFormationKey(newKey);
    const newDef = FORMATIONS[newKey];
    if (!newDef) return;

    // Migrate starters and initialize slot roles
    const newStarters: Record<string, string> = {};
    const newSlotRoles: Record<string, SlotRole> = {};
    const oldEntries = Object.entries(starters);
    const usedPlayerIds = new Set<string>();

    newDef.slots.forEach((newSlot) => {
      newSlotRoles[newSlot.key] = newSlot.role;
      // Find matching player in old slots with same role
      const match = oldEntries.find(([oldKey, pId]) => {
        if (!pId || usedPlayerIds.has(pId)) return false;
        const oldSlotRole = slotRoles[oldKey] || activeFormation.slots.find((s) => s.key === oldKey)?.role;
        return oldSlotRole === newSlot.role;
      });

      if (match) {
        newStarters[newSlot.key] = match[1];
        usedPlayerIds.add(match[1]);
      }
    });

    setStarters(newStarters);
    setSlotRoles(newSlotRoles);
    setSelectedSlotKey(null);
    setActivePositionMenuSlotKey(null);
  };

  // ── Flexible Slot Role Change Handler ─────────────────────────────────
  const handleRoleChange = (slotKey: string, newRole: SlotRole) => {
    setSlotRoles((prev) => ({
      ...prev,
      [slotKey]: newRole,
    }));
    setActivePositionMenuSlotKey(null);
  };

  // ── Auto-Pick Best XI ─────────────────────────────────────────────────
  const handleAutoPick = useCallback(() => {
    const availablePlayers = [...squad];
    const newStarters: Record<string, string> = {};
    const assigned = new Set<string>();
    let foreignCount = 0;

    // Sort slots prioritizing GK, then Def, Mid, Atk
    const sortedSlots = [...activeFormation.slots].sort((a, b) => {
      const order = { GOALKEEPER: 0, DEFENSE: 1, MIDFIELD: 2, ATTACK: 3 };
      return order[a.zone] - order[b.zone];
    });

    sortedSlots.forEach((slot) => {
      // Find best unassigned player matching slot with affinity * rating score
      let bestPlayer: PlayerDTO | null = null;
      let bestScore = -1;

      for (const p of availablePlayers) {
        if (assigned.has(p.id)) continue;

        const isForeign = !isMoroccanNationality(p.nationality);
        if (isForeign && foreignCount >= 5) continue; // Respect foreign quota

        const affinity = calculatePositionAffinity(p.position, slot.role);
        const ovr = p.overallRating ?? 65;
        const score = ovr * affinity;

        if (score > bestScore) {
          bestScore = score;
          bestPlayer = p;
        }
      }

      if (bestPlayer) {
        newStarters[slot.key] = bestPlayer.id;
        assigned.add(bestPlayer.id);
        if (!isMoroccanNationality(bestPlayer.nationality)) {
          foreignCount++;
        }
      }
    });

    // Assign up to 12 remaining best players to bench
    const remaining = availablePlayers
      .filter((p) => !assigned.has(p.id))
      .sort((a, b) => (b.overallRating ?? 0) - (a.overallRating ?? 0))
      .slice(0, 12)
      .map((p) => p.id);

    setStarters(newStarters);
    setSubstitutes(remaining);

    // Pick highest rated starter as captain if not set
    if (!captainId) {
      const highestRated = Object.values(newStarters)
        .map((id) => playerMap.get(id))
        .filter(Boolean)
        .sort((a, b) => (b!.overallRating ?? 0) - (a!.overallRating ?? 0))[0];
      if (highestRated) setCaptainId(highestRated.id);
    }

    setSelectedSlotKey(null);
    setFeedback({ type: "SUCCESS", message: "Auto-picked optimal Starting XI & Bench." });
  }, [squad, activeFormation, playerMap, captainId]);

  // ── Reset Lineup ──────────────────────────────────────────────────────
  const handleReset = () => {
    setStarters({});
    setSubstitutes([]);
    setCaptainId(null);
    setViceCaptainId(null);
    setSelectedSlotKey(null);
    setFeedback({ type: null, message: "" });
  };

  // ── Slot Click: Select or Swap ────────────────────────────────────────
  const handleSlotClick = (slotKey: string) => {
    if (!selectedSlotKey) {
      // First slot selected
      setSelectedSlotKey(slotKey);
    } else if (selectedSlotKey === slotKey) {
      // Deselect
      setSelectedSlotKey(null);
    } else {
      // Swap two slots on pitch!
      const playerA = starters[selectedSlotKey];
      const playerB = starters[slotKey];

      setStarters((prev) => {
        const next = { ...prev };
        if (playerB) next[selectedSlotKey] = playerB;
        else delete next[selectedSlotKey];

        if (playerA) next[slotKey] = playerA;
        else delete next[slotKey];

        return next;
      });

      setSelectedSlotKey(null);
    }
  };

  // ── Assign Player to Selected Slot or Bench ───────────────────────────
  const handleAssignPlayer = (playerId: string) => {
    if (selectedSlotKey) {
      // Check if player is already in another slot -> swap
      const existingSlotKey = Object.keys(starters).find(
        (k) => starters[k] === playerId
      );

      setStarters((prev) => {
        const next = { ...prev };
        const currentPlayerInTarget = next[selectedSlotKey];

        if (existingSlotKey) {
          if (currentPlayerInTarget) {
            next[existingSlotKey] = currentPlayerInTarget;
          } else {
            delete next[existingSlotKey];
          }
        }

        // If player was on bench, remove from bench
        setSubstitutes((subs) => subs.filter((id) => id !== playerId));

        next[selectedSlotKey] = playerId;
        return next;
      });

      setSelectedSlotKey(null);
    } else {
      // If no slot selected and clicked, add to bench if < 12
      if (substitutes.includes(playerId)) {
        setSubstitutes((subs) => subs.filter((id) => id !== playerId));
      } else if (substitutes.length < 12) {
        setSubstitutes((subs) => [...subs, playerId]);
      } else {
        setFeedback({ type: "ERROR", message: "Substitutes bench is full (max 12 players)." });
      }
    }
  };

  // ── Remove Player from Slot ───────────────────────────────────────────
  const handleRemoveFromSlot = (slotKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarters((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    if (selectedSlotKey === slotKey) setSelectedSlotKey(null);
  };

  // ── Toggle Captain ────────────────────────────────────────────────────
  const handleToggleCaptain = (playerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (captainId === playerId) {
      setCaptainId(null);
    } else {
      setCaptainId(playerId);
      if (viceCaptainId === playerId) setViceCaptainId(null);
    }
  };

  // ── Toggle Vice-Captain ───────────────────────────────────────────────
  const handleToggleViceCaptain = (playerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (viceCaptainId === playerId) {
      setViceCaptainId(null);
    } else {
      setViceCaptainId(playerId);
      if (captainId === playerId) setCaptainId(null);
    }
  };

  // ── Drag and Drop handlers ────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("text/plain", playerId);
  };

  const handleSlotDrop = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (!playerId) return;

    setSelectedSlotKey(slotKey);
    handleAssignPlayer(playerId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ── Save Lineup to Database ───────────────────────────────────────────
  const handleSave = async () => {
    if (starterCount !== 11) {
      setFeedback({
        type: "ERROR",
        message: `Incomplete Starting XI (${starterCount}/11 players). Please assign all 11 positions.`,
      });
      return;
    }

    if (foreignStartersCount > 5) {
      setFeedback({
        type: "ERROR",
        message: `Foreign quota exceeded (${foreignStartersCount}/5). Please reduce foreign starters.`,
      });
      return;
    }

    setSaving(true);
    setFeedback({ type: null, message: "" });

    try {
      const startersPayload = activeFormation.slots.map((slot) => ({
        slotKey: slot.key,
        slotRole: slotRoles[slot.key] || slot.role,
        positionX: slot.x,
        positionY: slot.y,
        playerId: starters[slot.key],
      }));

      const substitutesPayload = substitutes.map((pId, idx) => ({
        playerId: pId,
        order: idx,
      }));

      const setPiecesPayload: { playerId: string; type: string }[] = [];
      if (captainId) setPiecesPayload.push({ playerId: captainId, type: "CAPTAIN" });
      if (viceCaptainId) setPiecesPayload.push({ playerId: viceCaptainId, type: "VICE_CAPTAIN" });

      const res = await fetch(`/api/lineups/club/${clubId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation: formationKey,
          starters: startersPayload,
          substitutes: substitutesPayload,
          setPieces: setPiecesPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save lineup");
      }

      setFeedback({
        type: "SUCCESS",
        message: `Tactical lineup (${activeFormation.name}) saved successfully!`,
      });

      if (onSaved) onSaved();
    } catch (err: any) {
      setFeedback({
        type: "ERROR",
        message: err.message || "An unexpected error occurred while saving.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filtered squad list
  const filteredSquad = useMemo(() => {
    return squad.filter((p) => {
      if (squadSearch) {
        const q = squadSearch.toLowerCase();
        if (
          !p.fullName.toLowerCase().includes(q) &&
          !p.position.toLowerCase().includes(q) &&
          !String(p.playerId).includes(q)
        ) {
          return false;
        }
      }

      if (selectedFilterPos !== "ALL") {
        const norm = normalizePlayerPosition(p.position);
        if (selectedFilterPos === "GK" && norm !== "GK") return false;
        if (selectedFilterPos === "DEF" && !["CB", "LB", "RB", "LWB", "RWB"].includes(norm)) return false;
        if (selectedFilterPos === "MID" && !["DMF", "CMF", "AMF", "LM", "RM"].includes(norm)) return false;
        if (selectedFilterPos === "FWD" && !["CF", "ST", "LWF", "RWF", "SS"].includes(norm)) return false;
      }

      return true;
    });
  }, [squad, squadSearch, selectedFilterPos]);

  return (
    <div className="space-y-6">
      {/* ─── TOP CONTROL BAR ────────────────────────────────────────────── */}
      <div className="pmb-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Formation
            </span>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={formationKey}
                onChange={(e) => handleFormationChange(e.target.value as FormationKey)}
                className="rounded-lg border border-pmb-gold/40 bg-black/80 px-3 py-1.5 text-sm font-bold text-pmb-gold focus:border-pmb-gold focus:outline-none"
              >
                {Object.values(FORMATIONS).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="hidden h-8 w-px bg-white/10 sm:block" />

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-gray-400">Starting XI:</span>{" "}
              <span
                className={`font-bold ${
                  starterCount === 11 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {starterCount}/11
              </span>
            </div>
            <div>
              <span className="text-gray-400">Avg OVR:</span>{" "}
              <span className="font-bold text-pmb-gold">{startingAvgOvr || "—"}</span>
            </div>
            <div>
              <span className="text-gray-400">Foreign:</span>{" "}
              <span
                className={`font-bold ${
                  foreignStartersCount <= 5 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {foreignStartersCount}/5
              </span>
            </div>
            <div>
              <span className="text-gray-400">Bench:</span>{" "}
              <span className="font-bold text-white">{substitutes.length}/12</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutoPick}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10 hover:text-white"
            title="Auto-fill best available XI"
          >
            <Zap className="h-3.5 w-3.5 text-pmb-gold" />
            Auto-Pick XI
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-400 transition hover:bg-white/10 hover:text-rose-400"
            title="Clear all assignments"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || starterCount !== 11}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              starterCount === 11 && !saving
                ? "bg-pmb-gold text-black hover:bg-pmb-gold/90 shadow-lg shadow-pmb-gold/20"
                : "cursor-not-allowed bg-gray-800 text-gray-500"
            }`}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Lineup"}
          </button>
        </div>
      </div>

      {/* ─── FEEDBACK ALERTS ────────────────────────────────────────────── */}
      {feedback.message && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-xs font-semibold ${
            feedback.type === "SUCCESS"
              ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
              : "border border-rose-500/30 bg-rose-950/40 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "SUCCESS" ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: null, message: "" })}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── MAIN TACTICAL WORKSPACE: PITCH + ROSTER ────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── 2D FOOTBALL PITCH (LEFT 7 COLS) ─────────────────────────── */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="relative overflow-hidden rounded-2xl border-2 border-pmb-gold/30 bg-emerald-950/80 shadow-2xl">
            {/* Pitch Grass Stripes & Markings */}
            <div
              className="relative w-full pb-[135%] sm:pb-[125%]"
              style={{
                background: `repeating-linear-gradient(
                  0deg,
                  #072814 0px,
                  #072814 40px,
                  #052010 40px,
                  #052010 80px
                )`,
              }}
            >
              {/* SVG Football Field Markings */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
                viewBox="0 0 100 130"
                preserveAspectRatio="none"
              >
                {/* Border line */}
                <rect x="4" y="4" width="92" height="122" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                {/* Halfway line */}
                <line x1="4" y1="65" x2="96" y2="65" stroke="#ffffff" strokeWidth="0.8" />
                {/* Center circle */}
                <circle cx="50" cy="65" r="13" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                <circle cx="50" cy="65" r="0.8" fill="#ffffff" />

                {/* Top Penalty Area (Opponent) */}
                <rect x="22" y="4" width="56" height="20" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                <rect x="34" y="4" width="32" height="7" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                <circle cx="50" cy="16" r="0.8" fill="#ffffff" />
                <path d="M 38 24 A 12 12 0 0 0 62 24" fill="none" stroke="#ffffff" strokeWidth="0.8" />

                {/* Bottom Penalty Area (Our Goal) */}
                <rect x="22" y="106" width="56" height="20" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                <rect x="34" y="119" width="32" height="7" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                <circle cx="50" cy="114" r="0.8" fill="#ffffff" />
                <path d="M 38 106 A 12 12 0 0 1 62 106" fill="none" stroke="#ffffff" strokeWidth="0.8" />
              </svg>

              {/* Pitch Header info */}
              <div className="absolute top-3 left-4 z-10 flex items-center gap-2 rounded-full bg-black/80 px-3 py-1 text-[11px] font-bold text-gray-300">
                <Shield className="h-3.5 w-3.5 text-pmb-gold" />
                <span>{clubName}</span>
                <span className="text-gray-500">•</span>
                <span className="text-pmb-gold">{activeFormation.name}</span>
              </div>

              {selectedSlotKey && (
                <div className="absolute top-3 right-4 z-10 animate-pulse rounded-full bg-pmb-gold px-3 py-1 text-[11px] font-black uppercase text-black shadow-lg">
                  Select player to place
                </div>
              )}

              {/* ── 11 SLOTS ON PITCH ─────────────────────────────────── */}
              {activeFormation.slots.map((slot) => {
                const assignedPlayerId = starters[slot.key];
                const player = assignedPlayerId ? playerMap.get(assignedPlayerId) : null;
                const isSelected = selectedSlotKey === slot.key;

                const currentRole = slotRoles[slot.key] || slot.role;
                const availableRoles = getAvailableSlotRoles(slot.role, slot.zone);
                const currentDisplayLabel = getRoleDisplayLabel(currentRole);

                const affinity = player
                  ? calculatePositionAffinity(player.position, currentRole)
                  : 1.0;
                const affinityStyles = getAffinityColor(affinity);

                const isCap = captainId === assignedPlayerId;
                const isVice = viceCaptainId === assignedPlayerId;
                const isMenuOpen = activePositionMenuSlotKey === slot.key;

                return (
                  <div
                    key={slot.key}
                    onClick={() => handleSlotClick(slot.key)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleSlotDrop(e, slot.key)}
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`group absolute z-20 flex cursor-pointer flex-col items-center transition-transform hover:scale-105 ${
                      isSelected ? "scale-110" : ""
                    }`}
                  >
                    {player ? (
                      /* Occupied Slot Token */
                      <div className="relative flex flex-col items-center">
                        {/* Token Badge */}
                        <div
                          className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black shadow-lg transition-all ${
                            isSelected
                              ? "border-pmb-gold ring-4 ring-pmb-gold/40"
                              : affinityStyles.border
                          }`}
                        >
                          {player.photo ? (
                            <img
                              src={player.photo}
                              alt={player.fullName}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-black text-white">
                              {player.overallRating || currentDisplayLabel}
                            </span>
                          )}

                          {/* Captain / VC Crown */}
                          {isCap && (
                            <span
                              onClick={(e) => handleToggleCaptain(player.id, e)}
                              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black shadow-md ring-1 ring-black"
                              title="Team Captain"
                            >
                              C
                            </span>
                          )}
                          {isVice && (
                            <span
                              onClick={(e) => handleToggleViceCaptain(player.id, e)}
                              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-[8px] font-black text-black shadow-md ring-1 ring-black"
                              title="Vice Captain"
                            >
                              VC
                            </span>
                          )}

                          {/* Remove button on hover */}
                          <button
                            type="button"
                            onClick={(e) => handleRemoveFromSlot(slot.key, e)}
                            className="absolute -top-1 -left-1 hidden h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-500 group-hover:flex"
                            title="Remove starter"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        {/* Player Name & Role Chip */}
                        <div className="mt-1 flex max-w-[90px] flex-col items-center text-center">
                          <span className="truncate rounded bg-black/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                            {player.fullName.split(" ").slice(-1)[0]}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1">
                            {/* Interactive Position Chip */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePositionMenuSlotKey(isMenuOpen ? null : slot.key);
                              }}
                              className={`flex items-center gap-0.5 rounded px-1 text-[8px] font-extrabold uppercase transition border ${
                                availableRoles.length > 1
                                  ? "border-amber-400/60 bg-black/90 hover:bg-amber-400/20 text-amber-300 cursor-pointer shadow"
                                  : currentRole === "GK"
                                  ? "border-transparent bg-amber-500/20 text-amber-300"
                                  : "border-transparent bg-white/10 text-gray-300"
                              }`}
                              title={
                                availableRoles.length > 1
                                  ? `Switch position (${availableRoles.map(getRoleDisplayLabel).join(", ")})`
                                  : undefined
                              }
                            >
                              <span>{currentDisplayLabel}</span>
                              {availableRoles.length > 1 && (
                                <span className="text-[7px] text-amber-400">▾</span>
                              )}
                            </button>

                            <span className="rounded bg-black/60 px-1 text-[8px] font-bold text-pmb-gold">
                              {player.overallRating ?? "—"}
                            </span>
                          </div>
                        </div>

                        {/* Floating Position Selector Popover */}
                        {isMenuOpen && availableRoles.length > 1 && (
                          <div
                            className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-xl border border-pmb-gold bg-neutral-950 px-2 py-1 shadow-2xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[8px] font-black uppercase text-gray-400 pr-0.5">Pos:</span>
                            {availableRoles.map((r) => {
                              const isCur = currentRole === r;
                              const dLabel = getRoleDisplayLabel(r);
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRoleChange(slot.key, r);
                                  }}
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase transition cursor-pointer ${
                                    isCur
                                      ? "bg-pmb-gold text-black shadow font-bold"
                                      : "bg-white/10 text-gray-300 hover:bg-white/25 hover:text-white"
                                  }`}
                                >
                                  {dLabel}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty Slot */
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed bg-black/40 text-gray-400 transition-all ${
                            isSelected
                              ? "border-pmb-gold bg-pmb-gold/20 text-pmb-gold ring-4 ring-pmb-gold/40"
                              : "border-white/40 hover:border-white/80 hover:text-white"
                          }`}
                        >
                          <span className="text-[11px] font-black uppercase">
                            {currentDisplayLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePositionMenuSlotKey(isMenuOpen ? null : slot.key);
                          }}
                          className={`mt-1 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase transition border ${
                            availableRoles.length > 1
                              ? "border-amber-400/40 bg-black/70 hover:bg-amber-400/20 text-amber-300 cursor-pointer"
                              : "border-transparent bg-black/60 text-gray-400"
                          }`}
                        >
                          <span>{currentDisplayLabel}</span>
                          {availableRoles.length > 1 && <span className="text-[7px] text-amber-400">▾</span>}
                        </button>

                        {/* Floating Position Selector Popover for Empty Slot */}
                        {isMenuOpen && availableRoles.length > 1 && (
                          <div
                            className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-xl border border-pmb-gold bg-neutral-950 px-2 py-1 shadow-2xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[8px] font-black uppercase text-gray-400 pr-0.5">Pos:</span>
                            {availableRoles.map((r) => {
                              const isCur = currentRole === r;
                              const dLabel = getRoleDisplayLabel(r);
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRoleChange(slot.key, r);
                                  }}
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase transition cursor-pointer ${
                                    isCur
                                      ? "bg-pmb-gold text-black shadow font-bold"
                                      : "bg-white/10 text-gray-300 hover:bg-white/25 hover:text-white"
                                  }`}
                                >
                                  {dLabel}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── SUBSTITUTES BENCH RAIL BELOW PITCH ─────────────────── */}
            <div className="border-t border-white/10 bg-black/90 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-pmb-gold" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Substitutes Bench
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-gray-300">
                    {substitutes.length}/12
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">
                  Click player in squad tray to add
                </span>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {substitutes.length === 0 ? (
                  <div className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-gray-500">
                    No substitutes assigned yet. Click any reserve player to add to bench.
                  </div>
                ) : (
                  substitutes.map((subId, index) => {
                    const subPlayer = playerMap.get(subId);
                    if (!subPlayer) return null;
                    return (
                      <div
                        key={subId}
                        className="group relative flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 transition hover:border-pmb-gold/50"
                      >
                        <span className="text-[10px] font-bold text-gray-500">
                          #{index + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">
                            {subPlayer.fullName}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <span className="font-semibold text-pmb-gold">
                              {subPlayer.position}
                            </span>
                            <span>•</span>
                            <span>{subPlayer.overallRating ?? "—"} OVR</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSubstitutes((prev) => prev.filter((id) => id !== subId))}
                          className="ml-1 text-gray-500 hover:text-rose-400"
                          title="Remove from bench"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT ROSTER & ASSIGNMENT PANEL (5 COLS) ────────────────── */}
        <div className="space-y-4 lg:col-span-5 xl:col-span-4">
          <div className="pmb-card flex h-full flex-col p-4">
            {/* Tab selector */}
            <div className="flex border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("STARTERS")}
                className={`flex-1 text-center text-xs font-bold uppercase transition ${
                  activeTab === "STARTERS"
                    ? "border-b-2 border-pmb-gold pb-1 text-pmb-gold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Squad Roster
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ROLES")}
                className={`flex-1 text-center text-xs font-bold uppercase transition ${
                  activeTab === "ROLES"
                    ? "border-b-2 border-pmb-gold pb-1 text-pmb-gold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Tactical Roles
              </button>
            </div>

            {activeTab === "STARTERS" ? (
              <div className="mt-3 flex flex-col space-y-3">
                {/* Search and Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search squad players..."
                      value={squadSearch}
                      onChange={(e) => setSquadSearch(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/60 py-1.5 pr-3 pl-8 text-xs text-white placeholder-gray-500 focus:border-pmb-gold focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-1 overflow-x-auto pb-1 text-[10px]">
                    {["ALL", "GK", "DEF", "MID", "FWD"].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setSelectedFilterPos(pos)}
                        className={`rounded-md px-2.5 py-1 font-bold uppercase transition ${
                          selectedFilterPos === pos
                            ? "bg-pmb-gold text-black"
                            : "bg-white/5 text-gray-400 hover:text-white"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Slot & Position Role Switcher */}
                {selectedSlotKey ? (
                  <div className="rounded-xl border border-pmb-gold/40 bg-pmb-gold/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                        <span>🎯 Slot:</span>
                        <span className="text-pmb-gold">{selectedSlotKey.toUpperCase()}</span>
                        <span className="text-gray-300">
                          ({getRoleDisplayLabel(slotRoles[selectedSlotKey] || activeFormation.slots.find((s) => s.key === selectedSlotKey)?.role || "")})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedSlotKey(null)}
                        className="text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
                      >
                        Deselect
                      </button>
                    </div>

                    {(() => {
                      const slotDef = activeFormation.slots.find((s) => s.key === selectedSlotKey);
                      if (!slotDef) return null;
                      const available = getAvailableSlotRoles(slotDef.role, slotDef.zone);
                      if (available.length <= 1) return null;
                      const currentR = slotRoles[selectedSlotKey] || slotDef.role;

                      return (
                        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-pmb-gold/20">
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
                            Change Role (e.g. LWF ➔ SS, DMF ➔ CMF):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {available.map((roleOpt) => {
                              const isSel = currentR === roleOpt;
                              const dLabel = getRoleDisplayLabel(roleOpt);
                              return (
                                <button
                                  key={roleOpt}
                                  type="button"
                                  onClick={() => handleRoleChange(selectedSlotKey, roleOpt)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                                    isSel
                                      ? "bg-pmb-gold text-black shadow-md font-bold"
                                      : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border border-white/10"
                                  }`}
                                >
                                  {dLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <p className="text-[10px] text-gray-400 italic pt-1 border-t border-white/5">
                      👉 Click any player below to assign to this slot.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-pmb-gold/20 bg-pmb-gold/5 p-2 text-[11px] text-gray-300">
                    <span>💡 Tip: Click any pitch slot to change its role (e.g. LWF ➔ SS) or assign a player.</span>
                  </div>
                )}

                {/* Squad List */}
                <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
                  {filteredSquad.map((player) => {
                    const isStarter = Object.values(starters).includes(player.id);
                    const isBench = substitutes.includes(player.id);
                    const isForeign = !isMoroccanNationality(player.nationality);

                    return (
                      <div
                        key={player.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, player.id)}
                        onClick={() => handleAssignPlayer(player.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition ${
                          isStarter
                            ? "border-emerald-500/40 bg-emerald-950/20"
                            : isBench
                            ? "border-sky-500/40 bg-sky-950/20"
                            : "border-white/5 bg-white/5 hover:border-pmb-gold/40 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Rating chip */}
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-black/80 font-black text-pmb-gold shadow">
                            {player.overallRating || "—"}
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">
                                {player.fullName}
                              </span>
                              {isForeign && (
                                <span className="rounded bg-rose-500/20 px-1 text-[8px] font-bold text-rose-400">
                                  FOREIGN
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <span className="font-bold text-pmb-gold">
                                {player.position}
                              </span>
                              <span>•</span>
                              <span>{player.nationality}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status tag */}
                        <div className="flex items-center gap-1">
                          {isStarter && (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-400">
                              STARTING XI
                            </span>
                          )}
                          {isBench && (
                            <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-400">
                              BENCH
                            </span>
                          )}
                          {!isStarter && !isBench && (
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── TACTICAL ROLES TAB ── */
              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-white">Team Captaincy</h4>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Assign leaders on the pitch to maintain morale.
                  </p>
                </div>

                {/* Captain Select */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">
                    Team Captain (C)
                  </label>
                  <select
                    value={captainId || ""}
                    onChange={(e) => setCaptainId(e.target.value || null)}
                    className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-xs text-white focus:border-pmb-gold focus:outline-none"
                  >
                    <option value="">-- No Captain Selected --</option>
                    {Object.values(starters).map((pId) => {
                      const p = playerMap.get(pId);
                      if (!p) return null;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.position}, {p.overallRating} OVR)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Vice Captain Select */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">
                    Vice-Captain (VC)
                  </label>
                  <select
                    value={viceCaptainId || ""}
                    onChange={(e) => setViceCaptainId(e.target.value || null)}
                    className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-xs text-white focus:border-pmb-gold focus:outline-none"
                  >
                    <option value="">-- No Vice-Captain Selected --</option>
                    {Object.values(starters).map((pId) => {
                      const p = playerMap.get(pId);
                      if (!p || p.id === captainId) return null;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.position}, {p.overallRating} OVR)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Tactical Position Roles Customizer */}
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">Tactical Position Roles</h4>
                      <p className="text-[10px] text-gray-400">
                        Customize flexible positions (e.g. LWF ➔ SS, DMF ➔ CMF)
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-pmb-gold font-bold">
                      11 Slots
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {activeFormation.slots.map((slot) => {
                      const assignedPId = starters[slot.key];
                      const p = assignedPId ? playerMap.get(assignedPId) : null;
                      const currentR = slotRoles[slot.key] || slot.role;
                      const available = getAvailableSlotRoles(slot.role, slot.zone);

                      return (
                        <div
                          key={slot.key}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/50 border border-white/10 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-pmb-gold text-[11px] uppercase">
                                {slot.key}
                              </span>
                              <span className="text-[10px] text-gray-400 truncate max-w-[110px]">
                                {p ? p.fullName : "(Empty)"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {available.map((rOpt) => {
                              const isCur = currentR === rOpt;
                              const optLabel = getRoleDisplayLabel(rOpt);
                              return (
                                <button
                                  key={rOpt}
                                  type="button"
                                  onClick={() => handleRoleChange(slot.key, rOpt)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase transition cursor-pointer ${
                                    isCur
                                      ? "bg-pmb-gold text-black font-bold shadow"
                                      : "bg-white/5 text-gray-400 hover:bg-white/20 hover:text-white"
                                  }`}
                                >
                                  {optLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Formation description */}
                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <span className="font-bold text-pmb-gold">
                    {activeFormation.name} Overview
                  </span>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {activeFormation.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
