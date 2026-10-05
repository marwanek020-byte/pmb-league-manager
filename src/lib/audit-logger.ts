import { prisma } from "@/lib/prisma";

export interface SecurityEventParams {
  action:
    | "USER_LOGIN_SUCCESS"
    | "USER_LOGIN_FAILED"
    | "PLAYER_DELETED"
    | "PLAYER_RELEASED"
    | "CONTRACT_TERMINATED"
    | "BUDGET_ADJUSTED"
    | "MULTIPLE_ACCOUNT_LOGIN_DETECTED";
  actorUserId?: string | null;
  username?: string | null;
  role?: string | null;
  clubId?: string | null;
  clubName?: string | null;
  targetPlayerId?: string | null;
  targetPlayerName?: string | null;
  req?: Request | null;
  details?: string | null;
  metadata?: Record<string, any>;
}

export async function logSecurityEvent(params: SecurityEventParams) {
  const req = params.req;
  const ip =
    req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req?.headers?.get("x-real-ip") ||
    "unknown";
  const userAgent = req?.headers?.get("user-agent") || "unknown";

  // Formatted log message that Vercel logs displays directly in the Messages column
  console.log(
    `🛡️ [SECURITY AUDIT] ${params.action} | User: ${params.username ?? "Unknown"} (${params.role ?? "None"}) | Club: ${params.clubName ?? "None"} | Target: ${params.targetPlayerName ?? params.targetPlayerId ?? "None"} | IP: ${ip} | Device: ${userAgent}`
  );

  try {
    await prisma.activityLog.create({
      data: {
        action: params.action,
        actorUserId: params.actorUserId || null,
        entityType: params.targetPlayerId ? "PLAYER" : params.clubId ? "CLUB" : "USER",
        entityId: params.targetPlayerId || params.clubId || params.actorUserId || null,
        metadata: {
          username: params.username,
          role: params.role,
          clubId: params.clubId,
          clubName: params.clubName,
          targetPlayerId: params.targetPlayerId,
          targetPlayerName: params.targetPlayerName,
          details: params.details,
          ipAddress: ip,
          userAgent,
          timestamp: new Date().toISOString(),
          ...params.metadata,
        },
      },
    });
  } catch (error) {
    console.error("Failed to write security audit to database:", error);
  }
}
