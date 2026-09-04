"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayerDTO } from "@/lib/serialize-player";
import { ClubBadge } from "@/components/ClubBadge";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import { AddPlayerModal } from "@/components/manager/AddPlayerModal";
import { RemovePlayerDialog } from "@/components/manager/RemovePlayerDialog";
import { AddPlayerChoiceModal } from "@/components/manager/AddPlayerChoiceModal";
import { CreatePlayerModal } from "@/components/manager/CreatePlayerModal";
import { PlayerContractModal } from "@/components/manager/PlayerContractModal";

type SortKey = "fullName" | "position" | "realClub" | "nationality" | "playerId";

const PAGE_SIZE = 10;

export function AppPlayerList({
  initialSquad,
  clubName,
  clubId,
  clubBudget = 9356790,
  onBack,
}: {
  initialSquad: PlayerDTO[];
  clubName: string;
  clubId: string;
  clubBudget?: number;
  onBack: () => void;
}) {
  const router = useRouter();

  const [squad, setSquad] = useState<PlayerDTO[]>(initialSquad);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [page, setPage] = useState(1);

  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [pendingRemoval, setPendingRemoval] = useState<PlayerDTO | null>(null);
  const [inspectingPlayer, setInspectingPlayer] = useState<PlayerDTO | null>(null);

  const [registrationLocked, setRegistrationLocked] = useState(false);
  const { toast, showSuccess, showError, dismiss } = useToast();

  useEffect(() => {
    fetch("/api/system/registration-lock")
      .then((res) => res.json())
      .then((data) => {
        if (data.locked !== undefined) {
          setRegistrationLocked(Boolean(data.locked));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const rows = q
      ? squad.filter(
          (p) =>
            p.fullName.toLowerCase().includes(q) ||
            p.position.toLowerCase().includes(q) ||
            p.realClub.toLowerCase().includes(q) ||
            p.nationality.toLowerCase().includes(q) ||
            String(p.playerId).includes(q)
        )
      : squad;

    return [...rows].sort((a, b) => {
      if (sortKey === "playerId") {
        return a.playerId - b.playerId;
      }
      return String(a[sortKey] || "").localeCompare(String(b[sortKey] || ""));
    });
  }, [squad, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleCreated(newPlayer: PlayerDTO) {
    setSquad((prev) => [...prev, newPlayer]);
    showSuccess(`Player ${newPlayer.fullName} added successfully.`);
  }

  function handleRemoved(removedId: string) {
    setSquad((prev) => prev.filter((p) => p.id !== removedId));
    setPendingRemoval(null);
    showSuccess("Player removed from squad.");
  }

  const formattedBudget = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(clubBudget);

  const foreignCount = squad.filter(
    (p) => p.nationality?.toUpperCase() !== "MOROCCO" && p.nationality?.toUpperCase() !== "MAROC"
  ).length;

  return (
    <div
      className="fixed inset-0 w-full h-[100dvh] bg-[#070709] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-montserrat select-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(233,195,73,0.12) 0%, transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(233,195,73,0.12) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, rgba(12,12,16,0.95) 0%, #060608 100%)
        `,
      }}
    >
      {/* ─── TOP BAR (BUDGET + BACK + TABS) ─── */}
      <header className="relative z-20 w-full flex flex-wrap items-center justify-between gap-4 px-6 sm:px-10 pt-6 pb-3 border-b border-white/10">
        
        {/* Left: Back Button & Budget */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-3.5 py-2 text-xs font-bold text-gray-300 hover:text-white hover:border-[#e9c349] transition shadow-md cursor-pointer"
          >
            <span>‹</span>
            <span>HUB</span>
          </button>

          <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349]/80 bg-black/80 px-4 py-2 shadow-[0_0_15px_rgba(233,195,73,0.25)]">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-[11px]">
              €
            </div>
            <span className="text-xs sm:text-sm font-black tracking-wider text-white">
              {formattedBudget}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-md">
          <button
            type="button"
            className="relative rounded-full px-5 sm:px-7 py-1.5 text-xs font-black uppercase tracking-widest text-black shadow-md"
            style={{
              background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
            }}
          >
            <span>TEAM</span>
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#f5d475] shadow-[0_0_6px_#f5d475]" />
          </button>

          <button
            type="button"
            onClick={() => router.push("/manager/transfers")}
            className="rounded-full px-5 sm:px-7 py-1.5 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition"
          >
            TRANSFERS
          </button>

          <button
            type="button"
            onClick={() => router.push("/manager/fixtures")}
            className="rounded-full px-5 sm:px-7 py-1.5 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition"
          >
            DUGOUT
          </button>

          <button
            type="button"
            onClick={() => router.push("/manager/dashboard")}
            className="rounded-full px-5 sm:px-7 py-1.5 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition"
          >
            EXTRAS
          </button>
        </nav>
      </header>

      {/* ─── MAIN ROSTER CONTENT ─── */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex flex-col justify-between">
        
        {/* Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="font-montserrat text-xl sm:text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
              <span>Player List</span>
              <span className="text-xs font-bold text-[#e9c349] border border-[#e9c349]/40 bg-[#e9c349]/10 px-2.5 py-0.5 rounded-full">
                {squad.length} Registered
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Players currently registered to <span className="text-[#e9c349] font-bold">{clubName}</span>.
            </p>
          </div>

          {/* Foreign Quota Badge */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400">FOREIGN PLAYERS:</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full border ${
                foreignCount >= 5
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {foreignCount} / 5
            </span>
          </div>
        </div>

        {/* ─── CONTROLS BAR (SEARCH, SORT, AI AUDIT, ADD PLAYER) ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-black/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search your squad..."
              className="w-full rounded-xl border border-white/10 bg-[#121217] py-2 pl-9 pr-4 text-xs font-medium text-white placeholder-gray-500 focus:border-[#e9c349] focus:outline-none"
            />
          </div>

          {/* Right Action Group */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121217] px-3 py-1.5">
              <span className="text-[11px] text-gray-400 font-bold">Sort:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
              >
                <option value="fullName" className="bg-[#121217] text-white">Name</option>
                <option value="position" className="bg-[#121217] text-white">Position</option>
                <option value="realClub" className="bg-[#121217] text-white">Real Club</option>
                <option value="nationality" className="bg-[#121217] text-white">Nationality</option>
                <option value="playerId" className="bg-[#121217] text-white">Player ID</option>
              </select>
            </div>

            {/* AI Squad Audit Button */}
            <Link
              href="/manager/squad-audit"
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition shadow-sm"
            >
              <span>🤖</span>
              <span>AI Squad Audit</span>
            </Link>

            {/* Add Player Button */}
            <button
              type="button"
              disabled={registrationLocked}
              onClick={() => setShowAddChoice(true)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black uppercase tracking-wider text-black transition-all shadow-[0_2px_12px_rgba(233,195,73,0.35)] hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #f5d475 0%, #d4af37 50%, #b8860b 100%)",
              }}
            >
              <span>+</span>
              <span>Add Player</span>
            </button>
          </div>
        </div>

        {/* ─── ROSTER TABLE CONTAINER ─── */}
        <div className="flex-1 rounded-2xl border border-white/10 bg-black/70 overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              
              {/* TABLE HEADER */}
              <thead className="border-b border-white/15 bg-[#121217]/90 text-[10px] font-black uppercase tracking-widest text-[#e9c349]">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Real Club</th>
                  <th className="px-4 py-3">Nationality</th>
                  <th className="px-4 py-3">Player ID</th>
                  <th className="px-4 py-3 text-right">Contract & Actions</th>
                </tr>
              </thead>

              {/* TABLE ROWS */}
              <tbody className="divide-y divide-white/10">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      No players found in squad.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((player) => (
                    <tr
                      key={player.id}
                      className="hover:bg-[#181820]/60 transition-colors group"
                    >
                      {/* PLAYER MONOGRAM / PHOTO & NAME */}
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => setInspectingPlayer(player)}
                          title="Click to view contract details"
                        >
                          {player.photo ? (
                            <img
                              src={player.photo}
                              alt={player.fullName}
                              className="h-9 w-9 rounded-xl border border-pmb-gold/40 object-cover shadow-sm"
                            />
                          ) : (
                            <ClubBadge name={player.fullName} size="sm" />
                          )}

                          <div>
                            <span className="font-bold text-white group-hover:text-[#e9c349] transition">
                              {player.fullName}
                            </span>
                            {player.seasonSalary ? (
                              <span className="block text-[10px] font-mono text-[#e9c349]/90 font-bold">
                                {new Intl.NumberFormat("en-US").format(player.seasonSalary)} €/yr
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* POSITION */}
                      <td className="px-4 py-3">
                        <span className="font-bold px-2 py-0.5 rounded-md border border-[#e9c349]/40 bg-[#e9c349]/10 text-[#e9c349] text-[10px]">
                          {player.position}
                        </span>
                      </td>

                      {/* REAL CLUB */}
                      <td className="px-4 py-3 text-gray-300 font-medium">
                        {player.realClub}
                      </td>

                      {/* NATIONALITY */}
                      <td className="px-4 py-3 text-gray-300 font-medium">
                        {player.nationality}
                      </td>

                      {/* PLAYER ID */}
                      <td className="px-4 py-3 font-mono text-gray-400">
                        #{player.playerId}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* CONTRACT BUTTON */}
                          <button
                            type="button"
                            onClick={() => setInspectingPlayer(player)}
                            className="flex items-center gap-1 rounded-lg border border-[#e9c349]/50 bg-[#e9c349]/10 px-2.5 py-1 text-[11px] font-bold text-[#e9c349] hover:bg-[#e9c349]/20 transition shadow-sm cursor-pointer"
                            title="Inspect official contract & salary (Read-Only)"
                          >
                            <span>📄</span>
                            <span>Contract</span>
                          </button>

                          {/* REMOVE BUTTON */}
                          <button
                            type="button"
                            onClick={() => setPendingRemoval(player)}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                            title="Remove player from squad"
                          >
                            Remove
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>

          {/* ─── PAGINATION ─── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-xs text-gray-400 bg-[#0d0d12]">
              <span>
                Page {page} of {totalPages} ({filtered.length} players)
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-gray-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-gray-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* ─── MODALS (SAME BACKEND AS WEBSITE) ─── */}
      {showAddChoice && (
        <AddPlayerChoiceModal
          onClose={() => setShowAddChoice(false)}
          onExisting={() => {
            setShowAddChoice(false);
            setShowAddModal(true);
          }}
          onNew={() => {
            setShowAddChoice(false);
            setShowCreateModal(true);
          }}
        />
      )}

      {showAddModal && (
        <AddPlayerModal
          clubId={clubId}
          clubName={clubName}
          onClose={() => setShowAddModal(false)}
          onRegistered={handleCreated}
          onError={showError}
        />
      )}

      {showCreateModal && (
        <CreatePlayerModal
          clubName={clubName}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
          onError={showError}
        />
      )}

      {pendingRemoval && (
        <RemovePlayerDialog
          player={pendingRemoval}
          onClose={() => setPendingRemoval(null)}
          onRemoved={handleRemoved}
          onError={showError}
        />
      )}

      <PlayerContractModal
        player={inspectingPlayer}
        clubName={clubName}
        onClose={() => setInspectingPlayer(null)}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
