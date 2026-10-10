"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClubDetailsEditor({
  clubId,
  currentName,
  currentLogo,
}: {
  clubId: string;
  currentName: string;
  currentLogo: string | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [logo, setLogo] = useState(currentLogo || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logo: logo.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update club");
      }

      setSuccess("Club updated successfully!");
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 900);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setName(currentName);
          setLogo(currentLogo || "");
          setError(null);
          setSuccess(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-pmb-gold/40 bg-pmb-gold/10 px-3.5 py-1.5 text-xs font-semibold text-pmb-gold transition hover:bg-pmb-gold/20"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        Edit Name & Logo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12141a] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Edit Club Identity</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Club Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-white focus:border-pmb-gold focus:outline-none"
                  placeholder="e.g. Maghreb Fez"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Club Logo URL
                </label>
                <input
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-white focus:border-pmb-gold focus:outline-none"
                  placeholder="https://..."
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Direct link to PNG or SVG image badge.
                </p>
              </div>

              {/* Logo Preview */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/50">
                  {logo ? (
                    <img
                      src={logo}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/100x100?text=Invalid";
                      }}
                    />
                  ) : (
                    <span className="text-xs text-gray-500 font-bold">Badge</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{name || "Club Name"}</div>
                  <div className="text-xs text-gray-400">Badge preview</div>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-400">
                  {success}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-pmb-gold px-4 py-2 text-xs font-bold text-black transition hover:bg-pmb-gold/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
