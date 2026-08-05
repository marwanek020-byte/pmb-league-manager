"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TransferWindowControls({ initialIsOpen }: { initialIsOpen: boolean }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [loading, setLoading] = useState(false);

  async function setWindow(nextIsOpen: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transfer-window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: nextIsOpen }),
      });
      if (res.ok) {
        setIsOpen(nextIsOpen);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pmb-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Transfer Status</p>
        <span
          className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
            isOpen
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading || isOpen}
          onClick={() => setWindow(true)}
          className="pmb-btn-primary"
        >
          Open Transfer Window
        </button>
        <button
          type="button"
          disabled={loading || !isOpen}
          onClick={() => setWindow(false)}
          className="pmb-btn-secondary"
        >
          Close Transfer Window
        </button>
      </div>
    </div>
  );
}
