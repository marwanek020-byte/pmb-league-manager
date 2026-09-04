"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4 text-center text-white">
      <div className="max-w-md w-full rounded-3xl border border-pmb-gold/30 bg-[#121418]/90 p-8 shadow-[0_0_50px_rgba(212,175,55,0.25)] backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-pmb-gold/40 bg-pmb-gold/10 text-3xl text-pmb-gold">
          ⚽
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          PMB League Manager
        </h1>
        <p className="mt-2 text-xs text-gray-400">
          {error.message || "An unexpected system exception occurred."}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-[10px] text-gray-600">
            Digest: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto rounded-xl bg-pmb-gold px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:scale-105"
          >
            Retry
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
