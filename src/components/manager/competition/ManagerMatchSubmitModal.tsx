"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type MatchContext = {
  id: string;
  matchday: number;
  homeClub: { id: string; name: string; logo: string | null };
  awayClub: { id: string; name: string; logo: string | null };
};

type Props = {
  isOpen: boolean;
  match: MatchContext | null;
  myClubId: string;
  onClose: () => void;
  onSuccess: () => void;
};

type QueuedImage = {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  type: "FULL_TIME" | "GOAL_HIGHLIGHT" | "PLAYER_RATINGS";
};

export function ManagerMatchSubmitModal({
  isOpen,
  match,
  myClubId,
  onClose,
  onSuccess,
}: Props) {
  const [images, setImages] = useState<QueuedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [fraudResult, setFraudResult] = useState<{
    reasons: string[];
    penalty: string;
  } | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pmb_gemini_api_key");
      if (saved) setCustomApiKey(saved);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setImages([]);
      setError(null);
      setFraudResult(null);
      setSuccessResult(null);
    }
  }, [isOpen]);

function optimizeImageForUpload(file: File, maxDim = 1280, quality = 0.68): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve({ dataUrl: "", mimeType: "image/jpeg" });
        return;
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve({ dataUrl: compressed, mimeType: "image/jpeg" });
          return;
        }
        resolve({ dataUrl: src, mimeType: file.type || "image/jpeg" });
      };
      img.onerror = () => {
        resolve({ dataUrl: src, mimeType: file.type || "image/jpeg" });
      };
      img.src = src;
    };
    reader.onerror = () => {
      resolve({ dataUrl: "", mimeType: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
  });
}

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (valid.length === 0) return;

    for (let idx = 0; idx < valid.length; idx++) {
      const file = valid[idx];
      const { dataUrl, mimeType } = await optimizeImageForUpload(file);
      if (!dataUrl) continue;
      setImages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          dataUrl,
          mimeType,
          // Auto-tag first image as FULL_TIME, subsequent as GOAL_HIGHLIGHT
          type: prev.length === 0 && idx === 0 ? "FULL_TIME" : "GOAL_HIGHLIGHT",
        },
      ]);
    }
  }, []);

  // Global Clipboard Paste (Ctrl + V)
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, processFiles]);

  if (!isOpen || !match) return null;

  const isHome = myClubId === match.homeClub.id;
  const opponent = isHome ? match.awayClub : match.homeClub;
  const myClub = isHome ? match.homeClub : match.awayClub;

  async function handleSubmit() {
    if (images.length === 0) {
      setError("Please upload your match screenshots (Full Time screen + Goal/Assist cards).");
      return;
    }

    setSubmitting(true);
    setError(null);
    setFraudResult(null);

    try {
      if (customApiKey.trim() && typeof window !== "undefined") {
        localStorage.setItem("pmb_gemini_api_key", customApiKey.trim());
      }

      const payload = {
        images: images.map((img) => ({
          mimeType: img.mimeType,
          data: img.dataUrl,
          screenType: img.type,
        })),
        apiKey: customApiKey.trim() || undefined,
      };

      const res = await fetch(`/api/manager/matches/${match?.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process match submission.");
      }

      if (data.isFraud) {
        // AI Fraud Caught
        setFraudResult({
          reasons: data.fraudReasons || ["Falsified match screen detected."],
          penalty: data.penaltyApplied || "€10M",
        });
      } else {
        // Successful submission awaiting admin review
        setSuccessResult(data);
        setTimeout(() => {
          onSuccess();
        }, 2200);
      }
    } catch (err: any) {
      const rawMsg = err?.message || "";
      if (
        rawMsg.toLowerCase().includes("load failed") ||
        rawMsg.toLowerCase().includes("failed to fetch")
      ) {
        setError(
          "Network upload failed (connection dropped or payload too large). Please check your connection or upload fewer screenshots."
        );
      } else {
        setError(rawMsg || "An error occurred while submitting.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-pmb-dark-surface border border-pmb-gold/40 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/90 overflow-hidden my-auto max-h-[92vh] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-pmb-gold via-amber-300 to-pmb-gold" />

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pmb-gold/15 border border-pmb-gold/30 text-xl">
              📤
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-pmb-gold bg-pmb-gold/15 px-2 py-0.5 rounded-full">
                  Matchday {match.matchday} Result Submission
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <span>{match.homeClub.name}</span>
                <span className="text-gray-400 text-xs font-normal">vs</span>
                <span>{match.awayClub.name}</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Match Banner */}
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ClubBadge name={myClub.name} logo={myClub.logo} size="sm" />
              <div>
                <p className="text-xs font-black text-white">{myClub.name} (Your Club)</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Submitting Manager</p>
              </div>
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-pmb-gold">VS</span>

            <div className="flex items-center justify-end gap-2.5 text-right">
              <div>
                <p className="text-xs font-black text-white">{opponent.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Official Opponent</p>
              </div>
              <ClubBadge name={opponent.name} logo={opponent.logo} size="sm" />
            </div>
          </div>

          {/* ⚠️ STRICT ANTI-CHEAT FAIR PLAY WARNING */}
          <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-red-400 font-black tracking-wide uppercase text-[11px]">
              <span>🛡️</span>
              <span>Fair Play Anti-Cheat Engine Active</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Every uploaded screenshot is scanned by Google Gemini AI vision and checked for authenticity.
            </p>
            <ul className="text-[11px] text-red-300 space-y-1 list-disc list-inside font-medium pt-1">
              <li>
                <strong>Fake / Wrong Team Screen:</strong> If you upload a screen against a different club instead of <span className="underline">{opponent.name}</span> ➔ <strong className="text-white bg-red-900/60 px-1 py-0.2 rounded">-€10,000,000 fine</strong>!
              </li>
              <li>
                <strong>Reused / Duplicate Screens:</strong> Uploading old screens or reusing past goal/assist screens ➔ <strong className="text-white bg-red-900/60 px-1 py-0.2 rounded">-€10,000,000 fine</strong> per duplicate screen (up to <strong>-€20M</strong> total)!
              </li>
              <li>
                <strong>Goal & Assist Cards:</strong> You must upload the highlight cards for goals scored to verify scorers and assists.
              </li>
            </ul>
          </div>

          {/* 🚨 FRAUD CAUGHT BANNER */}
          {fraudResult && (
            <div className="p-4 rounded-2xl bg-red-900/80 border-2 border-red-500 text-white space-y-2 shadow-xl animate-bounce">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-red-200">
                  <span>🚨</span> FRAUD DETECTED BY AI REFEREE
                </h3>
                <span className="px-2.5 py-1 rounded-full bg-red-950 font-mono font-black text-sm text-red-300 border border-red-400">
                  PENALTY: -{fraudResult.penalty}
                </span>
              </div>
              <p className="text-xs text-red-100">
                A disciplinary fine of <strong>{fraudResult.penalty}</strong> has been immediately deducted from your club&apos;s budget.
              </p>
              <div className="p-2.5 rounded-xl bg-black/60 text-xs text-red-200 space-y-1 font-mono">
                {fraudResult.reasons.map((r, i) => (
                  <p key={i}>• {r}</p>
                ))}
              </div>
            </div>
          )}

          {/* ✓ CLEAN SUCCESS BANNER */}
          {successResult && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 space-y-2.5 text-center shadow-lg">
              <span className="text-3xl block">✓</span>
              <h3 className="text-sm font-black uppercase tracking-wide text-white">
                Match Screenshots Verified & Submitted!
              </h3>
              <p className="text-xs text-emerald-300">
                AI extracted score: <strong>{successResult.homeGoals} - {successResult.awayGoals}</strong> ({successResult.goals?.length || 0} goals).
              </p>
              {successResult.mvp && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold my-1 shadow">
                  <span>⭐ Match MVP:</span>
                  <span className="text-white font-black">{successResult.mvp.playerName}</span>
                  <span className="text-[11px] text-amber-400 font-mono">({successResult.mvp.rating})</span>
                </div>
              )}
              {Array.isArray(successResult.playerRatings) && successResult.playerRatings.length > 0 && (
                <p className="text-[11px] text-gray-300">
                  Extracted {successResult.playerRatings.length} player performance ratings.
                </p>
              )}
              <p className="text-[11px] text-gray-400">
                Submitted to League Administrator for final confirmation. Standings will update upon approval.
              </p>
            </div>
          )}

          {/* Upload Dropzone */}
          {!successResult && (
            <>
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
                  "relative border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5",
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

                <span className="text-3xl">📸</span>

                <div>
                  <p className="text-sm font-black text-white">
                    Drop eFootball screenshots here, or <span className="text-pmb-gold underline">browse files</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-pmb-gold">Ctrl + V</kbd> to paste directly!
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                    1× Full Time Stats Screen
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                    + Goal & Assist Highlight Screens
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    ⭐ Player Ratings: Home & Away (MVP ★)
                  </span>
                </div>
              </div>

              {/* Uploaded Thumbnails with Screen Type Toggle */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>Queued Screenshots ({images.length})</span>
                    <button
                      type="button"
                      onClick={() => setImages([])}
                      className="text-red-400 hover:text-red-300 text-[11px]"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className="relative rounded-xl overflow-hidden border border-white/15 bg-black/60 shadow-md flex flex-col"
                      >
                        <div className="relative aspect-video">
                          <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-2 bg-black/70 flex items-center justify-between gap-1 text-[10px]">
                          <select
                            value={img.type}
                            onChange={(e) =>
                              setImages((prev) =>
                                prev.map((item, i) =>
                                    i === idx ? { ...item, type: e.target.value as any } : item
                                )
                              )
                            }
                            className="pmb-input text-[10px] py-0.5 px-1.5 flex-1"
                          >
                            <option value="FULL_TIME">📊 Full Time Screen</option>
                            <option value="GOAL_HIGHLIGHT">⚽ Goal & Assist Card</option>
                            <option value="PLAYER_RATINGS">⭐ Player Ratings: Home / Away</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-gray-400 hover:text-pmb-gold transition underline cursor-pointer text-[11px]"
                >
                  {showKeyInput ? "▲ Hide Custom Gemini API Key" : "⚙️ Custom Gemini API Key (Optional)"}
                </button>
              </div>

              {showKeyInput && (
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="AIzaSy... (Leave blank to use server key)"
                    className="pmb-input text-xs w-full"
                  />
                  <p className="text-[10px] text-gray-500">
                    Stored safely in your browser localStorage.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            {successResult ? "Close" : "Cancel"}
          </button>

          {!successResult && (
            <button
              type="button"
              disabled={images.length === 0 || submitting}
              onClick={handleSubmit}
              className={[
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg",
                images.length === 0 || submitting
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-pmb-gold via-amber-400 to-pmb-gold text-pmb-black hover:opacity-95 shadow-amber-500/20",
              ].join(" ")}
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-pmb-black border-t-transparent" />
                  <span>Scanning & Verifying with AI…</span>
                </>
              ) : (
                <>
                  <span>⚡ Submit & Scan Result</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
