"use client";

import { useState, useEffect } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type GlobalTotwPlayerItem = {
  id: string;
  position: string;
  ratingBoost: number;
  goalsInMatchday: number;
  assistsInMatchday: number;
  isMotm: boolean;
  podiumRank: number | null;
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
  league: {
    id: string;
    name: string;
    logo: string | null;
    country?: string;
  } | null;
};

type GlobalTotwData = {
  id: string;
  edition: number;
  title: string;
  formation: string;
  leagueRounds: { leagueId: string; leagueName?: string; matchday: number }[];
  firstPlacePlayerId: string | null;
  secondPlacePlayerId: string | null;
  thirdPlacePlayerId: string | null;
  players: GlobalTotwPlayerItem[];
};

type Props = {
  isAdmin?: boolean;
};

function GlobalPlayerAvatar({
  photo,
  fullName,
  podiumRank,
  isMotm,
}: {
  photo: string | null;
  fullName: string;
  podiumRank: number | null;
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
          className={[
            "w-full h-full object-cover rounded-full border-2 shadow-inner",
            podiumRank === 1
              ? "border-yellow-400 ring-2 ring-yellow-400/40 shadow-yellow-400/50"
              : podiumRank === 2
              ? "border-slate-300 ring-2 ring-slate-300/40 shadow-slate-300/50"
              : podiumRank === 3
              ? "border-amber-600 ring-2 ring-amber-600/40 shadow-amber-600/50"
              : "border-pmb-gold/50",
          ].join(" ")}
        />
      ) : (
        <div
          className={[
            "w-full h-full rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-black shadow-sm",
            podiumRank === 1
              ? "from-amber-400/40 via-yellow-600/30 to-black text-yellow-300 border border-yellow-400"
              : podiumRank === 2
              ? "from-slate-400/40 via-gray-600/30 to-black text-gray-200 border border-slate-300"
              : podiumRank === 3
              ? "from-amber-700/40 via-amber-900/30 to-black text-amber-300 border border-amber-600"
              : "from-amber-500/30 via-pmb-dark-surface to-black text-pmb-gold border border-pmb-gold/40",
          ].join(" ")}
        >
          {initials}
        </div>
      )}

      {/* Podium or MOTM Badges */}
      {podiumRank === 1 ? (
        <span
          className="absolute -top-2 -right-1 text-[13px] filter drop-shadow-md z-10 animate-bounce"
          title="1st Place Global MVP — €3,000,000 Prize"
        >
          👑
        </span>
      ) : podiumRank === 2 ? (
        <span
          className="absolute -top-2 -right-1 text-[12px] filter drop-shadow-md z-10"
          title="2nd Place Global Star — €1,750,000 Prize"
        >
          🥈
        </span>
      ) : podiumRank === 3 ? (
        <span
          className="absolute -top-2 -right-1 text-[12px] filter drop-shadow-md z-10"
          title="3rd Place Global Star — €1,500,000 Prize"
        >
          🥉
        </span>
      ) : isMotm ? (
        <span
          className="absolute -top-1 -right-1 text-[10px] bg-pmb-black/90 rounded-full p-0.5 border border-pmb-gold shadow-sm animate-pulse z-10"
          title="Man of the Match"
        >
          ⭐
        </span>
      ) : null}
    </div>
  );
}

export function GlobalTotwPitch({ isAdmin = false }: Props) {
  const [selectedEdition, setSelectedEdition] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [globalTotw, setGlobalTotw] = useState<GlobalTotwData | null>(null);
  const [availableEditions, setAvailableEditions] = useState<number[]>([]);

  // Admin modal state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEdition, setAdminEdition] = useState(1);
  const [detectedRounds, setDetectedRounds] = useState<any[]>([]);
  const [customRounds, setCustomRounds] = useState<Record<string, number | null>>({});
  const [adminCandidates, setAdminCandidates] = useState<any[]>([]);
  const [suggestedLineup, setSuggestedLineup] = useState<any[]>([]);
  const [adminPodium, setAdminPodium] = useState<any>({});
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // 1. Load published Global TOTW
  useEffect(() => {
    let cancelled = false;
    async function loadGlobalTotw() {
      setLoading(true);
      try {
        const res = await fetch(`/api/global-totw?edition=${selectedEdition}`);
        const data = await res.json();
        if (!cancelled && res.ok) {
          setGlobalTotw(data.currentGlobalTotw || null);
          if (data.availableEditions && data.availableEditions.length > 0) {
            setAvailableEditions(data.availableEditions);
            if (!data.availableEditions.includes(selectedEdition)) {
              setSelectedEdition(data.availableEditions[0]);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadGlobalTotw();
    return () => {
      cancelled = true;
    };
  }, [selectedEdition]);

  // 2. Open Admin Studio
  async function openAdminModal() {
    setAdminModalOpen(true);
    setAdminMessage(null);
    try {
      const res = await fetch(`/api/admin/global-totw?edition=${selectedEdition}`);
      const data = await res.json();
      if (res.ok) {
        setAdminEdition(data.activeEdition || selectedEdition || 1);
        if (data.detectedLeagueRounds) {
          setDetectedRounds(data.detectedLeagueRounds);
          const initialMap: Record<string, number | null> = {};
          data.detectedLeagueRounds.forEach((lr: any) => {
            initialMap[lr.leagueId] = lr.latestCompletedMatchday;
          });
          setCustomRounds(initialMap);
        }
        if (data.candidates) setAdminCandidates(data.candidates);
        if (data.suggestedLineup) setSuggestedLineup(data.suggestedLineup);
        if (data.podium) setAdminPodium(data.podium);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 3. Recalculate candidates when admin changes league rounds
  async function handleRecalculate() {
    setAdminSaving(true);
    setAdminMessage(null);
    try {
      const roundsPayload = Object.entries(customRounds)
        .filter(([_, md]) => md !== null && md > 0)
        .map(([leagueId, matchday]) => ({ leagueId, matchday: Number(matchday) }));

      const res = await fetch(
        `/api/admin/global-totw?edition=${adminEdition}&rounds=${encodeURIComponent(JSON.stringify(roundsPayload))}`
      );
      const data = await res.json();
      if (res.ok) {
        setAdminCandidates(data.candidates || []);
        setSuggestedLineup(data.suggestedLineup || []);
        setAdminPodium(data.podium || {});
        setAdminMessage(`✅ Analyzed ${data.candidates?.length || 0} global candidates from ${roundsPayload.length} leagues!`);
      }
    } catch (err) {
      console.error(err);
      setAdminMessage("Failed to recalculate candidates");
    } finally {
      setAdminSaving(false);
    }
  }

  // 4. Publish Global TOTW
  async function handlePublish() {
    if (suggestedLineup.length < 11) {
      setAdminMessage(`Need 11 unique players (only found ${suggestedLineup.length}). Please adjust included league rounds.`);
      return;
    }

    setAdminSaving(true);
    try {
      const roundsPayload = Object.entries(customRounds)
        .filter(([_, md]) => md !== null && md > 0)
        .map(([leagueId, matchday]) => {
          const lInfo = detectedRounds.find((d) => d.leagueId === leagueId);
          return {
            leagueId,
            leagueName: lInfo?.leagueName || "League",
            matchday: Number(matchday),
          };
        });

      const payloadPlayers = suggestedLineup.map((slot) => ({
        playerId: slot.player.playerId,
        clubId: slot.player.clubId,
        leagueId: slot.player.leagueId,
        position: slot.key,
        ratingBoost: 3,
        goalsInMatchday: slot.player.goals || 0,
        assistsInMatchday: slot.player.assists || 0,
        isMotm: slot.player.isMotm || false,
        podiumRank: slot.podiumRank || null,
      }));

      const res = await fetch(`/api/admin/global-totw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edition: adminEdition,
          title: `Global All-Stars Edition #${adminEdition}`,
          formation: "4-3-3",
          leagueRounds: roundsPayload,
          players: payloadPlayers,
        }),
      });

      const data = await res.json();
      if (res.ok && data.globalTotw) {
        setGlobalTotw(data.globalTotw);
        setSelectedEdition(adminEdition);
        setAdminMessage("✅ Global TOTW Published & World Prizes Distributed (1M€ + Podium Bonuses)!");
        setTimeout(() => setAdminModalOpen(false), 1400);
      } else {
        setAdminMessage(data.error || "Failed to publish Global TOTW");
      }
    } catch (err) {
      console.error(err);
      setAdminMessage("Network error saving Global TOTW");
    } finally {
      setAdminSaving(false);
    }
  }

  // Tactical slot mapping
  const playerSlots: Record<string, GlobalTotwPlayerItem | undefined> = {};
  if (globalTotw?.players) {
    globalTotw.players.forEach((p) => {
      playerSlots[p.position] = p;
    });
  }

  const renderCard = (slotKey: string, defaultLabel: string) => {
    const item = playerSlots[slotKey];
    if (!item) {
      return (
        <div className="flex flex-col items-center justify-center w-20 h-28 sm:w-24 sm:h-32 rounded-xl border border-dashed border-cyan-500/30 bg-black/40 text-gray-500 text-[10px]">
          <span className="font-bold">{defaultLabel}</span>
          <span className="text-[9px] opacity-60">Vacant</span>
        </div>
      );
    }

    const boostedOvr = (item.player.overallRating || 76) + (item.ratingBoost || 3);
    const podiumRank = item.podiumRank;

    return (
      <div
        className={[
          "group relative flex flex-col items-center justify-between w-20 h-28 sm:w-24 sm:h-34 p-1.5 rounded-xl bg-gradient-to-b transition-all duration-300 hover:scale-110 hover:z-20",
          podiumRank === 1
            ? "from-yellow-400/40 via-cyan-950 to-pmb-black border-2 border-yellow-400 shadow-xl shadow-yellow-400/30"
            : podiumRank === 2
            ? "from-slate-300/40 via-cyan-950 to-pmb-black border-2 border-slate-300 shadow-xl shadow-slate-300/30"
            : podiumRank === 3
            ? "from-amber-600/40 via-cyan-950 to-pmb-black border-2 border-amber-600 shadow-xl shadow-amber-600/30"
            : "from-cyan-500/25 via-pmb-dark-surface to-pmb-black border border-cyan-500/60 shadow-lg shadow-cyan-500/20",
        ].join(" ")}
      >
        {/* Holographic animated sheen */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Top Header: OVR + Tactical Slot */}
        <div className="flex items-center justify-between w-full px-0.5">
          <span
            className={[
              "text-[11px] sm:text-xs font-black tracking-tight",
              podiumRank === 1
                ? "text-yellow-400"
                : podiumRank === 2
                ? "text-slate-200"
                : podiumRank === 3
                ? "text-amber-400"
                : "text-cyan-300",
            ].join(" ")}
          >
            {boostedOvr}
          </span>
          <span className="text-[9px] font-black text-gray-200 bg-black/60 px-1 py-0.2 rounded border border-white/10 uppercase">
            {slotKey}
          </span>
        </div>

        {/* Player Avatar */}
        <GlobalPlayerAvatar
          photo={item.player.photo}
          fullName={item.player.fullName}
          podiumRank={podiumRank}
          isMotm={item.isMotm}
        />

        {/* Player Name, Club & League */}
        <div className="w-full text-center">
          <p className="text-[10px] sm:text-[11px] font-bold text-white truncate max-w-full">
            {item.player.fullName.split(" ").pop()}
          </p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <ClubBadge name={item.club.name} logo={item.club.logo} size="xs" />
            <span className="text-[7.5px] text-gray-400 truncate max-w-[45px]">
              {item.club.name}
            </span>
            {item.league && (
              <span className="text-[7px] text-cyan-400 bg-cyan-950/60 px-1 rounded border border-cyan-500/30 truncate max-w-[35px]">
                {item.league.name.split(" ")[0]}
              </span>
            )}
          </div>
        </div>

        {/* Matchday Stats & Podium Prize Pill */}
        <div className="absolute -bottom-2 flex items-center gap-1">
          {podiumRank === 1 ? (
            <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded-full text-[7.5px] font-black shadow-md border border-yellow-200">
              👑 1st MVP +3M€
            </span>
          ) : podiumRank === 2 ? (
            <span className="bg-slate-200 text-black px-1.5 py-0.5 rounded-full text-[7.5px] font-black shadow-md border border-white">
              🥈 2nd +1.75M€
            </span>
          ) : podiumRank === 3 ? (
            <span className="bg-amber-600 text-white px-1.5 py-0.5 rounded-full text-[7.5px] font-black shadow-md border border-amber-400">
              🥉 3rd +1.5M€
            </span>
          ) : (item.goalsInMatchday > 0 || item.assistsInMatchday > 0) ? (
            <div className="flex items-center gap-1 bg-pmb-black/95 border border-cyan-500/70 px-1.5 py-0.5 rounded-full text-[8px] text-cyan-300 font-bold shadow-md">
              {item.goalsInMatchday > 0 && <span>⚽{item.goalsInMatchday}</span>}
              {item.assistsInMatchday > 0 && <span>👟{item.assistsInMatchday}</span>}
              <span className="text-emerald-400 text-[7px] font-extrabold">+1M€</span>
            </div>
          ) : (
            <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full text-[7.5px] font-bold shadow">
              +1M €
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Edition Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-pmb-dark-surface to-purple-950/30 border border-cyan-500/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌍</span>
            <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pmb-gold to-yellow-300">
              Official PMB Global Team of the Week
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 mt-1">
            <span>The 11 Best Players in the World (+3 OVR Boost)</span>
            <span className="text-gray-600">•</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
              💰 +€1,000,000 per Player
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold text-[10px]">
              👑 1st MVP: +€3M
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-300/10 border border-slate-300/30 text-slate-200 font-bold text-[10px]">
              🥈 2nd: +€1.75M
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-600/10 border border-amber-600/30 text-amber-400 font-bold text-[10px]">
              🥉 3rd: +€1.5M
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
              🛡️ Max 3 / League
            </span>
          </div>

          {/* Included League Rounds Pills */}
          {globalTotw?.leagueRounds && globalTotw.leagueRounds.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-gray-400 font-semibold">Included Rounds:</span>
              {globalTotw.leagueRounds.map((lr) => (
                <span
                  key={lr.leagueId}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-black/50 border border-cyan-500/40 text-cyan-200"
                >
                  {lr.leagueName || "League"} (MD {lr.matchday})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Edition Picker */}
          <div className="flex items-center gap-1 bg-pmb-dark p-1 rounded-xl border border-cyan-500/30">
            <span className="text-[10px] font-bold text-gray-400 uppercase px-2">
              Edition
            </span>
            <div className="flex gap-1 overflow-x-auto max-w-[200px]">
              {(availableEditions.length > 0 ? availableEditions : [1]).map((ed) => (
                <button
                  key={ed}
                  onClick={() => setSelectedEdition(ed)}
                  className={[
                    "h-7 px-2.5 rounded-lg text-xs font-bold transition",
                    ed === selectedEdition
                      ? "bg-cyan-500 text-black scale-105 shadow-md shadow-cyan-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  #{ed}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Studio button */}
          {isAdmin && (
            <button
              onClick={openAdminModal}
              className="text-xs font-bold px-3 py-2 bg-gradient-to-r from-cyan-400 via-pmb-gold to-yellow-400 text-black rounded-xl hover:brightness-110 shadow-md shadow-cyan-500/20 transition flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Global Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* 2D Stadium Tactical Pitch (Global Aurora Theme) */}
      <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/10 bg-gradient-to-b from-slate-950 via-cyan-950/70 to-slate-950 p-4 sm:p-8 min-h-[580px] flex flex-col justify-between">
        {/* Pitch Lines / Markings */}
        <div className="absolute inset-4 rounded-2xl border-2 border-cyan-400/20 pointer-events-none" />
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-cyan-400/20 pointer-events-none -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border-2 border-cyan-400/20 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-20 border-b-2 border-x-2 border-cyan-400/20 rounded-b-xl pointer-events-none" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-20 border-t-2 border-x-2 border-cyan-400/20 rounded-t-xl pointer-events-none" />

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm font-bold text-cyan-300 animate-pulse">
            🌍 Scouting the World's Best Performers for Edition #{selectedEdition}...
          </div>
        ) : !globalTotw || globalTotw.players.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <span className="text-4xl mb-2">🌍</span>
            <h3 className="text-lg font-bold text-white">
              No Global TOTW Published for Edition #{selectedEdition}
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              The PMB Competition Board unites the top 11 performing superstars across all active leagues once matchdays conclude.
            </p>
            {isAdmin && (
              <button
                onClick={openAdminModal}
                className="mt-4 text-xs font-bold px-4 py-2 bg-cyan-500 text-black rounded-xl hover:brightness-110 transition shadow-lg shadow-cyan-500/20"
              >
                Auto-Generate Global TOTW
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

      {/* Admin Studio Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="pmb-card w-full max-w-2xl p-6 border-cyan-500 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>🌍</span> Global TOTW Studio — Edition #{adminEdition}
              </h3>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Prize Matrix Pill */}
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-pmb-dark border border-cyan-500/30 text-[11px]">
              <div className="text-center">
                <span className="text-gray-400 block text-[9px] uppercase font-bold">11 Players</span>
                <span className="text-emerald-400 font-extrabold">+€1,000,000</span>
              </div>
              <div className="text-center border-l border-pmb-border">
                <span className="text-gray-400 block text-[9px] uppercase font-bold">🥇 1st MVP</span>
                <span className="text-yellow-400 font-extrabold">+€3,000,000</span>
              </div>
              <div className="text-center border-l border-pmb-border">
                <span className="text-gray-400 block text-[9px] uppercase font-bold">🥈 2nd Star</span>
                <span className="text-slate-200 font-extrabold">+€1,750,000</span>
              </div>
              <div className="text-center border-l border-pmb-border">
                <span className="text-gray-400 block text-[9px] uppercase font-bold">🥉 3rd Star</span>
                <span className="text-amber-400 font-extrabold">+€1,500,000</span>
              </div>
            </div>

            {/* Multi-League Round Selector Matrix */}
            <div className="space-y-2 p-3 bg-pmb-dark/80 rounded-xl border border-pmb-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Select Included Matchday Per League (Max 3 Players / League)
                </span>
                <button
                  onClick={handleRecalculate}
                  disabled={adminSaving}
                  className="text-[11px] font-bold px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 transition flex items-center gap-1"
                >
                  <span>🔄</span> Recalculate
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {detectedRounds.map((league) => {
                  const currentVal = customRounds[league.leagueId];
                  return (
                    <div
                      key={league.leagueId}
                      className="flex items-center justify-between p-2 rounded-lg bg-pmb-dark-surface/60 border border-pmb-border/40"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-white truncate max-w-[120px]">
                          {league.leagueName}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          ({league.totalCompletedMatches} matches)
                        </span>
                      </div>

                      <select
                        value={currentVal === null ? "" : currentVal}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          setCustomRounds((prev) => ({ ...prev, [league.leagueId]: val }));
                        }}
                        className="text-xs bg-black/60 border border-cyan-500/40 rounded-lg px-2 py-1 text-cyan-200 font-bold focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">🚫 Exclude</option>
                        {Array.from({ length: 15 }, (_, i) => i + 1).map((roundNum) => (
                          <option key={roundNum} value={roundNum}>
                            Round {roundNum} {roundNum === league.latestCompletedMatchday ? "⭐ (Latest)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggested 11 Lineup & Podium Preview */}
            {suggestedLineup.length > 0 ? (
              <div className="space-y-1.5 p-2.5 bg-pmb-dark rounded-xl border border-cyan-500/30 text-xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                    Selected Global Starting 11 ({suggestedLineup.length}/11)
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    Max 3/League Constraint: Active ✅
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1">
                  {suggestedLineup.map((slot) => {
                    const is1st = slot.podiumRank === 1;
                    const is2nd = slot.podiumRank === 2;
                    const is3rd = slot.podiumRank === 3;

                    return (
                      <div
                        key={slot.key}
                        className={[
                          "flex items-center justify-between p-2 rounded-lg border",
                          is1st
                            ? "bg-yellow-500/10 border-yellow-500/50 shadow-sm"
                            : is2nd
                            ? "bg-slate-300/10 border-slate-300/50"
                            : is3rd
                            ? "bg-amber-600/10 border-amber-600/50"
                            : "bg-pmb-dark-surface/60 border-pmb-border/40",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-cyan-300 w-10 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-cyan-500/30 text-center">
                            {slot.key}
                          </span>
                          <span className="font-semibold text-white">{slot.player.fullName}</span>
                          <span className="text-[10px] text-gray-400">({slot.player.clubName})</span>
                          <span className="text-[9px] text-cyan-300 bg-cyan-950/60 px-1 rounded border border-cyan-500/30">
                            {slot.player.leagueName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          {slot.player.goals > 0 && <span className="text-emerald-400">⚽ {slot.player.goals}</span>}
                          {slot.player.assists > 0 && <span className="text-sky-400">👟 {slot.player.assists}</span>}
                          {is1st ? (
                            <span className="text-yellow-400 font-black bg-yellow-400/20 px-2 py-0.5 rounded border border-yellow-400/40">
                              👑 1st MVP (+4M€)
                            </span>
                          ) : is2nd ? (
                            <span className="text-slate-200 font-black bg-slate-300/20 px-2 py-0.5 rounded border border-slate-300/40">
                              🥈 2nd (+2.75M€)
                            </span>
                          ) : is3rd ? (
                            <span className="text-amber-400 font-black bg-amber-600/20 px-2 py-0.5 rounded border border-amber-600/40">
                              🥉 3rd (+2.5M€)
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              +1M€
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500">
                No candidates available. Please select rounds that have completed matchday fixtures.
              </div>
            )}

            {adminMessage && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/40 rounded-xl text-xs font-semibold text-cyan-300 text-center">
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
                onClick={handlePublish}
                disabled={adminSaving || suggestedLineup.length < 11}
                className="text-xs font-bold px-4 py-2 bg-gradient-to-r from-cyan-400 via-pmb-gold to-yellow-400 text-black rounded-xl hover:brightness-110 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
              >
                {adminSaving ? "Publishing..." : `⚡ Publish Global TOTW #${adminEdition} + Distribute Prizes`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
