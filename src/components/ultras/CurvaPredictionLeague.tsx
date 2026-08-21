"use client";

import { useEffect, useState } from "react";
import { PredictionLeagueRecord } from "@/lib/services/ultras-gamification-service";
import { MatchdayBriefing } from "@/lib/services/ultras-matchday-service";

export function CurvaPredictionLeague({
  clubName,
  matchdayBriefing,
}: {
  clubName: string;
  matchdayBriefing: MatchdayBriefing | null;
}) {
  const [homeGoals, setHomeGoals] = useState("2");
  const [awayGoals, setAwayGoals] = useState("1");
  const [firstScorer, setFirstScorer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [predictions, setPredictions] = useState<PredictionLeagueRecord[]>([]);

  useEffect(() => {
    fetch("/api/manager/ultras/predictions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPredictions(data);
      })
      .catch((err) => console.error(err));
  }, [clubName]);

  const handleSubmit = async () => {
    if (!matchdayBriefing?.fixture?.matchId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/manager/ultras/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: matchdayBriefing.fixture.matchId,
          homeGoals: Number(homeGoals),
          awayGoals: Number(awayGoals),
          firstScorer: firstScorer.trim() || matchdayBriefing.manToWatch?.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmittedSuccess(true);
        if (data.record) setPredictions((prev) => [data.record, ...prev]);
        setTimeout(() => setSubmittedSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Curva Gamification
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            🔮 Matchday Prediction League & XP Stakes
          </h3>
        </div>
      </div>

      {/* XP Rewards Table */}
      <div className="grid grid-cols-3 gap-3 relative z-10">
        <div className="rounded-xl border border-pmb-gold/30 bg-pmb-gold/10 p-3 text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-pmb-gold">🎯 Exact Score</span>
          <p className="text-base font-black text-white">+50 XP</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">⚽ 1st Scorer</span>
          <p className="text-base font-black text-white">+30 XP</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">🏆 Outcome</span>
          <p className="text-base font-black text-white">+15 XP</p>
        </div>
      </div>

      {/* Prediction Submission Form */}
      {matchdayBriefing && matchdayBriefing.hasUpcomingMatch ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md space-y-4 relative z-10">
          <p className="text-xs font-bold text-gray-400">
            Upcoming Match: <span className="text-white font-black">{matchdayBriefing.fixture.homeClubName} vs {matchdayBriefing.fixture.awayClubName}</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* Home Score */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-300">{matchdayBriefing.fixture.homeClubName}</span>
              <input
                type="number"
                min="0"
                max="9"
                value={homeGoals}
                onChange={(e) => setHomeGoals(e.target.value)}
                className="w-14 rounded-xl border border-white/20 bg-zinc-900 px-3 py-2 text-center text-lg font-black text-white focus:border-pmb-gold focus:outline-none"
              />
            </div>

            <span className="text-base font-black text-gray-500">-</span>

            {/* Away Score */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="9"
                value={awayGoals}
                onChange={(e) => setAwayGoals(e.target.value)}
                className="w-14 rounded-xl border border-white/20 bg-zinc-900 px-3 py-2 text-center text-lg font-black text-white focus:border-pmb-gold focus:outline-none"
              />
              <span className="text-xs font-bold text-gray-300">{matchdayBriefing.fixture.awayClubName}</span>
            </div>
          </div>

          {/* First goalscorer input */}
          <div>
            <label className="text-[11px] font-bold text-gray-400">Predicted First Goalscorer (Optional):</label>
            <input
              type="text"
              placeholder={`e.g. ${matchdayBriefing.manToWatch?.name || "Striker name"}`}
              value={firstScorer}
              onChange={(e) => setFirstScorer(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-zinc-900/90 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-pmb-gold focus:outline-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-pmb-gold py-3 text-xs font-black text-black hover:bg-amber-400 disabled:opacity-50 transition shadow-lg"
          >
            <span>{submitting ? "Submitting..." : submittedSuccess ? "✓ Prediction Locked (+15 XP Awarded!)" : "🚀 Lock Match Prediction (+15 XP Entry)"}</span>
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 font-semibold relative z-10">
          No upcoming match scheduled yet. Predictions open once fixture is announced!
        </p>
      )}

      {/* Recent Predictions History */}
      {predictions.length > 0 && (
        <div className="space-y-2 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            Recent Predictions
          </span>
          <div className="space-y-1.5">
            {predictions.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-950/80 p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-pmb-gold">{p.predictedHomeGoals} - {p.predictedAwayGoals}</span>
                  {p.predictedFirstScorer && <span className="text-gray-400">• Scorer: {p.predictedFirstScorer}</span>}
                </div>
                <span className="rounded bg-pmb-gold/20 px-2 py-0.5 text-[10px] font-black text-pmb-gold">
                  +{p.awardedXp} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
