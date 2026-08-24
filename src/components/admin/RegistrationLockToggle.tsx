"use client";

import { useState, useEffect } from "react";

export function RegistrationLockToggle() {
  const [locked, setLocked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadStatus() {
    try {
      const res = await fetch("/api/admin/settings/registration-lock");
      const data = await res.json();
      if (res.ok) {
        setLocked(data.locked);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleToggle(newLockedState: boolean) {
    const actionText = newLockedState ? "FREEZE and STOP all teams from adding players" : "UNLOCK player registrations for all teams";
    if (!confirm(`Are you sure you want to ${actionText}?`)) {
      return;
    }

    setUpdating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/registration-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: newLockedState }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocked(data.locked);
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update registration lock." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="pmb-card p-5 animate-pulse text-xs text-pmb-gold">
        Loading player registration control...
      </div>
    );
  }

  return (
    <div
      className={[
        "pmb-card p-5 border-2 transition-all shadow-xl",
        locked
          ? "border-red-500/50 bg-gradient-to-br from-red-950/20 via-black to-red-950/20 shadow-red-900/10"
          : "border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-black to-emerald-950/20 shadow-emerald-900/10",
      ].join(" ")}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={[
              "flex items-center justify-center w-12 h-12 rounded-2xl border text-2xl shrink-0 shadow-lg",
              locked
                ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-red-500/20 animate-pulse"
                : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20",
            ].join(" ")}
          >
            {locked ? "🔒" : "🔓"}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Player Registration & Roster Lock
              </h3>
              <span
                className={[
                  "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border",
                  locked
                    ? "bg-red-500/20 text-red-400 border-red-500/40"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                ].join(" ")}
              >
                {locked ? "🔴 LOCKED / FROZEN" : "🟢 WINDOW OPEN"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
              {locked
                ? "All clubs are currently BLOCKED from registering or adding new players to their squad."
                : "All clubs are currently ALLOWED to register and add available players to their squads."}
            </p>
          </div>
        </div>

        {/* Master Action Button */}
        <div>
          {locked ? (
            <button
              onClick={() => handleToggle(false)}
              disabled={updating}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>🔓</span>
              <span>{updating ? "Unlocking..." : "Unlock Player Registrations (Allow Teams)"}</span>
            </button>
          ) : (
            <button
              onClick={() => handleToggle(true)}
              disabled={updating}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>🔒</span>
              <span>{updating ? "Freezing..." : "Freeze Registrations (Stop Any Team From Adding Players)"}</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={[
            "mt-3.5 p-3 rounded-xl text-xs font-semibold text-center border",
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300",
          ].join(" ")}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
