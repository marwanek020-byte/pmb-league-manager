"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProactiveUltrasAlert } from "@/lib/services/ultras-alerts-service";

export function ProactiveAlertsWidget({ clubName }: { clubName: string }) {
  const [alerts, setAlerts] = useState<ProactiveUltrasAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/manager/ultras/alerts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [clubName]);

  const handleDispatchAlert = async (alertType: string) => {
    setDispatching(alertType);
    try {
      const res = await fetch("/api/manager/ultras/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertType }),
      });
      if (res.ok) {
        setDispatchedSuccess(true);
        setTimeout(() => setDispatchedSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDispatching(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-pmb-gold/30 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-6">
      {/* Glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              Proactive Capo Radar
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            🚨 Proactive Ultras Alerts & Direct Feeds
          </h3>
        </div>

        {dispatchedSuccess && (
          <span className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-400 animate-bounce">
            ✓ Alert DM Sent to Dugout & Inbox!
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <p className="text-xs font-bold text-pmb-gold animate-pulse">
            Scanning match schedules, table rivals, and Curva morale...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{alert.icon}</span>
                    <span className="text-xs font-black text-white">{alert.title}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      alert.severity === "CRITICAL"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : alert.severity === "URGENT"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-pmb-gold/20 text-pmb-gold border border-pmb-gold/40"
                    }`}
                  >
                    {alert.timestamp}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-gray-300">
                  {alert.message}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                {alert.actionHref ? (
                  <Link
                    href={alert.actionHref}
                    className="text-[11px] font-bold text-pmb-gold hover:underline"
                  >
                    {alert.actionLabel || "View Action"} →
                  </Link>
                ) : <span />}

                <button
                  onClick={() => handleDispatchAlert(alert.type)}
                  disabled={dispatching === alert.type}
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-black text-gray-300 hover:border-pmb-gold hover:text-white transition"
                >
                  {dispatching === alert.type ? "Dispatching..." : "📲 Test Dispatch DM"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
