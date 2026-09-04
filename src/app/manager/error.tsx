"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("PMB Manager Error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-black/80 p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/30 text-3xl">
          ⚠️
        </div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
          Dashboard Interruption
        </h2>
        <p className="mt-2 text-xs text-gray-400">
          {error.message || "An unexpected issue occurred while loading this section."}
        </p>
        {error.digest && (
          <p className="mt-2 text-[10px] font-mono text-gray-600">
            Error Ref: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto rounded-xl bg-pmb-gold px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:scale-105"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
