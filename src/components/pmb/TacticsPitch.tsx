"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, Flag, GripVertical, Save, Target, Zap } from "lucide-react";
import { cn } from "./shared";

export interface SquadPlayer {
  id: string;
  name: string;
  number: number;
  position: string;
  portraitUrl?: string | null;
  chemistry: number;
}

export type Point = { x: number; y: number };
export type Formation = "4-3-3" | "4-2-3-1" | "3-5-2" | "5-3-2" | "Custom";
export type SetPiece = "penalty" | "freeKick" | "corner" | "captain";

export interface TacticsState {
  formation: Formation;
  coordinates: Point[];
  starters: string[];
  assignments: Record<SetPiece, string>;
}

const formations: Record<Exclude<Formation, "Custom">, Point[]> = {
  "4-3-3": [
    { x: 50, y: 90 },
    { x: 16, y: 70 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 84, y: 70 },
    { x: 25, y: 48 }, { x: 50, y: 54 }, { x: 75, y: 48 },
    { x: 18, y: 23 }, { x: 50, y: 16 }, { x: 82, y: 23 },
  ],
  "4-2-3-1": [
    { x: 50, y: 90 },
    { x: 16, y: 72 }, { x: 38, y: 75 }, { x: 62, y: 75 }, { x: 84, y: 72 },
    { x: 36, y: 55 }, { x: 64, y: 55 },
    { x: 18, y: 33 }, { x: 50, y: 36 }, { x: 82, y: 33 },
    { x: 50, y: 15 },
  ],
  "3-5-2": [
    { x: 50, y: 90 },
    { x: 25, y: 73 }, { x: 50, y: 76 }, { x: 75, y: 73 },
    { x: 12, y: 46 }, { x: 33, y: 51 }, { x: 50, y: 39 },
    { x: 67, y: 51 }, { x: 88, y: 46 },
    { x: 35, y: 18 }, { x: 65, y: 18 },
  ],
  "5-3-2": [
    { x: 50, y: 90 },
    { x: 12, y: 64 }, { x: 31, y: 74 }, { x: 50, y: 76 },
    { x: 69, y: 74 }, { x: 88, y: 64 },
    { x: 26, y: 45 }, { x: 50, y: 49 }, { x: 74, y: 45 },
    { x: 35, y: 20 }, { x: 65, y: 20 },
  ],
};

const formationOptions: Formation[] = [
  "4-3-3", "4-2-3-1", "3-5-2", "5-3-2", "Custom",
];

const duties = [
  { key: "penalty", label: "Penalty master", Icon: Target },
  { key: "freeKick", label: "Free-kick specialist", Icon: Zap },
  { key: "corner", label: "Corner taker", Icon: Flag },
  { key: "captain", label: "Team captain", Icon: Crown },
] as const;

function PlayerToken({
  slot,
  player,
  point,
  reducedMotion,
  disabled,
}: {
  slot: number;
  player: SquadPlayer;
  point: Point;
  reducedMotion: boolean;
  disabled: boolean;
}) {
  const id = `slot-${slot}`;
  const drag = useDraggable({ id, data: { slot }, disabled });
  const drop = useDroppable({ id, data: { slot }, disabled });

  return (
    <motion.div
      ref={drop.setNodeRef}
      initial={false}
      animate={{ left: `${point.x}%`, top: `${point.y}%` }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 240, damping: 26 }
      }
      className="absolute"
      style={{ zIndex: drag.isDragging ? 30 : 10 }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <button
          ref={drag.setNodeRef}
          type="button"
          {...drag.listeners}
          {...drag.attributes}
          disabled={disabled}
          aria-label={`${player.name}, ${player.position}, shirt ${player.number}. Drag to reposition or swap.`}
          style={{
            transform: CSS.Translate.toString(drag.transform),
            touchAction: "none",
          }}
          className={cn(
            "flex w-14 cursor-grab flex-col items-center rounded-xl",
            "border bg-pmb-void/95 p-1.5 shadow-lg sm:w-20",
            "active:cursor-grabbing",
            drop.isOver ? "border-pmb-gold-light" : "border-white/25",
            drag.isDragging && "shadow-gold border-pmb-gold scale-105"
          )}
        >
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/10 sm:h-10 sm:w-10">
            {player.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.portraitUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="pmb-data text-sm font-bold text-white">{player.number}</span>
            )}
          </span>
          <span className="mt-1 w-full truncate text-[9px] font-bold text-white sm:text-xs text-center">
            {player.name}
          </span>
          <span className="pmb-data mt-0.5 text-[9px] text-pmb-gold-light">
            {player.position} · {player.number}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 h-1 w-7 rounded-full",
              player.chemistry >= 75
                ? "bg-pmb-turf"
                : player.chemistry >= 45
                ? "bg-pmb-gold-light"
                : "bg-pmb-red"
            )}
          />
          <span className="sr-only">Chemistry {player.chemistry}%</span>
        </button>
      </div>
    </motion.div>
  );
}

interface TacticsProps {
  players: SquadPlayer[];
  initial: TacticsState;
  onSave: (state: TacticsState) => Promise<void>;
}

function validInitial(players: SquadPlayer[], state: TacticsState) {
  const ids = new Set(players.map((player) => player.id));
  return (
    ids.size === players.length &&
    state.starters.length === 11 &&
    new Set(state.starters).size === 11 &&
    state.starters.every((id) => ids.has(id)) &&
    state.coordinates.length === 11 &&
    state.coordinates.every(
      ({ x, y }) =>
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 8 && x <= 92 &&
        y >= 8 && y <= 92
    ) &&
    Object.values(state.assignments).every(
      (id) => id === "" || state.starters.includes(id)
    )
  );
}

export default function TacticsPitch(props: TacticsProps) {
  if (!validInitial(props.players, props.initial)) {
    return (
      <div role="alert" className="pmb-card p-6 text-red-300">
        Unable to load tactics: provide 11 unique starters, valid coordinates,
        and set-piece assignments from the starting lineup.
      </div>
    );
  }
  return <TacticsEditor {...props} />;
}

function TacticsEditor({ players, initial, onSave }: TacticsProps) {
  const [state, setState] = useState<TacticsState>({
    ...initial,
    coordinates:
      initial.formation === "Custom"
        ? initial.coordinates
        : formations[initial.formation] || formations["4-3-3"],
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const saveLock = useRef(false);
  const reducedMotion = Boolean(useReducedMotion());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const byId = new Map(players.map((player) => [player.id, player]));
  const bench = players.filter((player) => !state.starters.includes(player.id));

  function assignPlayer(slot: number, nextId: string) {
    setNotice("");
    setState((current) => {
      const starters = [...current.starters];
      const previousId = starters[slot];
      const existingSlot = starters.indexOf(nextId);
      if (existingSlot >= 0) {
        starters[existingSlot] = previousId;
      }
      starters[slot] = nextId;

      const assignments = { ...current.assignments };
      for (const duty of duties) {
        if (assignments[duty.key] && !starters.includes(assignments[duty.key])) {
          assignments[duty.key] = "";
        }
      }
      return { ...current, starters, assignments };
    });
  }

  function finishDrag(event: DragEndEvent) {
    const slot = event.active.data.current?.slot;
    if (typeof slot !== "number" || saving) return;

    if (state.formation === "Custom" && pitchRef.current) {
      const rect = pitchRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setNotice("");
      setState((current) => ({
        ...current,
        coordinates: current.coordinates.map((point, index) =>
          index === slot
            ? {
                x: Math.max(8, Math.min(92, point.x + (event.delta.x / rect.width) * 100)),
                y: Math.max(8, Math.min(92, point.y + (event.delta.y / rect.height) * 100)),
              }
            : point
        ),
      }));
      return;
    }

    const targetSlot = event.over?.data.current?.slot;
    if (typeof targetSlot === "number" && slot !== targetSlot) {
      assignPlayer(slot, state.starters[targetSlot]);
    }
  }

  async function save() {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setNotice("");
    try {
      await onSave(state);
      setNotice("Tactics saved.");
    } catch {
      setNotice("Tactics could not be saved. Your changes remain on this screen.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="tactics-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="pmb-eyebrow">Squad command</p>
          <h1 id="tactics-title" className="pmb-heading text-2xl text-white">
            Tactical board
          </h1>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="pmb-button-primary"
        >
          <Save size={17} aria-hidden="true" />
          {saving ? "Saving…" : "Save tactics"}
        </button>
      </header>

      {/* Formation Selector */}
      <div role="group" aria-label="Formation" className="flex gap-2 overflow-x-auto pb-2">
        {formationOptions.map((formation) => (
          <button
            key={formation}
            type="button"
            aria-pressed={state.formation === formation}
            disabled={saving}
            className={cn(
              "pmb-button-secondary shrink-0 rounded-full",
              state.formation === formation &&
                "border-pmb-gold bg-pmb-gold/10 text-pmb-gold-light"
            )}
            onClick={() => {
              setNotice("");
              setState((current) => ({
                ...current,
                formation,
                coordinates:
                  formation === "Custom"
                    ? current.coordinates
                    : formations[formation],
              }));
            }}
          >
            {formation}
          </button>
        ))}
      </div>

      <p id="pitch-help" className="text-sm text-pmb-text-secondary">
        {state.formation === "Custom"
          ? "Drag to position players freely. Keyboard: Space to pick up, arrows to move, Space to drop."
          : "Drag players onto another slot to swap positions. You can also use the accessible lineup selectors below."}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
        <div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={finishDrag}
          >
            <div
              ref={pitchRef}
              aria-label="Starting eleven tactical pitch"
              aria-describedby="pitch-help"
              className="pitch-turf relative isolate aspect-[68/100]
                overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
            >
              <svg
                viewBox="0 0 100 148"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.45">
                  <rect x="4" y="4" width="92" height="140" />
                  <path d="M4 74H96" />
                  <circle cx="50" cy="74" r="13" />
                  <rect x="23" y="4" width="54" height="24" />
                  <rect x="35" y="4" width="30" height="9" />
                  <rect x="23" y="120" width="54" height="24" />
                  <rect x="35" y="135" width="30" height="9" />
                  <path d="M39 28Q50 40 61 28M39 120Q50 108 61 120" />
                </g>
                <g fill="rgba(255,255,255,0.6)">
                  <circle cx="50" cy="74" r="0.8" />
                  <circle cx="50" cy="20" r="0.7" />
                  <circle cx="50" cy="128" r="0.7" />
                </g>
              </svg>

              {state.starters.map((id, slot) => {
                const player = byId.get(id);
                if (!player) return null;
                return (
                  <PlayerToken
                    key={slot}
                    slot={slot}
                    player={player}
                    point={state.coordinates[slot] || { x: 50, y: 50 }}
                    reducedMotion={reducedMotion}
                    disabled={saving}
                  />
                );
              })}
            </div>
          </DndContext>

          {/* Bench Substitutes */}
          <details className="pmb-card mt-4 p-4" open>
            <summary className="min-h-11 cursor-pointer font-bold text-white">
              Bench · {bench.length} players
            </summary>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {bench.map((player) => (
                <div key={player.id} className="min-w-32 rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-bold text-white">{player.name}</p>
                  <p className="pmb-data mt-1 text-xs text-pmb-text-secondary">
                    {player.number} · {player.position}
                  </p>
                </div>
              ))}
              {!bench.length && (
                <p className="text-sm text-pmb-text-secondary">No substitutes available.</p>
              )}
            </div>
            <p className="mt-2 text-xs text-pmb-text-secondary">
              Use a lineup selector below to swap a substitute into the starting eleven.
            </p>
          </details>
        </div>

        {/* Set Pieces & Lineup Editor */}
        <div className="space-y-5">
          <section className="pmb-card p-5">
            <h2 className="pmb-heading mb-4 text-sm text-white">Set-piece assignments</h2>
            <div className="space-y-4">
              {duties.map(({ key, label, Icon }) => (
                <label key={key} className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm text-pmb-text-secondary">
                    <Icon size={16} className="text-pmb-gold-light" aria-hidden="true" />
                    {label}
                  </span>
                  <select
                    className="pmb-input"
                    value={state.assignments[key]}
                    disabled={saving}
                    onChange={(event) => {
                      setNotice("");
                      setState((current) => ({
                        ...current,
                        assignments: {
                          ...current.assignments,
                          [key]: event.target.value,
                        },
                      }));
                    }}
                  >
                    <option value="">Unassigned</option>
                    {state.starters.map((id) => {
                      const player = byId.get(id);
                      return (
                        <option key={id} value={id}>
                          {player ? `${player.number} · ${player.name} (${player.position})` : id}
                        </option>
                      );
                    })}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <details className="pmb-card p-5">
            <summary className="min-h-11 cursor-pointer font-bold text-white">
              Accessible lineup editor
            </summary>
            <div className="mt-3 space-y-3">
              {state.starters.map((id, slot) => (
                <label key={slot} className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs text-pmb-text-secondary">
                    <GripVertical size={13} aria-hidden="true" />
                    Slot {slot + 1}
                  </span>
                  <select
                    className="pmb-input"
                    value={id}
                    disabled={saving}
                    onChange={(event) => assignPlayer(slot, event.target.value)}
                  >
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.number} · {player.name} · {player.position}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <p role="status" className="min-h-5 text-sm text-pmb-text-secondary">
        {notice}
      </p>
    </section>
  );
}
