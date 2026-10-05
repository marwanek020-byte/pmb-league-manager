/**
 * Centralized admin authorization helpers.
 *
 * ─ SUPER_ADMIN  → full access to every league + global features
 * ─ LEAGUE_ADMIN → scoped to their own leagueId; can still access
 *                  cross-league features like Competition Seasons,
 *                  Throne Cup, and The Dugout.
 * ─ ADMINISTRATOR → legacy role, treated identically to SUPER_ADMIN
 *                   for backward compatibility during migration.
 */

/** All roles that grant admin-panel access. */
export const ADMIN_ROLES = ["SUPER_ADMIN", "LEAGUE_ADMIN", "ADMINISTRATOR"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Type for the user portion of a NextAuth session. */
interface SessionUser {
  role?: string | null;
  leagueId?: string | null;
  adminLeagueId?: string | null;
}

// ──────────────────────────────────────────────────────────────────────
// Predicates
// ──────────────────────────────────────────────────────────────────────

/** Returns `true` when the user holds any admin-tier role. */
export function isAnyAdmin(user: SessionUser | null | undefined): boolean {
  if (!user || !user.role) return false;
  return (ADMIN_ROLES as readonly string[]).includes(user.role);
}

/** Returns `true` when the user is the global super admin (or legacy ADMINISTRATOR). */
export function isSuperAdmin(user: SessionUser | null | undefined): boolean {
  if (!user || !user.role) return false;
  return user.role === "SUPER_ADMIN" || user.role === "ADMINISTRATOR";
}

/** Returns `true` when the user is a league-scoped admin. */
export function isLeagueAdmin(user: SessionUser | null | undefined): boolean {
  if (!user || !user.role) return false;
  return user.role === "LEAGUE_ADMIN";
}

/**
 * Returns `true` when the user is allowed to operate on the given league.
 *
 * - SUPER_ADMIN / ADMINISTRATOR → always allowed
 * - LEAGUE_ADMIN → allowed only when `leagueId` matches their own
 */
export function canAccessLeague(
  user: SessionUser | null | undefined,
  leagueId: string | null | undefined,
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!isLeagueAdmin(user)) return false;
  // LEAGUE_ADMIN must have a matching leagueId
  const userLeagueId = user.adminLeagueId ?? user.leagueId;
  return !!leagueId && userLeagueId === leagueId;
}

/**
 * Returns the leagueId filter that should be applied to Prisma queries.
 * - SUPER_ADMIN → `undefined` (no filter, sees all leagues)
 * - LEAGUE_ADMIN → their specific leagueId
 */
export function getAdminLeagueFilter(
  user: SessionUser | null | undefined,
): string | undefined {
  if (!user) return undefined;
  if (isSuperAdmin(user)) return undefined;
  const leagueId = user.adminLeagueId ?? user.leagueId;
  return leagueId ?? undefined;
}
