import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAnyAdmin } from "@/lib/admin-auth";
import { SecurityLogsClient } from "./SecurityLogsClient";

export const dynamic = "force-dynamic";

export default async function AdminSecurityLogsPage() {
  const session = await auth();
  if (!session || !isAnyAdmin(session.user)) {
    redirect("/unauthorized");
  }

  // Fetch recent activity & security logs
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: {
        select: {
          username: true,
          role: true,
          club: { select: { name: true } },
          adminLeague: { select: { name: true } },
        },
      },
    },
  });

  const serializedLogs = logs.map((log) => ({
    id: log.id,
    action: log.action,
    createdAt: log.createdAt.toISOString(),
    entityType: log.entityType,
    entityId: log.entityId,
    actorUsername: log.actor?.username ?? null,
    actorRole: log.actor?.role ?? null,
    actorClubName: log.actor?.club?.name ?? null,
    metadata: (log.metadata as Record<string, any>) ?? {},
  }));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="admin-hero relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-950/30 via-pmb-charcoal to-pmb-black p-7 sm:p-10 shadow-xl">
        <div className="relative max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[.25em] text-red-400">
            Security Intelligence · Forensic Audit Trail
          </p>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Account & Player <span className="text-red-400">Security Logs</span>
          </h1>
          <p className="mt-4 text-sm leading-6 text-gray-300">
            Real-time tracking of user logins, IP addresses, client devices, and player deletions across all clubs. Detect unauthorized access and account hopping immediately.
          </p>
        </div>
      </section>

      {/* Security Logs Interactive Client Table */}
      <SecurityLogsClient initialLogs={serializedLogs} />
    </div>
  );
}
