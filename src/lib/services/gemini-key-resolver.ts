import fs from "fs";
import path from "path";

/**
 * Resolves the Google Gemini API key safely.
 * Prioritizes:
 * 1. Client-supplied API key
 * 2. process.env.GEMINI_API_KEY / GOOGLE_GEMINI_API_KEY
 * 3. Fresh read from disk (.env / .env.local) if server environment hasn't reloaded
 *
 * Automatically sanitizes against accidental database connection string leakage.
 */
export function resolveGeminiApiKey(clientApiKey?: string): string | undefined {
  let key = (
    clientApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  )?.trim().replace(/^["']|["']$/g, "");

  // If contaminated with connection string parameters, discard it
  if (key && (key.includes("channel_binding") || key.includes("postgresql:") || key.includes("http:"))) {
    key = undefined;
  }

  // If not found in process.env or process.env was cached before .env was written, read dynamically from disk
  if (!key && typeof window === "undefined") {
    try {
      const candidates = [".env", ".env.local"];
      for (const file of candidates) {
        const envPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf8");
          const lines = envContent.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("GEMINI_API_KEY=") || trimmed.startsWith("GOOGLE_API_KEY=") || trimmed.startsWith("GOOGLE_GEMINI_API_KEY=")) {
              const val = trimmed.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
              if (val && !val.includes("channel_binding") && !val.includes("postgresql:")) {
                key = val;
                break;
              }
            }
          }
        }
        if (key) break;
      }
    } catch {
      // ignore
    }
  }

  return key;
}
