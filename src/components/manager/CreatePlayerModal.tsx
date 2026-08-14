"use client";

import { FormEvent, useState } from "react";
import { PlayerDTO } from "@/lib/serialize-player";

type FormState = {
  firstName: string;
  lastName: string;
  position: string;
  nationality: string;
  overallRating: string;
  marketValue: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  position: "",
  nationality: "",
  overallRating: "",
  marketValue: "",
};

export function CreatePlayerModal({
  clubName,
  onClose,
  onCreated,
  onError,
}: {
  clubName: string;
  onClose: () => void;
  onCreated: (player: PlayerDTO) => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("First name and last name are required.");
      return;
    }
    if (!form.position.trim()) {
      setFormError("Position is required.");
      return;
    }
    if (!form.nationality.trim()) {
      setFormError("Nationality is required.");
      return;
    }
    if (form.overallRating && (Number(form.overallRating) < 0 || Number(form.overallRating) > 99)) {
      setFormError("Overall rating must be between 0 and 99.");
      return;
    }
    if (form.marketValue && Number(form.marketValue) < 0) {
      setFormError("Market value cannot be negative.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/manager/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          position: form.position.trim(),
          nationality: form.nationality.trim(),
          overallRating: form.overallRating ? Number(form.overallRating) : undefined,
          marketValue: form.marketValue ? Number(form.marketValue) : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data.error ?? "Could not create this player.";
        setFormError(message);
        onError(message);
        return;
      }

      onCreated(data.player as PlayerDTO);
      onClose();
    } catch {
      const message = "Network error. Please try again.";
      setFormError(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="pmb-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Add Player</h2>
            <p className="mt-0.5 text-xs text-gray-500">New player for {clubName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-gray-500 hover:text-white"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="pmb-label">First Name</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className="pmb-input"
              />
            </div>
            <div>
              <label className="pmb-label">Last Name</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className="pmb-input"
              />
            </div>
            <div>
              <label className="pmb-label">Position</label>
              <input
                required
                value={form.position}
                onChange={(e) => update("position", e.target.value)}
                className="pmb-input"
                placeholder="e.g. RW"
              />
            </div>
            <div>
              <label className="pmb-label">Nationality</label>
              <input
                required
                value={form.nationality}
                onChange={(e) => update("nationality", e.target.value)}
                className="pmb-input"
              />
            </div>
            <div>
              <label className="pmb-label">Overall Rating (optional)</label>
              <input
                type="number"
                min={0}
                max={99}
                value={form.overallRating}
                onChange={(e) => update("overallRating", e.target.value)}
                className="pmb-input"
              />
            </div>
            <div>
              <label className="pmb-label">Market Value (optional)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.marketValue}
                onChange={(e) => update("marketValue", e.target.value)}
                className="pmb-input"
                placeholder="0.00"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="pmb-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="pmb-btn-primary">
              {submitting ? "Adding..." : "Add Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
