"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewSeasonWidget() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Season name is required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/competition-seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), format: "DOUBLE_ROUND_ROBIN" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create season.");
        return;
      }
      setName("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={create} className="sm:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="pmb-label">Season Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="2026/2027"
          className="pmb-input"
        />
      </div>
      <button
        type="submit"
        disabled={creating}
        className="pmb-btn-primary whitespace-nowrap disabled:opacity-50"
      >
        {creating ? "Creating..." : "Create Season"}
      </button>
      {error && (
        <p className="sm:col-span-2 text-sm text-red-400 mt-1">{error}</p>
      )}
    </form>
  );
}
