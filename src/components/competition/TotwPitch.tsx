"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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

export function TotwPitch({ seasonId, isAdmin = false, totalMatchdays }: Props) {
  const [matchday, setMatchday] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totw, setTotw] = useState<TotwData | null>(null);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminCandidates, setAdminCandidates] = useState<any[]>([]);
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
      if (res.ok && data.candidates) {
        setAdminCandidates(data.candidates);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Admin: auto-generate & publish TOTW
  async function handleAutoGenerate() {
    if (adminCandidates.length < 11) {
      setAdminMessage("Need at least 11 player candidates from completed matches.");
      return;
    }

    setAdminSaving(true);
    try {
      // Pick top performers by position
      const gks = adminCandidates.filter((c) => c.position === "GK");
      const defs = adminCandidates.filter((c) => ["CB", "LB", "RB"].includes(c.position));
      const mids = adminCandidates.filter((c) => ["DMF", "CMF", "AMF", "LMF", "RMF"].includes(c.position));
      const fwds = adminCandidates.filter((c) => ["CF", "SS", "LWF", "RWF"].includes(c.position));

      // Fallbacks if positional count is low
      const selectedGk = gks[0] || adminCandidates[0];
      const remaining1 = adminCandidates.filter((c) => c.playerId !== selectedGk.playerId);

      const selectedDefs = defs.slice(0, 4);
      while (selectedDefs.length < 4 && remaining1.length > 0) {
        const next = remaining1.find((c) => !selectedDefs.some((d) => d.playerId === c.playerId));
        if (next) selectedDefs.push(next);
        else break;
      }

      const selectedMids = mids.slice(0, 3);
      while (selectedMids.length < 3 && remaining1.length > 0) {
        const next = remaining1.find(
          (c) =>
            !selectedDefs.some((d) => d.playerId === c.playerId) &&
            !selectedMids.some((m) => m.playerId === c.playerId)
        );
        if (next) selectedMids.push(next);
        else break;
      }

      const selectedFwds = fwds.slice(0, 3);
      while (selectedFwds.length < 3 && remaining1.length > 0) {
        const next = remaining1.find(
          (c) =>
            !selectedDefs.some((d) => d.playerId === c.playerId) &&
            !selectedMids.some((m) => m.playerId === c.playerId) &&
            !selectedFwds.some((f) => f.playerId === c.playerId)
        );
        if (next) selectedFwds.push(next);
        else break;
      }

      const positions = [
        { key: "GK", player: selectedGk },
        { key: "LB", player: selectedDefs[0] || remaining1[0] },
        { key: "CB1", player: selectedDefs[1] || remaining1[1] },
        { key: "CB2", player: selectedDefs[2] || remaining1[2] },
        { key: "RB", player: selectedDefs[3] || remaining1[3] },
        { key: "DMF", player: selectedMids[0] || remaining1[4] },
        { key: "CMF", player: selectedMids[1] || remaining1[5] },
        { key: "AMF", player: selectedMids[2] || remaining1[6] },
        { key: "LWF", player: selectedFwds[0] || remaining1[7] },
        { key: "CF", player: selectedFwds[1] || remaining1[8] },
        { key: "RWF", player: selectedFwds[2] || remaining1[9] },
      ];

      const payloadPlayers = positions.map((pos) => ({
        playerId: pos.player.playerId,
        clubId: pos.player.clubId,
        position: pos.key,
        ratingBoost: 2,
        goalsInMatchday: pos.player.goals || 0,
        assistsInMatchday: pos.player.assists || 0,
        isMotm: pos.player.isMotm || false,
      }));

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

    const boostedOvr = (item.player.overallRating || 75) + (item.ratingBoost || 2);

    return (
      <div className="group relative flex flex-col items-center justify-between w-20 h-28 sm:w-24 sm:h-34 p-1.5 rounded-xl bg-gradient-to-b from-pmb-gold/30 via-pmb-dark-surface to-pmb-black border border-pmb-gold/70 shadow-lg shadow-pmb-gold/20 hover:scale-110 hover:z-20 transition-all duration-300">
        {/* Holographic animated sheen */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-pmb-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Top Header: OVR + Position */}
        <div className="flex items-center justify-between w-full px-0.5">
          <span className="text-[11px] sm:text-xs font-black text-pmb-gold tracking-tight">
            {boostedOvr}
          </span>
          <span className="text-[9px] font-bold text-gray-300 uppercase">
            {item.player.position || defaultLabel}
          </span>
        </div>

        {/* Player Avatar */}
        <div className="relative w-11 h-11 sm:w-13 sm:h-13 my-0.5">
          {item.player.photo ? (
            <Image
              src={item.player.photo}
              alt={item.player.fullName}
              fill
              className="object-cover rounded-full border border-pmb-gold/40"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-pmb-gold/20 flex items-center justify-center text-xs font-bold text-pmb-gold border border-pmb-gold/30">
              {item.player.fullName.charAt(0)}
            </div>
          )}

          {/* MOTM Star badge */}
          {item.isMotm && (
            <span
              className="absolute -top-1 -right-1 text-[10px] bg-pmb-black/80 rounded-full p-0.5 border border-pmb-gold"
              title="Man of the Match"
            >
              ⭐
            </span>
          )}
        </div>

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
              The system automatically selects the highest-scoring players based on goals, assists, clean sheets, and Man of the Match awards for Matchday {matchday}.
            </p>

            {adminCandidates.length > 0 ? (
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
                disabled={adminSaving || adminCandidates.length === 0}
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
