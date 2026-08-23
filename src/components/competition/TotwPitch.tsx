"use client";

import { useState, useEffect } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type TotwPlayerItem = {
  id: string;
  position: string;
  ratingBoost: number;
  goalsInMatchday: number;
  assistsInMatchday: number;
  isMotm: boolean;
  player: {
    id: string;
    fullName: string;
    photo: string | null;
    position: string;
    overallRating: number | null;
  };
  club: {
    id: string;
    name: string;
    logo: string | null;
  };
};

type TotwData = {
  id: string;
  matchday: number;
  formation: string;
  players: TotwPlayerItem[];
};

type Props = {
  seasonId: string;
  isAdmin?: boolean;
  totalMatchdays: number;
};

function TotwPlayerAvatar({
  photo,
  fullName,
  isMotm,
}: {
  photo: string | null;
  fullName: string;
  isMotm: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "P"
    : "P";

  return (
    <div className="relative w-11 h-11 sm:w-13 sm:h-13 my-0.5 flex-shrink-0 flex items-center justify-center">
      {photo && !imgError ? (
        <img
          src={photo}
          alt=""
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full border-2 border-pmb-gold/50 shadow-inner"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-500/30 via-pmb-dark-surface to-black flex items-center justify-center text-xs font-black text-pmb-gold border border-pmb-gold/40 shadow-sm shadow-pmb-gold/20">
          {initials}
        </div>
      )}

      {/* MOTM Star badge */}
      {isMotm && (
        <span
          className="absolute -top-1 -right-1 text-[10px] bg-pmb-black/90 rounded-full p-0.5 border border-pmb-gold shadow-sm animate-pulse z-10"
          title="Man of the Match"
        >
          ⭐
        </span>
      )}
    </div>
  );
}

export function TotwPitch({ seasonId, isAdmin = false, totalMatchdays }: Props) {
  const [matchday, setMatchday] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totw, setTotw] = useState<TotwData | null>(null);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminCandidates, setAdminCandidates] = useState<any[]>([]);
  const [suggestedLineup, setSuggestedLineup] = useState<any[]>([]);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // Load TOTW for the selected matchday
  useEffect(() => {
    let cancelled = false;
    async function loadTotw() {
      setLoading(true);
      try {
        const res = await fetch(`/api/seasons/${seasonId}/totw?matchday=${matchday}`);
        const data = await res.json();
        if (!cancelled && res.ok) {
          setTotw(data.currentTotw || null);
          if (data.availableMatchdays && data.availableMatchdays.length > 0) {
            setAvailableDays(data.availableMatchdays);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTotw();
    return () => {
      cancelled = true;
    };
  }, [seasonId, matchday]);

  // Admin: load candidates for auto-generation
  async function openAdminModal() {
    setAdminModalOpen(true);
    setAdminMessage(null);
    try {
      const res = await fetch(`/api/admin/totw?seasonId=${seasonId}&matchday=${matchday}`);
      const data = await res.json();
      if (res.ok) {
        if (data.candidates) setAdminCandidates(data.candidates);
        if (data.suggestedLineup) setSuggestedLineup(data.suggestedLineup);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Admin: auto-generate & publish TOTW
  async function handleAutoGenerate() {
    if (adminCandidates.length === 0) {
      setAdminMessage("No candidates found for this matchday. Please record match results first.");
      return;
    }

    setAdminSaving(true);
    try {
      let payloadPlayers: any[] = [];

      // Use suggested lineup from backend if available (guaranteed 11 unique players)
      if (suggestedLineup.length === 11) {
        payloadPlayers = suggestedLineup.map((slot) => ({
          playerId: slot.player.playerId,
          clubId: slot.player.clubId,
          position: slot.key,
          ratingBoost: 2,
          goalsInMatchday: slot.player.goals || 0,
          assistsInMatchday: slot.player.assists || 0,
          isMotm: slot.player.isMotm || false,
        }));
      } else {
        // Fallback frontend deduplication
        const usedIds = new Set<string>();
        const pick = (candidates: any[]) => {
          for (const c of candidates) {
            if (!usedIds.has(c.playerId)) {
              usedIds.add(c.playerId);
              return c;
            }
          }
          return null;
        };

        const gks = adminCandidates.filter((c) => c.normalizedGroup === "GK" || c.position === "GK");
        const defs = adminCandidates.filter((c) => c.normalizedGroup === "DEF" || ["CB", "LB", "RB"].includes(c.position));
        const mids = adminCandidates.filter((c) => c.normalizedGroup === "MID" || ["DMF", "CMF", "AMF"].includes(c.position));
        const fwds = adminCandidates.filter((c) => c.normalizedGroup === "FWD" || ["CF", "SS", "LWF", "RWF"].includes(c.position));

        const slots = [
          { key: "GK", p: pick(gks) || pick(adminCandidates) },
          { key: "LB", p: pick(defs) || pick(mids) || pick(adminCandidates) },
          { key: "CB1", p: pick(defs) || pick(mids) || pick(adminCandidates) },
          { key: "CB2", p: pick(defs) || pick(mids) || pick(adminCandidates) },
          { key: "RB", p: pick(defs) || pick(mids) || pick(adminCandidates) },
          { key: "DMF", p: pick(mids) || pick(defs) || pick(adminCandidates) },
          { key: "CMF", p: pick(mids) || pick(adminCandidates) },
          { key: "AMF", p: pick(mids) || pick(fwds) || pick(adminCandidates) },
          { key: "LWF", p: pick(fwds) || pick(mids) || pick(adminCandidates) },
          { key: "CF", p: pick(fwds) || pick(adminCandidates) },
          { key: "RWF", p: pick(fwds) || pick(mids) || pick(adminCandidates) },
        ];

        payloadPlayers = slots.filter((s) => s.p !== null).map((s) => ({
          playerId: s.p.playerId,
          clubId: s.p.clubId,
          position: s.key,
          ratingBoost: 2,
          goalsInMatchday: s.p.goals || 0,
          assistsInMatchday: s.p.assists || 0,
          isMotm: s.p.isMotm || false,
        }));
      }

      if (payloadPlayers.length < 11) {
        setAdminMessage(`Need 11 unique players (only found ${payloadPlayers.length}).`);
        setAdminSaving(false);
        return;
      }

      const res = await fetch(`/api/admin/totw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId,
          matchday,
          formation: "4-3-3",
          players: payloadPlayers,
        }),
      });

      const data = await res.json();
      if (res.ok && data.totw) {
        setTotw(data.totw);
        setAdminMessage("✅ TOTW Published Successfully!");
        setTimeout(() => setAdminModalOpen(false), 1200);
      } else {
        setAdminMessage(data.error || "Failed to publish TOTW");
      }
    } catch (err) {
      console.error(err);
      setAdminMessage("Network error saving TOTW");
    } finally {
      setAdminSaving(false);
    }
  }

  // Map 11 players by tactical slot
  const playerSlots: Record<string, TotwPlayerItem | undefined> = {};
  if (totw?.players) {
    totw.players.forEach((p) => {
      playerSlots[p.position] = p;
    });
  }

  const renderCard = (slotKey: string, defaultLabel: string) => {
    const item = playerSlots[slotKey];
    if (!item) {
      return (
        <div className="flex flex-col items-center justify-center w-20 h-28 sm:w-24 sm:h-32 rounded-xl border border-dashed border-pmb-gold/30 bg-black/40 text-gray-500 text-[10px]">
          <span className="font-bold">{defaultLabel}</span>
          <span className="text-[9px] opacity-60">Vacant</span>
        </div>
      );
    }

    const boostedOvr = (item.player.overallRating || 76) + (item.ratingBoost || 2);

    return (
      <div className="group relative flex flex-col items-center justify-between w-20 h-28 sm:w-24 sm:h-34 p-1.5 rounded-xl bg-gradient-to-b from-pmb-gold/25 via-pmb-dark-surface to-pmb-black border border-pmb-gold/70 shadow-lg shadow-pmb-gold/20 hover:scale-110 hover:z-20 transition-all duration-300">
        {/* Holographic animated sheen */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-pmb-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Top Header: OVR + Tactical Slot */}
        <div className="flex items-center justify-between w-full px-0.5">
          <span className="text-[11px] sm:text-xs font-black text-pmb-gold tracking-tight">
            {boostedOvr}
          </span>
          <span className="text-[9px] font-black text-gray-200 bg-black/50 px-1 py-0.2 rounded border border-white/10 uppercase">
            {slotKey}
          </span>
        </div>

        {/* Player Avatar with graceful error fallback */}
        <TotwPlayerAvatar
          photo={item.player.photo}
          fullName={item.player.fullName}
          isMotm={item.isMotm}
        />

        {/* Player Name & Club */}
        <div className="w-full text-center">
          <p className="text-[10px] sm:text-[11px] font-bold text-white truncate max-w-full">
            {item.player.fullName.split(" ").pop()}
          </p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <ClubBadge name={item.club.name} logo={item.club.logo} size="xs" />
            <span className="text-[8px] text-gray-400 truncate max-w-[50px]">
              {item.club.name}
            </span>
          </div>
        </div>

        {/* Matchday Stats Pill */}
        {(item.goalsInMatchday > 0 || item.assistsInMatchday > 0) && (
          <div className="absolute -bottom-2 flex items-center gap-1 bg-pmb-black/90 border border-pmb-gold/60 px-1.5 py-0.5 rounded-full text-[8px] text-pmb-gold font-bold shadow-md">
            {item.goalsInMatchday > 0 && <span>⚽{item.goalsInMatchday}</span>}
            {item.assistsInMatchday > 0 && <span>👟{item.assistsInMatchday}</span>}
          </div>
        )}
      </div>
    );
  };

  const daysToDisplay = availableDays.length > 0
    ? availableDays
    : Array.from({ length: Math.min(totalMatchdays || 10, 10) }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header & Matchday Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-pmb-dark-surface/80 border border-pmb-gold/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <h2 className="text-xl font-bold text-white">
              Official PMB Team of the Week
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            The top 11 performing eFootball superstars with +2 OVR Holographic Boosts
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Matchday Picker */}
          <div className="flex items-center gap-1 bg-pmb-dark p-1 rounded-xl border border-pmb-border">
            <span className="text-[10px] font-bold text-gray-500 uppercase px-2">
              MD
            </span>
            <div className="flex gap-1 overflow-x-auto max-w-[200px]">
              {daysToDisplay.map((day) => (
                <button
                  key={day}
                  onClick={() => setMatchday(day)}
                  className={[
                    "h-7 w-7 rounded-lg text-xs font-bold transition",
                    day === matchday
                      ? "bg-pmb-gold text-pmb-black scale-105 shadow-md shadow-pmb-gold/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Publish / Edit button */}
          {isAdmin && (
            <button
              onClick={openAdminModal}
              className="text-xs font-bold px-3 py-2 bg-gradient-to-r from-pmb-gold to-yellow-500 text-pmb-black rounded-xl hover:brightness-110 shadow-md shadow-pmb-gold/20 transition flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Publish TOTW MD {matchday}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2D Stadium Tactical Pitch */}
      <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border-2 border-pmb-gold/40 shadow-2xl shadow-pmb-gold/10 bg-gradient-to-b from-emerald-950/90 via-emerald-900/80 to-emerald-950/90 p-4 sm:p-8 min-h-[580px] flex flex-col justify-between">
        {/* Pitch Lines / Markings */}
        <div className="absolute inset-4 rounded-2xl border-2 border-white/15 pointer-events-none" />
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/15 pointer-events-none -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border-2 border-white/15 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-20 border-b-2 border-x-2 border-white/15 rounded-b-xl pointer-events-none" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-20 border-t-2 border-x-2 border-white/15 rounded-t-xl pointer-events-none" />

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm font-bold text-pmb-gold animate-pulse">
            🌟 Scouting Matchday {matchday} Top Performers...
          </div>
        ) : !totw || totw.players.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <span className="text-4xl mb-2">⚽</span>
            <h3 className="text-lg font-bold text-white">
              No Official TOTW for Matchday {matchday}
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              The PMB Competition Board publishes the Team of the Week once all matchday fixtures conclude.
            </p>
            {isAdmin && (
              <button
                onClick={openAdminModal}
                className="mt-4 pmb-btn-primary text-xs px-4 py-2"
              >
                Auto-Generate TOTW from Match Results
              </button>
            )}
          </div>
        ) : (
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[520px] gap-6">
            {/* ROW 1: FORWARDS (LWF - CF - RWF) */}
            <div className="flex items-center justify-around w-full px-2 sm:px-8">
              {renderCard("LWF", "LWF")}
              {renderCard("CF", "CF")}
              {renderCard("RWF", "RWF")}
            </div>

            {/* ROW 2: MIDFIELDERS (DMF - CMF - AMF) */}
            <div className="flex items-center justify-around w-full px-4 sm:px-12">
              {renderCard("DMF", "DMF")}
              {renderCard("CMF", "CMF")}
              {renderCard("AMF", "AMF")}
            </div>

            {/* ROW 3: DEFENDERS (LB - CB1 - CB2 - RB) */}
            <div className="flex items-center justify-between w-full px-1 sm:px-4">
              {renderCard("LB", "LB")}
              {renderCard("CB1", "CB")}
              {renderCard("CB2", "CB")}
              {renderCard("RB", "RB")}
            </div>

            {/* ROW 4: GOALKEEPER (GK) */}
            <div className="flex items-center justify-center w-full">
              {renderCard("GK", "GK")}
            </div>
          </div>
        )}
      </div>

      {/* Admin Generation Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="pmb-card w-full max-w-xl p-6 border-pmb-gold space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🌟</span> Auto-Generate TOTW — Matchday {matchday}
              </h3>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              The system automatically selects the highest-scoring unique players across Goalkeepers, Defenders, Midfielders, and Forwards based on matchday performance.
            </p>

            {suggestedLineup.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-pmb-dark rounded-xl border border-pmb-border text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pmb-gold px-2">
                  Selected Starting 11 by Position ({suggestedLineup.length}/11)
                </span>
                {suggestedLineup.map((slot) => (
                  <div
                    key={slot.key}
                    className="flex items-center justify-between p-2 rounded-lg bg-pmb-dark-surface/60 border border-pmb-border/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-pmb-gold w-10 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-pmb-gold/30 text-center">
                        {slot.key}
                      </span>
                      <span className="font-semibold text-white">{slot.player.fullName}</span>
                      <span className="text-[10px] text-gray-400">({slot.player.position})</span>
                      <span className="text-[10px] text-gray-500">{slot.player.clubName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      {slot.player.goals > 0 && <span className="text-emerald-400">⚽ {slot.player.goals}</span>}
                      {slot.player.assists > 0 && <span className="text-sky-400">👟 {slot.player.assists}</span>}
                      {slot.player.cleanSheet && <span className="text-yellow-400">🧤 CS</span>}
                      {slot.player.isMotm && <span className="text-pmb-gold">⭐ MOTM</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : adminCandidates.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-pmb-dark rounded-xl border border-pmb-border text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pmb-gold px-2">
                  Top Matchday Candidates ({adminCandidates.length})
                </span>
                {adminCandidates.slice(0, 15).map((c, i) => (
                  <div
                    key={c.playerId}
                    className="flex items-center justify-between p-2 rounded-lg bg-pmb-dark-surface/60 border border-pmb-border/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-pmb-gold w-4">#{i + 1}</span>
                      <span className="font-semibold text-white">{c.fullName}</span>
                      <span className="text-[10px] text-gray-400">({c.position})</span>
                      <span className="text-[10px] text-gray-500">{c.clubName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      {c.goals > 0 && <span className="text-emerald-400">⚽ {c.goals}</span>}
                      {c.assists > 0 && <span className="text-sky-400">👟 {c.assists}</span>}
                      {c.cleanSheet && <span className="text-yellow-400">🧤 CS</span>}
                      {c.isMotm && <span className="text-pmb-gold">⭐ MOTM</span>}
                      <span className="text-gray-400">Pts: {Math.round(c.score)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500">
                No completed matches or match events found for Matchday {matchday}.
              </div>
            )}

            {adminMessage && (
              <div className="p-3 bg-pmb-gold/10 border border-pmb-gold/30 rounded-xl text-xs font-semibold text-pmb-gold text-center">
                {adminMessage}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAdminModalOpen(false)}
                className="pmb-btn-secondary text-xs px-4 py-2"
                disabled={adminSaving}
              >
                Close
              </button>
              <button
                onClick={handleAutoGenerate}
                disabled={adminSaving || (suggestedLineup.length === 0 && adminCandidates.length === 0)}
                className="pmb-btn-primary text-xs px-4 py-2 disabled:opacity-50"
              >
                {adminSaving ? "Publishing..." : "⚡ Generate & Publish TOTW"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
