"use client";

import { useMemo, useState } from "react";

export type AuditLogItem = {
  id: string;
  action: string;
  createdAt: string;
  entityType: string | null;
  entityId: string | null;
  actorUsername: string | null;
  actorRole: string | null;
  actorClubName: string | null;
  metadata: {
    username?: string;
    role?: string;
    clubName?: string;
    targetPlayerName?: string;
    targetPlayerId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: string;
    [key: string]: any;
  };
};

function parseUserAgent(ua?: string): string {
  if (!ua || ua === "unknown") return "Unknown Device";
  if (ua.includes("Android")) {
    const match = ua.match(/Android\s+([0-9.]+)/);
    return `Android ${match ? match[1] : "Mobile"}`;
  }
  if (ua.includes("iPhone")) return "Apple iPhone (iOS)";
  if (ua.includes("iPad")) return "Apple iPad (iPadOS)";
  if (ua.includes("Macintosh") || ua.includes("Mac OS")) return "Apple Mac (macOS)";
  if (ua.includes("Windows NT 10.0")) return "Windows 10/11 PC";
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Linux")) return "Linux Device";
  return "Web Client";
}

function getActionBadge(action: string) {
  switch (action) {
    case "PLAYER_REMOVED":
    case "PLAYER_DELETED":
      return {
        label: "Player Removed",
        color: "bg-red-500/20 text-red-400 border-red-500/40",
        icon: "🗑️",
      };
    case "CONTRACT_TERMINATED":
      return {
        label: "Contract Released",
        color: "bg-orange-500/20 text-orange-400 border-orange-500/40",
        icon: "⚠️",
      };
    case "USER_LOGIN_SUCCESS":
      return {
        label: "Login Success",
        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        icon: "🔑",
      };
    case "USER_LOGIN_FAILED":
      return {
        label: "Failed Login",
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
        icon: "🚫",
      };
    default:
      return {
        label: action.replace(/_/g, " "),
        color: "bg-gray-500/20 text-gray-300 border-gray-500/40",
        icon: "📋",
      };
  }
}

export function SecurityLogsClient({ initialLogs }: { initialLogs: AuditLogItem[] }) {
  const [query, setQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Group accounts by IP to detect multi-account logins
  const ipToUsernames = useMemo(() => {
    const map = new Map<string, Set<string>>();
    initialLogs.forEach((log) => {
      const ip = log.metadata?.ipAddress;
      const user = log.actorUsername || log.metadata?.username;
      if (ip && ip !== "unknown" && user) {
        if (!map.has(ip)) map.set(ip, new Set());
        map.get(ip)!.add(user);
      }
    });
    return map;
  }, [initialLogs]);

  const suspiciousIps = useMemo(() => {
    const suspects = new Set<string>();
    ipToUsernames.forEach((users, ip) => {
      if (users.size > 1) {
        suspects.add(ip);
      }
    });
    return suspects;
  }, [ipToUsernames]);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialLogs.filter((log) => {
      if (filterAction !== "ALL" && log.action !== filterAction) return false;
      if (!q) return true;

      const ip = log.metadata?.ipAddress?.toLowerCase() || "";
      const user = (log.actorUsername || log.metadata?.username || "").toLowerCase();
      const club = (log.actorClubName || log.metadata?.clubName || "").toLowerCase();
      const player = (log.metadata?.targetPlayerName || "").toLowerCase();
      const details = (log.metadata?.details || "").toLowerCase();
      const ua = (log.metadata?.userAgent || "").toLowerCase();

      return (
        ip.includes(q) ||
        user.includes(q) ||
        club.includes(q) ||
        player.includes(q) ||
        details.includes(q) ||
        ua.includes(q)
      );
    });
  }, [initialLogs, query, filterAction]);

  const totalDeletions = useMemo(
    () => initialLogs.filter((l) => l.action === "PLAYER_REMOVED" || l.action === "PLAYER_DELETED" || l.action === "CONTRACT_TERMINATED").length,
    [initialLogs]
  );

  const totalLogins = useMemo(
    () => initialLogs.filter((l) => l.action === "USER_LOGIN_SUCCESS").length,
    [initialLogs]
  );

  function copyIp(ip: string) {
    if (!ip || ip === "unknown") return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="pmb-card border-pmb-border p-5">
          <p className="text-2xl font-bold text-white">{initialLogs.length}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Total Audit Logs</p>
        </div>

        <div className="pmb-card border-red-500/30 p-5 bg-gradient-to-br from-red-950/20 to-pmb-charcoal/80">
          <p className="text-2xl font-bold text-red-400">{totalDeletions}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Player Removals</p>
        </div>

        <div className="pmb-card border-emerald-500/30 p-5 bg-gradient-to-br from-emerald-950/20 to-pmb-charcoal/80">
          <p className="text-2xl font-bold text-emerald-400">{totalLogins}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Logins Recorded</p>
        </div>

        <div className="pmb-card border-amber-500/30 p-5 bg-gradient-to-br from-amber-950/20 to-pmb-charcoal/80">
          <p className="text-2xl font-bold text-amber-400 flex items-center justify-between">
            <span>{suspiciousIps.size}</span>
            {suspiciousIps.size > 0 && <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">Multi-Account IPs</p>
        </div>
      </div>

      {/* Suspicious Multi-Account Alert Banner */}
      {suspiciousIps.size > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-pmb-charcoal to-pmb-black p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                Multi-Account Jumping Detected
              </h3>
              <p className="mt-1 text-xs text-gray-300">
                The following IP addresses have accessed multiple different club manager accounts:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from(suspiciousIps).map((ip) => {
                  const users = Array.from(ipToUsernames.get(ip) || []);
                  return (
                    <div
                      key={ip}
                      onClick={() => setQuery(ip)}
                      className="cursor-pointer rounded-lg border border-amber-500/40 bg-black/60 px-3 py-1.5 text-xs text-amber-200 transition hover:border-amber-400"
                    >
                      <span className="font-mono font-bold">{ip}</span> → Logged into {users.length} accounts:{" "}
                      <span className="font-semibold text-white">{users.join(", ")}</span> (Click to filter)
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by IP, username, club, or player..."
            className="pmb-input max-w-md text-xs"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-gray-400 hover:text-white transition"
            >
              Clear
            </button>
          )}
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="pmb-input max-w-[200px] text-xs"
        >
          <option value="ALL">All Actions</option>
          <option value="PLAYER_REMOVED">Player Removed</option>
          <option value="PLAYER_DELETED">Player Deleted (Admin)</option>
          <option value="CONTRACT_TERMINATED">Contract Terminated</option>
          <option value="USER_LOGIN_SUCCESS">Login Success</option>
          <option value="USER_LOGIN_FAILED">Login Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="pmb-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-pmb-border bg-pmb-black/50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor / Account</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Device / Client</th>
                <th className="px-4 py-3">Target Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pmb-border/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No security events match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const ip = log.metadata?.ipAddress || "unknown";
                  const isSuspect = suspiciousIps.has(ip);
                  const device = parseUserAgent(log.metadata?.userAgent);
                  const username = log.actorUsername || log.metadata?.username || "Anonymous";
                  const club = log.actorClubName || log.metadata?.clubName;
                  const player = log.metadata?.targetPlayerName;

                  return (
                    <tr key={log.id} className="transition hover:bg-pmb-charcoal/50">
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${badge.color}`}
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-white">{username}</p>
                          <p className="text-[10px] text-gray-400">
                            {club ? `${club} · ` : ""}
                            <span className="uppercase text-pmb-gold">{log.actorRole || log.metadata?.role || "USER"}</span>
                          </p>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`${
                              isSuspect
                                ? "text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30"
                                : "text-gray-300"
                            }`}
                          >
                            {ip}
                          </span>
                          {ip !== "unknown" && (
                            <button
                              onClick={() => copyIp(ip)}
                              title="Copy IP"
                              className="text-gray-500 hover:text-white transition"
                            >
                              {copiedIp === ip ? "✓" : "📋"}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                        <span className="rounded bg-black/40 px-2 py-1 text-[11px] border border-white/5">
                          {device}
                        </span>
                      </td>

                      {/* Target Details */}
                      <td className="px-4 py-3 text-gray-300">
                        {player && (
                          <p className="font-bold text-red-300">
                            Player: <span className="text-white">{player}</span>
                          </p>
                        )}
                        {log.metadata?.details && (
                          <p className="text-[10px] text-gray-400 leading-tight">{log.metadata.details}</p>
                        )}
                        {!player && !log.metadata?.details && (
                          <span className="text-gray-500 italic">No target specified</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
