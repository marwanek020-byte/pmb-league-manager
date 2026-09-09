"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type PlayerSummary = {
  id: string;
  fullName: string;
  position: string;
  shirtNumber?: number | null;
  overallRating?: number | null;
  category?: "XI" | "BENCH" | "RESERVE";
};

type MatchEvent = {
  id?: string;
  clubId: string;
  playerId: string;
  assistPlayerId?: string | null;
  type: "GOAL" | "ASSIST" | "YELLOW_CARD" | "RED_CARD" | "OWN_GOAL" | "SUBSTITUTION";
  minute?: number | null;
  player?: PlayerSummary;
  assistPlayer?: PlayerSummary;
  club?: { id: string; name: string };
};

type MatchFixtureContext = {
  id: string;
  matchday: number;
  homeClub: { id: string; name: string; logo: string | null };
  awayClub: { id: string; name: string; logo: string | null };
};

type Props = {
  isOpen: boolean;
  match: MatchFixtureContext | null;
  matchSquads?: {
    homeClub: { id: string; name: string; players?: PlayerSummary[] };
    awayClub: { id: string; name: string; players?: PlayerSummary[] };
  } | null;
  onClose: () => void;
  onConfirmResult: (
    matchId: string,
    resultData: {
      homeGoals: number;
      awayGoals: number;
      events: MatchEvent[];
      manOfTheMatchId?: string | null;
    }
  ) => Promise<void>;
};

type UploadedImage = {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
};

export function MatchAIScannerModal({
  isOpen,
  match,
  matchSquads,
  onClose,
  onConfirmResult,
}: Props) {
  // Upload and scanning state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Gemini API key settings
  const [customApiKey, setCustomApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Confirmation & Review Stage
  const [stage, setStage] = useState<"UPLOAD" | "REVIEW">("UPLOAD");
  const [homeGoals, setHomeGoals] = useState<number>(0);
  const [awayGoals, setAwayGoals] = useState<number>(0);
  const [reviewEvents, setReviewEvents] = useState<MatchEvent[]>([]);
  const [motmId, setMotmId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pmb_gemini_api_key");
      if (stored) setCustomApiKey(stored);
    }
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setImages([]);
      setScanError(null);
      setSaveError(null);
      setStage("UPLOAD");
      setHomeGoals(0);
      setAwayGoals(0);
      setReviewEvents([]);
      setMotmId("");
      setActiveImageIndex(0);
    }
  }, [isOpen]);

  // Handle files added (via input or drag or clipboard)
  const processFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            dataUrl,
            mimeType: file.type || "image/jpeg",
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle Global Clipboard Paste (Ctrl + V)
  useEffect(() => {
    if (!isOpen || stage !== "UPLOAD") return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        processFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, stage, processFiles]);

  if (!isOpen || !match) return null;

  const homePlayers = matchSquads?.homeClub.players || [];
  const awayPlayers = matchSquads?.awayClub.players || [];

  // ── 1. Call AI Vision Endpoint ─────────────────────────────────────────────
  async function handleScan() {
    if (images.length === 0) {
      setScanError("Please add at least one screenshot before scanning.");
      return;
    }

    setScanning(true);
    setScanError(null);

    try {
      if (customApiKey) {
        localStorage.setItem("pmb_gemini_api_key", customApiKey.trim());
      }

      const payload = {
        images: images.map((img) => ({
          mimeType: img.mimeType,
          data: img.dataUrl,
        })),
        apiKey: customApiKey.trim() || undefined,
      };

      const res = await fetch(`/api/admin/matches/${match?.id}/ai-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze screenshots.");
      }

      // Pre-fill extracted values
      setHomeGoals(data.homeGoals ?? 0);
      setAwayGoals(data.awayGoals ?? 0);

      const parsedEvents: MatchEvent[] = (data.goals || []).map((g: any) => ({
        clubId: g.clubId,
        playerId: g.playerId,
        assistPlayerId: g.assistPlayerId || null,
        type: "GOAL" as const,
        minute: g.minute ?? 45,
      }));

      // Also include any extracted substitutions
      if (Array.isArray(data.substitutions)) {
        data.substitutions.forEach((sub: any) => {
          if (sub.clubId && sub.playerInId && sub.playerOutId) {
            parsedEvents.push({
              clubId: sub.clubId,
              playerId: sub.playerInId,
              assistPlayerId: sub.playerOutId,
              type: "SUBSTITUTION" as const,
              minute: sub.minute ?? 60,
            });
          }
        });
      }

      setReviewEvents(parsedEvents);
      setStage("REVIEW");
    } catch (err: any) {
      setScanError(err.message || "An error occurred during AI analysis.");
    } finally {
      setScanning(false);
    }
  }

  // ── 2. Add / Remove Goal during Review ─────────────────────────────────────
  function addManualGoal(clubId: string) {
    const isHome = clubId === match?.homeClub.id;
    setReviewEvents((prev) => [
      ...prev,
      {
        clubId,
        playerId: "",
        assistPlayerId: "",
        type: "GOAL",
        minute: 45,
      },
    ]);

    // Automatically sync score
    if (isHome) {
      setHomeGoals((prev) => prev + 1);
    } else {
      setAwayGoals((prev) => prev + 1);
    }
  }

  function removeEvent(index: number) {
    const ev = reviewEvents[index];
    if (ev && ev.type === "GOAL") {
      if (ev.clubId === match?.homeClub.id && homeGoals > 0) {
        setHomeGoals((g) => Math.max(0, g - 1));
      } else if (ev.clubId === match?.awayClub.id && awayGoals > 0) {
        setAwayGoals((g) => Math.max(0, g - 1));
      }
    }
    setReviewEvents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEvent(index: number, field: keyof MatchEvent, value: any) {
    setReviewEvents((prev) =>
      prev.map((ev, i) => (i === index ? { ...ev, [field]: value } : ev))
    );
  }

  // ── 3. Final Confirmation Submission ───────────────────────────────────────
  async function handleConfirm() {
    if (homeGoals < 0 || awayGoals < 0) {
      setSaveError("Scores must be 0 or higher.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await onConfirmResult(match!.id, {
        homeGoals,
        awayGoals,
        events: reviewEvents.filter((e) => e.clubId && e.playerId),
        manOfTheMatchId: motmId || null,
      });
      onClose();
    } catch (err: any) {
      setSaveError(err.message || "Failed to confirm and save match result.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-pmb-dark-surface border border-pmb-gold/40 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/90 overflow-hidden my-auto max-h-[92vh] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-pmb-gold via-amber-300 to-pmb-gold" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pmb-gold/15 border border-pmb-gold/30 text-xl">
              📸
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-pmb-gold uppercase">
                  eFootball AI Vision Scanner
                </span>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-pmb-gold/10 text-pmb-gold border-pmb-gold/30">
                  {stage === "UPLOAD" ? "Step 1: Upload Screenshots" : "Step 2: Review & Confirm"}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white">
                {match.homeClub.name} vs {match.awayClub.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ═══════════════════════════════════════════════════════════════════
              STAGE 1: UPLOAD SCREENSHOTS
          ════════════════════════════════════════════════════════════════════ */}
          {stage === "UPLOAD" && (
            <div className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3",
                  isDragging
                    ? "border-pmb-gold bg-pmb-gold/10 scale-[1.01]"
                    : "border-white/20 hover:border-pmb-gold/60 bg-black/40 hover:bg-black/60",
                ].join(" ")}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) processFiles(e.target.files);
                  }}
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pmb-gold/15 text-pmb-gold text-2xl border border-pmb-gold/30">
                  📸
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-black text-white">
                    Drop your eFootball screenshots here, or{" "}
                    <span className="text-pmb-gold underline">browse files</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-pmb-gold">Ctrl + V</kbd> to paste directly from your clipboard!
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                    ✓ Full Time Result Screen (Scores & Stats)
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                    ✓ Goal Scorer & Assist Highlight Cards
                  </span>
                </div>
              </div>

              {/* Uploaded Images Preview Strip */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>Uploaded Screenshots ({images.length})</span>
                    <button
                      type="button"
                      onClick={() => setImages([])}
                      className="text-red-400 hover:text-red-300 text-[11px]"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className="relative group rounded-xl overflow-hidden border border-white/15 bg-black/60 aspect-video shadow-md"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="h-7 w-7 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow"
                          >
                            ✕
                          </button>
                        </div>
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[8px] font-mono text-gray-300">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scan Error Notice */}
              {scanError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
                  <p className="font-bold">Scan Failed</p>
                  <p className="text-[11px] mt-0.5">{scanError}</p>
                </div>
              )}

              {/* API Key Toggle (Optional Fallback) */}
              <div className="pt-2 border-t border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-gray-400 hover:text-pmb-gold text-[11px] flex items-center gap-1"
                >
                  <span>⚙️</span>
                  <span>
                    {showKeyInput ? "Hide Custom Gemini Key" : "Custom Google Gemini API Key (Optional)"}
                  </span>
                </button>

                {showKeyInput && (
                  <div className="mt-2 space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/10">
                    <p className="text-[11px] text-gray-400">
                      If server environment key is not set, provide your own free Gemini API key from{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-pmb-gold underline"
                      >
                        Google AI Studio
                      </a>
                      :
                    </p>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="pmb-input text-xs w-full py-1.5 px-3"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STAGE 2: REVIEW & CONFIRMATION
          ════════════════════════════════════════════════════════════════════ */}
          {stage === "REVIEW" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Screenshot Visual Inspector (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-pmb-gold">
                    Match Screenshots ({images.length})
                  </span>
                  <span className="text-[10px] text-gray-400">Click thumbnails to inspect</span>
                </div>

                {/* Main Selected Image Preview */}
                {images[activeImageIndex] && (
                  <div className="rounded-xl overflow-hidden border border-white/20 bg-black/80 shadow-lg aspect-video flex items-center justify-center">
                    <img
                      src={images[activeImageIndex].dataUrl}
                      alt="Match Screenshot"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                {/* Thumbnails list */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={[
                          "h-14 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition cursor-pointer",
                          activeImageIndex === idx
                            ? "border-pmb-gold shadow-md"
                            : "border-white/10 opacity-60 hover:opacity-100",
                        ].join(" ")}
                      >
                        <img src={img.dataUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: AI-Extracted Editable Form (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Score Banner with Quick Steppers */}
                <div className="p-4 rounded-2xl bg-black/60 border border-pmb-gold/30 shadow-inner flex items-center justify-between gap-3">
                  {/* Home Club Score */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ClubBadge name={match.homeClub.name} logo={match.homeClub.logo} size="md" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black truncate">{match.homeClub.name}</p>
                      <p className="text-[9px] uppercase font-bold text-gray-400">Home</p>
                    </div>
                  </div>

                  {/* Score Steppers */}
                  <div className="flex items-center gap-2 shrink-0 px-2">
                    <div className="flex items-center rounded-xl border border-white/20 bg-black/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setHomeGoals((g) => Math.max(0, g - 1))}
                        className="px-2 py-1 bg-white/5 hover:bg-white/15 text-xs font-black transition"
                      >
                        -
                      </button>
                      <span className="w-9 text-center text-lg font-black text-white">{homeGoals}</span>
                      <button
                        type="button"
                        onClick={() => setHomeGoals((g) => g + 1)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/15 text-xs font-black transition"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-gray-500 font-black">—</span>

                    <div className="flex items-center rounded-xl border border-white/20 bg-black/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setAwayGoals((g) => Math.max(0, g - 1))}
                        className="px-2 py-1 bg-white/5 hover:bg-white/15 text-xs font-black transition"
                      >
                        -
                      </button>
                      <span className="w-9 text-center text-lg font-black text-white">{awayGoals}</span>
                      <button
                        type="button"
                        onClick={() => setAwayGoals((g) => g + 1)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/15 text-xs font-black transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Away Club Score */}
                  <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black truncate">{match.awayClub.name}</p>
                      <p className="text-[9px] uppercase font-bold text-gray-400">Away</p>
                    </div>
                    <ClubBadge name={match.awayClub.name} logo={match.awayClub.logo} size="md" />
                  </div>
                </div>

                {/* Goals & Assists List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-pmb-gold flex items-center gap-1.5">
                      <span>⚽</span>
                      <span>Extracted Goals & Assists ({reviewEvents.filter((e) => e.type === "GOAL").length})</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => addManualGoal(match.homeClub.id)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-pmb-gold/10 hover:bg-pmb-gold/20 text-pmb-gold border border-pmb-gold/30 transition"
                      >
                        + Goal ({match.homeClub.name.slice(0, 8)})
                      </button>
                      <button
                        type="button"
                        onClick={() => addManualGoal(match.awayClub.id)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-pmb-gold/10 hover:bg-pmb-gold/20 text-pmb-gold border border-pmb-gold/30 transition"
                      >
                        + Goal ({match.awayClub.name.slice(0, 8)})
                      </button>
                    </div>
                  </div>

                  {reviewEvents.length === 0 ? (
                    <div className="text-center py-5 text-xs text-gray-500 rounded-xl border border-dashed border-white/15 bg-black/30">
                      No goal events extracted. Click buttons above to add goals.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {reviewEvents.map((ev, index) => {
                        const isHome = ev.clubId === match.homeClub.id;
                        const clubPlayers = isHome ? homePlayers : awayPlayers;
                        const clubName = isHome ? match.homeClub.name : match.awayClub.name;

                        return (
                          <div
                            key={index}
                            className="p-2.5 rounded-xl border border-white/10 bg-black/40 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs"
                          >
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-pmb-gold/15 text-pmb-gold shrink-0">
                              {isHome ? "Home" : "Away"} · {clubName.slice(0, 10)}
                            </span>

                            {/* Minute */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-gray-400 font-bold">Min:</span>
                              <input
                                type="number"
                                min={1}
                                max={120}
                                value={ev.minute ?? ""}
                                onChange={(e) =>
                                  updateEvent(
                                    index,
                                    "minute",
                                    e.target.value ? parseInt(e.target.value, 10) : null
                                  )
                                }
                                className="pmb-input text-xs w-14 py-1 text-center font-bold"
                              />
                            </div>

                            {/* Scorer Dropdown */}
                            <select
                              value={ev.playerId}
                              onChange={(e) => updateEvent(index, "playerId", e.target.value)}
                              className="pmb-input text-xs flex-1 py-1 font-semibold text-white"
                            >
                              <option value="">-- Select Goal Scorer --</option>
                              {clubPlayers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  ⚽ {p.fullName} {p.shirtNumber ? `(#${p.shirtNumber})` : ""} [{p.position}]
                                </option>
                              ))}
                            </select>

                            {/* Assist Dropdown */}
                            <select
                              value={ev.assistPlayerId || ""}
                              onChange={(e) =>
                                updateEvent(index, "assistPlayerId", e.target.value || null)
                              }
                              className="pmb-input text-xs flex-1 py-1 text-gray-300"
                            >
                              <option value="">-- No Assist --</option>
                              {clubPlayers
                                .filter((p) => p.id !== ev.playerId)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    👟 Assist: {p.fullName} [{p.position}]
                                  </option>
                                ))}
                            </select>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => removeEvent(index)}
                              className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1 shrink-0 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Man of the Match (Optional) */}
                <div className="pt-2 border-t border-white/10 flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 shrink-0">⭐ Man of the Match:</span>
                  <select
                    value={motmId}
                    onChange={(e) => setMotmId(e.target.value)}
                    className="pmb-input text-xs flex-1 py-1"
                  >
                    <option value="">-- None Selected --</option>
                    <optgroup label={`${match.homeClub.name} (Home)`}>
                      {homePlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({match.homeClub.name})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={`${match.awayClub.name} (Away)`}>
                      {awayPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({match.awayClub.name})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Save Error */}
                {saveError && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
                    {saveError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
          {stage === "UPLOAD" ? (
            <>
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <span>★</span> {images.length} {images.length === 1 ? "screenshot" : "screenshots"} queued
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={images.length === 0 || scanning}
                  onClick={handleScan}
                  className={[
                    "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg",
                    images.length === 0 || scanning
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-pmb-gold via-amber-400 to-pmb-gold text-pmb-black hover:opacity-95",
                  ].join(" ")}
                >
                  {scanning ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-pmb-black border-t-transparent" />
                      <span>Analyzing with Gemini AI…</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Analyze with AI</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStage("UPLOAD")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>←</span>
                <span>Re-scan / Add More Images</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirm}
                  className={[
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg",
                    saving
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30",
                  ].join(" ")}
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      <span>Saving Match Result…</span>
                    </>
                  ) : (
                    <>
                      <span>✓ Confirm & Save Result</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
