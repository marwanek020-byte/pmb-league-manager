"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { z } from "zod";
import {
  CheckCircle2,
  Crown,
  LoaderCircle,
  Plus,
  ScanLine,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { ResponsiveDialog, cn } from "./shared";

const Tags = z.enum([
  "Full Time Screen",
  "Goal & Assist Highlight Cards",
  "Player Ratings: Home",
  "Player Ratings: Away",
  "Unclassified",
]);

export const MatchSchema = z.object({
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  shotsHome: z.number().int().min(0).max(999).nullable().optional(),
  shotsAway: z.number().int().min(0).max(999).nullable().optional(),
  possessionHome: z.number().min(0).max(100).nullable().optional(),
  foulsHome: z.number().int().min(0).max(999).nullable().optional(),
  foulsAway: z.number().int().min(0).max(999).nullable().optional(),
  goals: z.array(
    z.object({
      minute: z.string().regex(/^\d{1,3}(\+\d{1,2})?$/),
      side: z.enum(["home", "away"]),
      scorer: z.string().trim().min(1).max(120),
      assist: z.string().trim().max(120).nullable().optional(),
      ownGoal: z.boolean().default(false),
    })
  ).max(198),
  motm: z.string().trim().max(120).nullable().optional(),
  tags: z.array(
    z.object({
      imageIndex: z.number().int().min(0).max(4),
      kind: Tags,
    })
  ).max(20).default([]),
  warnings: z.array(z.string().max(500)).max(20).default([]),
});

export type MatchExtraction = z.infer<typeof MatchSchema>;

interface ScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixture: {
    id: string;
    homeName: string;
    awayName: string;
  };
  scan: (
    files: File[],
    context: { fixtureId: string; signal: AbortSignal }
  ) => Promise<unknown>;
  register: (
    result: MatchExtraction,
    context: { fixtureId: string; idempotencyKey: string }
  ) => Promise<void>;
}

interface UploadItem {
  id: string;
  file: File;
  url: string;
}

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function MatchScannerModal({
  open,
  onOpenChange,
  ...props
}: ScannerProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="AI Vision Match Scanner"
      description="Upload evidence, review extracted statistics, then register the result."
    >
      {open && (
        <ScannerSession
          key={props.fixture.id}
          {...props}
          onDone={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDialog>
  );
}

function ScannerSession({
  fixture,
  scan,
  register,
  onDone,
}: Omit<ScannerProps, "open" | "onOpenChange"> & {
  onDone: () => void;
}) {
  const inputId = useId();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [result, setResult] = useState<MatchExtraction | null>(null);
  const [phase, setPhase] = useState<"upload" | "scanning" | "review" | "saving" | "success">("upload");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [dragging, setDragging] = useState(false);
  const urls = useRef(new Set<string>());
  const abort = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const mounted = useRef(true);
  const pending = useRef(false);
  const registrationKey = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    const ownedUrls = urls.current;
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      abort.current?.abort();
      ownedUrls.forEach((url) => URL.revokeObjectURL(url));
      ownedUrls.clear();
    };
  }, []);

  const busy = phase === "scanning" || phase === "saving";

  function addFiles(files: File[]) {
    if (busy) return;
    setError("");
    if (uploads.length + files.length > MAX_FILES) {
      setError("You can upload up to five screenshots.");
      return;
    }
    if (files.some((file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_BYTES || file.size === 0)) {
      setError("Use non-empty JPG, PNG, or WebP images, up to 10 MB each.");
      return;
    }
    const additions = files.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { id: crypto.randomUUID(), file, url };
    });
    setUploads((current) => [...current, ...additions]);
    setResult(null);
    setVerified(false);
    setPhase("upload");
  }

  function removeFile(id: string) {
    const item = uploads.find((entry) => entry.id === id);
    if (item) {
      URL.revokeObjectURL(item.url);
      urls.current.delete(item.url);
    }
    setUploads((current) => current.filter((entry) => entry.id !== id));
    setResult(null);
    setVerified(false);
    setPhase("upload");
  }

  async function startScan() {
    if (!uploads.length || pending.current) return;
    pending.current = true;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const version = ++requestVersion.current;
    setError("");
    setVerified(false);
    setPhase("scanning");

    try {
      const raw = await scan(
        uploads.map((entry) => entry.file),
        { fixtureId: fixture.id, signal: controller.signal }
      );
      if (!mounted.current || version !== requestVersion.current || controller.signal.aborted) return;
      const parsed = MatchSchema.parse(raw);
      if (parsed.tags.some((tag) => tag.imageIndex >= uploads.length)) {
        throw new Error("Invalid image reference");
      }

      parsed.goals.sort((a, b) => {
        const minuteValue = (value: string) => {
          const [base, added = "0"] = value.split("+");
          return Number(base) + Number(added) / 100;
        };
        return minuteValue(a.minute) - minuteValue(b.minute);
      });

      setResult(parsed);
      registrationKey.current = null;
      setPhase("review");
    } catch {
      if (mounted.current && version === requestVersion.current && !controller.signal.aborted) {
        setError("The screenshots could not be verified. Check image clarity and try again.");
        setPhase("upload");
      }
    } finally {
      pending.current = false;
    }
  }

  function edit(patch: Partial<MatchExtraction>) {
    setResult((current) => (current ? { ...current, ...patch } : current));
    setVerified(false);
    registrationKey.current = null;
    setError("");
  }

  async function confirm() {
    if (!result || !verified || pending.current) return;
    const parsed = MatchSchema.safeParse(result);
    if (!parsed.success) {
      setError("Check scores, goal minutes, and player names before registering.");
      return;
    }
    pending.current = true;
    setPhase("saving");
    setError("");
    registrationKey.current ??= crypto.randomUUID();

    try {
      await register(parsed.data, {
        fixtureId: fixture.id,
        idempotencyKey: registrationKey.current,
      });
      if (mounted.current) setPhase("success");
    } catch {
      if (mounted.current) {
        setError("Registration could not be confirmed. Retry this unchanged result to reuse its request key.");
        setPhase("review");
      }
    } finally {
      pending.current = false;
    }
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  if (phase === "success") {
    return (
      <div className="relative overflow-hidden py-10 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {Array.from({ length: 16 }, (_, index) => (
            <span
              key={index}
              className="absolute bottom-1/3 h-2 w-1 animate-particle rounded-full bg-pmb-gold-light"
              style={{
                left: `${10 + index * 5}%`,
                animationDelay: `${index * 25}ms`,
              }}
            />
          ))}
        </div>
        <CheckCircle2 size={48} className="mx-auto text-pmb-turf" aria-hidden="true" />
        <h3 className="pmb-heading mt-4 text-xl text-white">Result registered</h3>
        <p role="status" className="mt-2 text-pmb-text-secondary">
          The server confirmed your match submission.
        </p>
        <button type="button" onClick={onDone} className="pmb-button-primary mt-6">
          Back to matchdays
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-5" aria-busy={busy}>
      {phase === "saving" && (
        <p role="status" className="rounded-xl border border-pmb-gold/30 bg-pmb-gold/10 p-3 text-sm text-pmb-gold-light">
          Registering result. Closing this panel does not cancel a server submission.
        </p>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 text-center transition",
          dragging ? "border-pmb-gold bg-pmb-gold/10" : "border-white/20 bg-white/[0.02]"
        )}
      >
        <UploadCloud size={32} className="mx-auto text-pmb-gold-light" aria-hidden="true" />
        <p className="mt-3 font-bold text-white">Drop match screenshots here</p>
        <p className="mt-1 text-sm text-pmb-text-secondary">
          Up to five JPG, PNG, or WebP images · 10 MB each
        </p>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={onInput}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pmb-button-secondary mt-4 cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-pmb-gold-light",
            busy && "pointer-events-none opacity-50"
          )}
        >
          Choose screenshots
        </label>
      </div>

      {/* Uploaded Thumbnails */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {uploads.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-pmb-void p-2">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={`Match evidence ${index + 1}`} className="h-full w-full object-contain" />
                {phase === "scanning" && (
                  <div aria-hidden="true" className="absolute inset-x-0 h-0.5 animate-scan bg-pmb-turf shadow-turf" />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-pmb-text-secondary">{item.file.name}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeFile(item.id)}
                  aria-label={`Remove screenshot ${index + 1}`}
                  className="pmb-icon-button !h-8 !w-8"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {result?.tags
                  ?.filter((tag) => tag.imageIndex === index)
                  .map((tag, tagIndex) => (
                    <span key={`${tag.kind}-${tagIndex}`} className="pmb-pill text-[10px]">
                      {tag.kind}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {phase === "upload" && (
        <button
          type="button"
          disabled={!uploads.length}
          onClick={startScan}
          className="pmb-button-primary w-full"
        >
          <ScanLine size={18} aria-hidden="true" /> Scan screenshots
        </button>
      )}

      {phase === "scanning" && (
        <p role="status" className="flex items-center justify-center gap-2 text-sm text-pmb-gold-light py-4">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          AI Vision is analyzing match evidence…
        </p>
      )}

      {/* Review Extracted Data */}
      {result && (phase === "review" || phase === "saving") && (
        <fieldset disabled={phase === "saving"} className="space-y-5">
          <legend className="pmb-heading mb-4 text-white">Verify extracted result</legend>

          {/* Scores */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-pmb-gold/25 bg-gold-ambient p-4">
            <label className="text-center">
              <span className="mb-2 block text-sm font-bold text-white">{fixture.homeName}</span>
              <input
                aria-label={`${fixture.homeName} score`}
                type="number"
                min={0}
                max={99}
                required
                value={Number.isNaN(result.homeScore) ? "" : result.homeScore}
                onChange={(event) => edit({ homeScore: event.target.valueAsNumber })}
                className="pmb-input pmb-data text-center text-3xl font-bold"
              />
            </label>
            <span className="text-2xl text-pmb-text-secondary">–</span>
            <label className="text-center">
              <span className="mb-2 block text-sm font-bold text-white">{fixture.awayName}</span>
              <input
                aria-label={`${fixture.awayName} score`}
                type="number"
                min={0}
                max={99}
                required
                value={Number.isNaN(result.awayScore) ? "" : result.awayScore}
                onChange={(event) => edit({ awayScore: event.target.valueAsNumber })}
                className="pmb-input pmb-data text-center text-3xl font-bold"
              />
            </label>
          </div>

          {/* Stats Inputs */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: "shotsHome", label: `${fixture.homeName} shots`, max: 999 },
              { key: "shotsAway", label: `${fixture.awayName} shots`, max: 999 },
              { key: "possessionHome", label: `${fixture.homeName} possession %`, max: 100 },
              { key: "foulsHome", label: `${fixture.homeName} fouls`, max: 999 },
              { key: "foulsAway", label: `${fixture.awayName} fouls`, max: 999 },
            ].map(({ key, label, max }) => (
              <label key={key} className="text-sm">
                <span className="mb-1 block text-pmb-text-secondary">{label}</span>
                <input
                  type="number"
                  min={0}
                  max={max}
                  step={key === "possessionHome" ? "any" : 1}
                  className="pmb-input pmb-data"
                  placeholder="Not extracted"
                  value={((result as any)[key] ?? "")}
                  onChange={(event) =>
                    edit({
                      [key]: event.target.value === "" ? null : event.target.valueAsNumber,
                    })
                  }
                />
              </label>
            ))}
          </div>

          {/* Goal Timeline */}
          <section aria-labelledby="goals-title">
            <h3 id="goals-title" className="pmb-heading mb-3 text-sm text-white">Goal timeline</h3>
            <ol className="space-y-3">
              {result.goals.map((goal, index) => {
                const changeGoal = (patch: Partial<MatchExtraction["goals"][number]>) =>
                  edit({
                    goals: result.goals.map((entry, current) =>
                      current === index ? { ...entry, ...patch } : entry
                    ),
                  });
                return (
                  <li key={index} className="rounded-xl border border-white/10 bg-pmb-void p-3">
                    <div className="grid grid-cols-[70px_1fr_auto] gap-2">
                      <input
                        aria-label={`Goal ${index + 1} minute`}
                        className="pmb-input pmb-data"
                        value={goal.minute}
                        placeholder="45+2"
                        onChange={(event) => changeGoal({ minute: event.target.value })}
                      />
                      <select
                        aria-label={`Goal ${index + 1} credited team`}
                        className="pmb-input"
                        value={goal.side}
                        onChange={(event) => changeGoal({ side: event.target.value as "home" | "away" })}
                      >
                        <option value="home">{fixture.homeName}</option>
                        <option value="away">{fixture.awayName}</option>
                      </select>
                      <button
                        type="button"
                        aria-label={`Remove goal ${index + 1}`}
                        className="pmb-icon-button"
                        onClick={() => edit({ goals: result.goals.filter((_, current) => current !== index) })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        aria-label={`Goal ${index + 1} scorer`}
                        className="pmb-input"
                        value={goal.scorer}
                        placeholder="Scorer"
                        maxLength={120}
                        onChange={(event) => changeGoal({ scorer: event.target.value })}
                      />
                      <input
                        aria-label={`Goal ${index + 1} assist`}
                        className="pmb-input"
                        value={goal.assist ?? ""}
                        placeholder="Assist · optional"
                        maxLength={120}
                        onChange={(event) => changeGoal({ assist: event.target.value || null })}
                      />
                    </div>
                    <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-pmb-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={goal.ownGoal}
                        onChange={(event) => changeGoal({ ownGoal: event.target.checked })}
                        className="h-5 w-5 accent-yellow-400"
                      />
                      Own goal
                    </label>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              disabled={result.goals.length >= 198}
              className="pmb-button-secondary mt-3"
              onClick={() =>
                edit({
                  goals: [
                    ...result.goals,
                    {
                      minute: "1",
                      side: "home",
                      scorer: "",
                      assist: null,
                      ownGoal: false,
                    },
                  ],
                })
              }
            >
              <Plus size={16} /> Add missing goal
            </button>
          </section>

          {/* MOTM */}
          <label className="block rounded-xl border border-pmb-gold/30 bg-pmb-gold/10 p-4">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-pmb-gold-light">
              <Crown size={18} aria-hidden="true" /> Man of the Match
            </span>
            <input
              className="pmb-input"
              value={result.motm ?? ""}
              placeholder="Not extracted"
              maxLength={120}
              onChange={(event) => edit({ motm: event.target.value || null })}
            />
          </label>

          {/* Human Checkbox Verification */}
          <label className="flex min-h-11 items-start gap-3 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
              className="mt-0.5 h-5 w-5 accent-yellow-400"
            />
            <span>I checked the score, events, and player names against the screenshots.</span>
          </label>

          <button
            type="button"
            disabled={!verified || phase === "saving"}
            onClick={confirm}
            className="pmb-button-primary w-full"
          >
            {phase === "saving" ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <ShieldCheck size={18} />
            )}
            {phase === "saving" ? "Registering…" : "Confirm & Register Result"}
          </button>
        </fieldset>
      )}

      {error && <p role="alert" className="rounded-xl bg-pmb-red/10 p-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}
