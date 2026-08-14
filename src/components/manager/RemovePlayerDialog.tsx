"use client";

import { useState } from "react";
import { PlayerDTO } from "@/lib/serialize-player";

export function RemovePlayerDialog({
  player,
  onClose,
  onRemoved,
  onError,
}: {
  player: PlayerDTO;
  onClose: () => void;
  onRemoved: (playerId: string) => void;
  onError: (message: string) => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function confirmRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/manager/players/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        onError(data.error ?? "Could not remove this player.");
        return;
      }

      onRemoved(player.id);
      onClose();
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={() => !removing && onClose()}
    >
      <div className="pmb-card w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-white">
          Remove <span className="font-semibold text-pmb-gold">{player.fullName}</span>?
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" disabled={removing} onClick={onClose} className="pmb-btn-secondary">
            No
          </button>
          <button type="button" disabled={removing} onClick={confirmRemove} className="pmb-btn-primary">
            {removing ? "Removing..." : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}
