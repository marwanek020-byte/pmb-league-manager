"use client";

import { useEffect, useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type Submission = {
  id: string;
  matchId: string;
  submittingClubId: string;
  submittedById: string;
  status: "PENDING_ADMIN_REVIEW" | "APPROVED" | "REJECTED_FRAUD" | "REJECTED_MANUAL";
  homeGoals: number;
  awayGoals: number;
  events?: any;
  stats?: any;
  aiFraudDetected: boolean;
  aiFraudReason?: string | null;
  penaltyApplied?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  submittingClub: { id: string; name: string; logo: string | null };
  screenshots: { id: string; imageHash: string; imageUrl?: string | null; screenType?: string | null }[];
};

type Props = {
  isOpen: boolean;
  matchId: string | null;
  onClose: () => void;
  onApproved: () => void;
};

export function AdminSubmissionReviewModal({
  isOpen,
  matchId,
  onClose,
  onApproved,
}: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Rejection options
  const [manualFine, setManualFine] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [selectedSubIndex, activeImageIndex]);

  useEffect(() => {
    if (!isOpen || !matchId) {
      setSubmissions([]);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/matches/${matchId}/submissions`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load submissions.");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setSubmissions(data.submissions || []);
          setSelectedSubIndex(0);
          setActiveImageIndex(0);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, matchId]);

  if (!isOpen || !matchId) return null;

  const currentSub = submissions[selectedSubIndex];

  async function handleAction(action: "APPROVE" | "REJECT") {
    if (!currentSub) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/matches/${matchId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: currentSub.id,
          action,
          manualFine: action === "REJECT" && manualFine > 0 ? manualFine : undefined,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed.");

      onApproved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to process submission.");
    } finally {
      setActionLoading(false);
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
        {/* Top Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-pmb-gold via-amber-300 to-pmb-gold" />

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pmb-gold/15 border border-pmb-gold/30 text-xl">
              🛡️
            </span>
            <div>
              <span className="text-[10px] font-black tracking-widest text-pmb-gold uppercase block">
                Manager Match Submission Review
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Admin Anti-Cheat Audit & Final Verification
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-pmb-gold border-t-transparent" />
              <p className="text-xs font-bold uppercase tracking-widest text-pmb-gold">
                Retrieving manager submissions & screenshots…
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          {!loading && submissions.length === 0 && !error && (
            <div className="py-16 text-center space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-bold text-gray-300">No Manager Submissions Yet</p>
              <p className="text-xs text-gray-500">
                The manager has not submitted match result screenshots for this fixture yet.
              </p>
            </div>
          )}

          {!loading && currentSub && (
            <div className="space-y-5">
              {/* Submission Selector if multiple */}
              {submissions.length > 1 && (
                <div className="space-y-2">
                  {new Set(submissions.map((s) => s.submittingClubId)).size >= 2 && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-pmb-gold/20 via-amber-500/15 to-pmb-gold/20 border border-pmb-gold/40 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">👥</span>
                        <div>
                          <span className="font-black text-pmb-gold uppercase tracking-wider block">
                            Dual-Manager Match Evidence Active
                          </span>
                          <p className="text-gray-300 text-[11px]">
                            Both clubs submitted screenshots for this fixture. Review each upload below. Approving will automatically merge all goals, assists, and player ratings from both clubs.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-pmb-gold text-pmb-black text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow">
                        {submissions.length} Uploads · 2 Clubs
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {submissions.map((sub, idx) => {
                      const isSelected = selectedSubIndex === idx;
                      const count = sub.screenshots?.length || 0;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setSelectedSubIndex(idx);
                            setActiveImageIndex(0);
                          }}
                          className={[
                            "px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 border",
                            isSelected
                              ? "bg-pmb-gold text-pmb-black border-amber-300 shadow-md shadow-pmb-gold/20 font-black"
                              : "bg-white/5 text-gray-300 hover:bg-white/15 border-white/10",
                          ].join(" ")}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: sub.aiFraudDetected
                                ? "#ef4444"
                                : sub.status === "APPROVED"
                                ? "#10b981"
                                : "#f59e0b",
                            }}
                          />
                          <span>{sub.submittingClub.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isSelected
                                ? "bg-black/20 text-black font-black"
                                : "bg-white/10 text-gray-400"
                            }`}
                          >
                            {count} {count === 1 ? "screen" : "screens"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submitting Club Meta Bar */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ClubBadge name={currentSub.submittingClub.name} logo={currentSub.submittingClub.logo} size="md" />
                  <div>
                    <h3 className="text-sm font-black text-white">{currentSub.submittingClub.name}</h3>
                    <p className="text-[10px] text-gray-400">
                      Submitted at {new Date(currentSub.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border",
                      currentSub.status === "APPROVED"
                        ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/50"
                        : currentSub.status === "REJECTED_FRAUD"
                        ? "bg-red-950/70 text-red-300 border-red-500/50"
                        : "bg-amber-950/70 text-amber-300 border-amber-500/50",
                    ].join(" ")}
                  >
                    {currentSub.status === "APPROVED"
                      ? "✓ Approved"
                      : currentSub.status === "REJECTED_FRAUD"
                      ? "🚨 Fraud Detected"
                      : "⏳ Pending Verification"}
                  </span>
                </div>
              </div>

              {/* 🛡️ AI ANTI-CHEAT REPORT BANNER */}
              {currentSub.aiFraudDetected ? (
                <div className="p-4 rounded-2xl bg-red-950/70 border-2 border-red-500 text-white space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                      <span>🚨</span> AI Anti-Cheat Fraud Alert
                    </span>
                    {currentSub.penaltyApplied && (
                      <span className="px-2 py-0.5 rounded bg-red-900 font-mono font-black text-xs text-red-200 border border-red-400">
                        PENALTY DEDUCTED: {Number(currentSub.penaltyApplied) < 0 ? `-€${Math.abs(Number(currentSub.penaltyApplied)) / 1_000_000}M` : currentSub.penaltyApplied}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-red-200 font-medium">
                    {currentSub.aiFraudReason || "Falsified screenshot detected."}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-sm">
                  <span className="flex items-center gap-2 font-bold">
                    <span>🛡️</span>
                    <span>AI Anti-Cheat Verified: Opponent matched & screenshots verified as authentic.</span>
                  </span>
                  <span className="text-[10px] font-black uppercase text-emerald-400 px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/30">
                    CLEAN
                  </span>
                </div>
              )}

              {/* Split Layout: Screenshots Viewer (Left) & Extracted Result (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Screenshots Inspector (5 cols) */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-pmb-gold">
                    <span>Uploaded Game Screens ({currentSub.screenshots.length})</span>
                    <span className="text-[10px] text-gray-400 font-normal">Inspect full resolution</span>
                  </div>

                  {(() => {
                    const currentImg = currentSub.screenshots[activeImageIndex];
                    const isLegacyTruncated = Boolean(
                      currentImg?.imageUrl &&
                      currentImg.imageUrl.startsWith("data:") &&
                      currentImg.imageUrl.length < 1500
                    );
                    const isRenderable = Boolean(currentImg?.imageUrl && !isLegacyTruncated && !imageError);

                    if (isRenderable) {
                      return (
                        <div className="relative group rounded-xl overflow-hidden border border-white/20 bg-black/80 aspect-video flex items-center justify-center shadow-lg">
                          <img
                            src={currentImg.imageUrl!}
                            alt="Match Screenshot"
                            className="max-h-full max-w-full object-contain cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02]"
                            onClick={() => setLightboxOpen(true)}
                            onError={() => setImageError(true)}
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxOpen(true)}
                            className="absolute bottom-2 right-2 bg-black/80 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow transition cursor-pointer"
                          >
                            <span>🔍</span> Full Resolution
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 aspect-video flex flex-col items-center justify-center p-6 text-center shadow-lg space-y-2">
                        <span className="text-3xl">⚠️</span>
                        <p className="text-xs font-bold text-amber-300">Screenshot Preview Unavailable</p>
                        <p className="text-[11px] text-gray-300 max-w-xs leading-relaxed">
                          This test submission was saved with truncated image data prior to the fix.
                        </p>
                        <p className="text-[10px] text-emerald-400 font-semibold">
                          ✓ The fix is now active. All newly submitted match screenshots will display here in high resolution.
                        </p>
                        <div className="pt-2 text-[10px] font-mono text-gray-400 truncate max-w-[280px]">
                          Fingerprint Hash: {currentImg?.imageHash || "N/A"}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Thumbnail Selector */}
                  {currentSub.screenshots.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {currentSub.screenshots.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={[
                            "px-2 py-1 rounded-md text-[10px] font-bold border transition shrink-0 cursor-pointer",
                            activeImageIndex === idx
                              ? "border-pmb-gold bg-pmb-gold/20 text-white"
                              : "border-white/10 bg-black/40 text-gray-400",
                          ].join(" ")}
                        >
                          Screen #{idx + 1} ({s.screenType || "SCREEN"})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Extracted Scores & Goals (6 cols) */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Score Pill */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-around shadow-inner text-center">
                    <div>
                      <span className="text-2xl sm:text-3xl font-black text-white">{currentSub.homeGoals}</span>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block mt-1">Home</span>
                    </div>
                    <span className="text-gray-500 font-bold text-lg">—</span>
                    <div>
                      <span className="text-2xl sm:text-3xl font-black text-white">{currentSub.awayGoals}</span>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block mt-1">Away</span>
                    </div>
                  </div>

                  {/* Goals List */}
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-pmb-gold block">
                      Extracted Goals & Highlights ({Array.isArray(currentSub.events) ? currentSub.events.length : 0})
                    </span>

                    {Array.isArray(currentSub.events) && currentSub.events.length > 0 ? (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {currentSub.events.map((ev: any, i: number) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-sm shrink-0">⚽</span>
                              <span className="font-bold text-white truncate">{ev.playerName || "Scorer"}</span>
                              {ev.assistPlayerName && (
                                <span className="text-[10px] text-gray-400 truncate">
                                  (👟 {ev.assistPlayerName})
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-pmb-gold shrink-0">
                              {ev.minute != null ? `${ev.minute}'` : "--'"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No individual goal highlight cards recorded.</p>
                    )}
                  </div>

                  {/* ⭐ MVP / Man of the Match Card */}
                  {(currentSub.stats as any)?.mvp && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-black/80 to-black/60 border border-amber-500/50 shadow-lg flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl shrink-0">⭐</span>
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-wider text-pmb-gold block">
                            Official Match MVP · Player of the Match
                          </span>
                          <span className="text-xs font-black text-white truncate block">
                            {(currentSub.stats as any).mvp.playerName}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-pmb-gold text-pmb-black font-mono font-black text-xs shrink-0 shadow">
                        ★ {(currentSub.stats as any).mvp.rating}
                      </span>
                    </div>
                  )}

                  {/* ⭐ Extracted Player Performance Ratings */}
                  {Array.isArray((currentSub.stats as any)?.playerRatings) && (currentSub.stats as any).playerRatings.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-pmb-gold block">
                          Player Ratings ({(currentSub.stats as any).playerRatings.length})
                        </span>
                        <span className="text-[10px] text-gray-400">eFootball Rating</span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {(currentSub.stats as any).playerRatings.map((pr: any, i: number) => (
                          <div
                            key={i}
                            className={[
                              "p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition",
                              pr.isMvp
                                ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
                                : "bg-white/5 border-white/10 text-gray-300",
                            ].join(" ")}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                                {pr.position || "PLY"}
                              </span>
                              <span className="font-bold text-white truncate">
                                {pr.playerName}
                              </span>
                              {pr.isMvp && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                  ★ MVP
                                </span>
                              )}
                            </div>
                            <span
                              className={[
                                "text-xs font-mono font-black px-2 py-0.5 rounded shrink-0",
                                pr.rating >= 8.0
                                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                                  : pr.rating >= 7.0
                                  ? "bg-blue-950/80 text-blue-300 border border-blue-500/30"
                                  : "bg-white/10 text-gray-300",
                              ].join(" ")}
                            >
                              {pr.rating}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejection Fine Box (Collapsible) */}
                  {showRejectBox && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 space-y-2.5 text-xs">
                      <span className="font-bold text-red-300 block">Disciplinary Rejection Details</span>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                          Additional Disciplinary Fine:
                        </label>
                        <select
                          value={manualFine}
                          onChange={(e) => setManualFine(parseInt(e.target.value, 10))}
                          className="pmb-input text-xs w-full py-1"
                        >
                          <option value={0}>No Fine (Reject without penalty)</option>
                          <option value={10000000}>-€10,000,000 (€10M Penalty)</option>
                          <option value={20000000}>-€20,000,000 (€20M Penalty)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                          Notes / Reason:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Screenshot manipulated or blurry"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          className="pmb-input text-xs w-full py-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            Close
          </button>

          {currentSub && currentSub.status === "PENDING_ADMIN_REVIEW" && (
            <div className="flex items-center gap-2">
              {!showRejectBox ? (
                <button
                  type="button"
                  onClick={() => setShowRejectBox(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-950 text-red-300 border border-red-500/40 hover:bg-red-900 transition cursor-pointer"
                >
                  Reject Options…
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction("REJECT")}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition cursor-pointer"
                >
                  {actionLoading ? "Rejecting…" : "Confirm Rejection"}
                </button>
              )}

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction("APPROVE")}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/30 transition cursor-pointer flex items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Applying Result…</span>
                  </>
                ) : (
                  <>
                    <span>
                      ✓ Approve & Apply Result
                      {submissions.length > 1 ? ` (${submissions.length} Submissions Merged)` : ""}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && currentSub?.screenshots[activeImageIndex]?.imageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="w-full max-w-6xl flex items-center justify-between p-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-pmb-gold">
                Screen #{activeImageIndex + 1} ({currentSub.screenshots[activeImageIndex].screenType || "SCREEN"})
              </span>
              <span className="text-xs text-gray-400">· {currentSub.submittingClub.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-base font-bold transition cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 max-w-6xl w-full flex items-center justify-center p-2 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={currentSub.screenshots[activeImageIndex].imageUrl!}
              alt="Full Resolution Screenshot"
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
