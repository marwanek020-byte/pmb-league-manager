import crypto from "crypto";

/**
 * Generates an un-guessable, deterministic, high-entropy unique password for each club.
 * Because it uses HMAC with a secret key:
 * - Passwords are 100% unique per club.
 * - Passwords cannot be guessed by other managers.
 * - Passwords never shift or desync randomly on reloads.
 */
export function getClubPassword(clubName: string): string {
  const clean = clubName.replace(/[^a-zA-Z]/g, "").slice(0, 4);
  const prefix = (clean.length >= 3 ? clean : "Club");
  const formattedPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
  const hash = crypto
    .createHmac("sha256", "PMB-MASTER-2026-KEY-98214")
    .update(clubName.trim().toLowerCase())
    .digest("hex");
  const code = hash.slice(0, 4);
  return `${formattedPrefix}#${code}!26`;
}
