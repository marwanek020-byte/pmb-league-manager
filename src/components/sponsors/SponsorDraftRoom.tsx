"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { SponsorClass, SponsorDefinition, DraftTurnConfig } from "@/lib/constants/sponsors";

type SponsorWithStatus = SponsorDefinition & {
  isDrafted: boolean;
  draftedBy: { clubId: string; clubName: string; clubLogo: string | null } | null;
};

type DraftSessionResponse = {
  currentTurnIndex: number;
  isCompleted: boolean;
  currentTurnConfig: DraftTurnConfig | null;
  draftOrder: DraftTurnConfig[];
  sponsors: SponsorWithStatus[];
  userClubId: string | null;
  isAdmin: boolean;
};

export function SponsorDraftRoom() {
  const [data, setData] = useState<DraftSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | SponsorClass>("ALL");
  const [selectedSponsor, setSelectedSponsor] = useState<SponsorWithStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDraftState = async () => {
    try {
      const res = await fetch("/api/sponsors/draft", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load draft room");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load draft data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraftState();
    const interval = setInterval(fetchDraftState, 5000); // Live poll every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-pmb-gold border-t-transparent" />
          <p className="text-sm font-semibold text-gray-400">Entering Botola Pro Sponsor Draft Room...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
        <p className="font-semibold">{error}</p>
        <button
          onClick={fetchDraftState}
          className="mt-3 rounded-lg bg-red-500/20 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentTurn = data?.currentTurnConfig;
  const isCompleted = data?.isCompleted;

  // Determine current active team picks so far
  const activeClubPicks =
    currentTurn && data?.sponsors
      ? data.sponsors.filter(
          (s) =>
            s.draftedBy &&
            (s.draftedBy.clubName.toLowerCase().includes(currentTurn.clubName.toLowerCase()) ||
              currentTurn.clubName.toLowerCase().includes(s.draftedBy.clubName.toLowerCase()))
        )
      : [];

  const currentSlotNumber = activeClubPicks.length + 1;
  const currentSlotRule = currentTurn?.allowedPicks.find((p) => p.slotNumber === currentSlotNumber);

  // Check if current user is allowed to pick right now
  const isMyTurn =
    Boolean(
      currentTurn &&
        (data?.isAdmin ||
          (data?.userClubId &&
            data?.draftOrder[data.currentTurnIndex]?.clubName))
    );

  const filteredSponsors = (data?.sponsors || []).filter((s) => {
    if (activeTab === "ALL") return true;
    return s.sponsorClass === activeTab;
  });

  const handlePickSponsor = async (sponsor: SponsorWithStatus) => {
    if (!currentTurn) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Find matching club ID from draft order or fallback
      const matchingDrafted = data?.sponsors.find((s) => s.draftedBy?.clubName === currentTurn.clubName);
      const clubId = data?.userClubId || matchingDrafted?.draftedBy?.clubId || "";

      const res = await fetch("/api/sponsors/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsorId: sponsor.id,
          clubId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to make pick");

      setSuccessMsg(`🎉 ${currentTurn.clubName} successfully drafted ${sponsor.name}!`);
      setSelectedSponsor(null);
      await fetchDraftState();
    } catch (err: any) {
      setError(err.message || "Failed to submit draft pick");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetDraft = async () => {
    if (!confirm("Are you sure you want to reset the Sponsor Draft to Turn 0? All 30 sponsors will become available again.")) {
      return;
    }

    setResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sponsors/draft/reset", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset");
      setSuccessMsg("Draft successfully reset!");
      await fetchDraftState();
    } catch (err: any) {
      setError(err.message || "Failed to reset draft");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Turn Tracker ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-pmb-gold/30 bg-gradient-to-b from-[#14120c] via-[#0d0f14] to-[#0a0a0f] p-6 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-pmb-gold/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pmb-gold/40 bg-pmb-gold/10 px-3 py-1 text-xs font-bold text-pmb-gold">
                <span className="h-2 w-2 animate-pulse rounded-full bg-pmb-gold" />
                OFFICIAL SEASON 2 PARTNERSHIP DRAFT
              </span>
              {data?.isAdmin && (
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-400">
                  ADMIN OVERRIDE ACTIVE
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Botola Pro Live Sponsor Draft Room
            </h1>
            <p className="mt-1 text-xs text-gray-400 sm:text-sm">
              Strict order by Season 1 Final Standings. Payouts and match bonuses activate in Season 2.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDraftState}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
            >
              🔄 Refresh
            </button>
            {data?.isAdmin && (
              <button
                onClick={handleResetDraft}
                disabled={resetting}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
              >
                {resetting ? "Resetting..." : "🧹 Reset Draft"}
              </button>
            )}
          </div>
        </div>

        {/* Turn Status Alert */}
        <div className="mt-6">
          {isCompleted ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <span className="text-xl">🏆</span>
              <h3 className="mt-1 text-base font-bold text-emerald-400">
                The Season 2 Sponsor Draft is Completed!
              </h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                All 30 Moroccan sponsors have been drafted across the 15 Botola Pro clubs. Bonuses will credit automatically upon match completions!
              </p>
            </div>
          ) : currentTurn ? (
            <div className="rounded-xl border border-pmb-gold/40 bg-pmb-gold/10 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pmb-gold text-base font-black text-black shadow-lg shadow-pmb-gold/20">
                    #{currentTurn.position}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-pmb-gold">
                      CURRENT TURN ({data?.currentTurnIndex! + 1} of 15)
                    </div>
                    <div className="text-lg font-black text-white">
                      {currentTurn.clubName}
                    </div>
                    <div className="text-xs text-gray-300 mt-0.5">
                      Picking Sponsor <span className="font-bold text-pmb-gold">Slot {currentSlotNumber} of {currentTurn.allowedPicks.length}</span>
                      {currentSlotRule && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 text-[11px] text-gray-300">
                          Requires: <strong className="text-white">{currentSlotRule.requiredClass.join(" or ")}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-semibold text-gray-400">
                    Next in line:
                  </div>
                  <div className="text-xs font-bold text-white">
                    {data?.draftOrder[data.currentTurnIndex + 1]?.clubName || "Final Pick"}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            {successMsg}
          </div>
        )}
      </div>

      {/* ── Main Layout: Draft Board (Left) + Standings Ladder (Right) ──── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Sponsor Selection Board */}
        <div className="space-y-4 lg:col-span-3">
          {/* Class Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
            {[
              { id: "ALL", label: "All Sponsors (30)" },
              { id: "DIAMOND", label: "💎 Diamond (5)" },
              { id: "FIRST_CLASS", label: "🥇 First Class (10)" },
              { id: "SECOND_CLASS", label: "🥈 Second Class (10)" },
              { id: "THIRD_CLASS", label: "🥉 Third Class (5)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === tab.id
                    ? "bg-pmb-gold text-black shadow-md shadow-pmb-gold/20"
                    : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sponsors Cards Grid */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {filteredSponsors.map((sponsor) => {
              const isEligibleForCurrentSlot =
                !sponsor.isDrafted &&
                Boolean(currentSlotRule?.requiredClass.includes(sponsor.sponsorClass));

              return (
                <div
                  key={sponsor.id}
                  className={`relative flex flex-col justify-between rounded-xl border p-4 transition ${
                    sponsor.isDrafted
                      ? "border-white/5 bg-white/[0.01] opacity-50"
                      : isEligibleForCurrentSlot
                      ? "border-pmb-gold/40 bg-gradient-to-b from-pmb-gold/[0.04] to-black/40 hover:border-pmb-gold"
                      : "border-white/10 bg-black/30 opacity-75"
                  }`}
                >
                  <div>
                    {/* Header: Class Badge + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: `${sponsor.brandColor}22`,
                          color: sponsor.brandColor,
                          border: `1px solid ${sponsor.brandColor}44`,
                        }}
                      >
                        {sponsor.sponsorClass.replace("_", " ")}
                      </span>

                      {sponsor.isDrafted ? (
                        <span className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-gray-300">
                          🔒 DRAFTED by {sponsor.draftedBy?.clubName}
                        </span>
                      ) : isEligibleForCurrentSlot ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          AVAILABLE FOR SLOT {currentSlotNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500">
                          Available (Other Slot)
                        </span>
                      )}
                    </div>

                    {/* Sponsor Identity */}
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-white text-xs shadow-md"
                        style={{
                          backgroundColor: sponsor.brandColor,
                        }}
                      >
                        {sponsor.badgeInitials}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white leading-tight">
                          {sponsor.name}
                        </h4>
                        <p className="text-xs text-gray-400">{sponsor.sector}</p>
                      </div>
                    </div>

                    <p className="mt-2.5 text-xs text-gray-400 line-clamp-2">
                      {sponsor.description}
                    </p>

                    {/* Financial Terms */}
                    <div className="mt-3.5 space-y-1.5 rounded-lg border border-white/5 bg-black/40 p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Base Deal (Upfront):</span>
                        <span className="font-bold text-pmb-gold">
                          +€{(sponsor.baseValue / 1_000_000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Win Bonus (Per Match):</span>
                        <span className="font-bold text-emerald-400">
                          +€{(sponsor.winBonus / 1_000_000).toFixed(2)}M
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Draw Bonus (Per Match):</span>
                        <span className="font-bold text-blue-400">
                          +€{(sponsor.drawBonus / 1_000_000).toFixed(2)}M
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-2 border-t border-white/5">
                    {sponsor.isDrafted ? (
                      <button
                        disabled
                        className="w-full rounded-lg bg-white/5 py-2 text-xs font-bold text-gray-500 cursor-not-allowed"
                      >
                        Taken by {sponsor.draftedBy?.clubName}
                      </button>
                    ) : (
                      <button
                        disabled={submitting || isCompleted}
                        onClick={() => handlePickSponsor(sponsor)}
                        className={`w-full rounded-lg py-2 text-xs font-bold transition ${
                          isEligibleForCurrentSlot
                            ? "bg-pmb-gold text-black hover:bg-pmb-gold/90 shadow-md shadow-pmb-gold/20"
                            : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {submitting ? "Submitting..." : `Draft for ${currentTurn?.clubName || "Active Club"}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Standings Ladder & Draft Status */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#0e1017] p-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Official Turn Order</span>
              <span className="text-xs text-gray-400">15 Clubs</span>
            </h3>

            <div className="mt-3 space-y-2">
              {data?.draftOrder.map((step, idx) => {
                const isCurrent = idx === data.currentTurnIndex && !isCompleted;
                const isPast = idx < data.currentTurnIndex || isCompleted;

                // Find drafted sponsors for this club
                const clubDrafted = (data?.sponsors || []).filter(
                  (s) =>
                    s.draftedBy &&
                    (s.draftedBy.clubName.toLowerCase().includes(step.clubName.toLowerCase()) ||
                      step.clubName.toLowerCase().includes(s.draftedBy.clubName.toLowerCase()))
                );

                return (
                  <div
                    key={step.position}
                    className={`rounded-lg border p-2.5 transition ${
                      isCurrent
                        ? "border-pmb-gold bg-pmb-gold/10 shadow-md shadow-pmb-gold/10"
                        : isPast
                        ? "border-white/5 bg-white/[0.02]"
                        : "border-white/5 bg-black/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-bold text-[10px] ${
                            isCurrent
                              ? "bg-pmb-gold text-black"
                              : "bg-white/10 text-gray-400"
                          }`}
                        >
                          #{step.position}
                        </span>
                        <span className="font-bold text-white truncate max-w-[120px]">
                          {step.clubName}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {clubDrafted.length} / {step.allowedPicks.length} picks
                      </span>
                    </div>

                    {/* Badges for drafted sponsors */}
                    {clubDrafted.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {clubDrafted.map((s) => (
                          <span
                            key={s.id}
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                            style={{ backgroundColor: `${s.brandColor}66` }}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules Card */}
          <div className="rounded-xl border border-white/5 bg-black/30 p-4 text-xs text-gray-400 space-y-2">
            <h4 className="font-bold text-white text-xs">📜 Draft Rules</h4>
            <p>• <strong>Top 5 (1st–5th):</strong> Must pick 1 Diamond + 1 First Class + 1 Second Class.</p>
            <p>• <strong>Mid 5 (6th–10th):</strong> Pick 2 from remaining First/Second class.</p>
            <p>• <strong>Bottom 5 (11th–15th):</strong> Pick 1 from Third class.</p>
            <p className="text-amber-400 font-semibold">• 🚨 5 consecutive losses terminates the contract automatically!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
