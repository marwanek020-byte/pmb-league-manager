import { findMentionedClubsInText, getClubUltras } from "../src/lib/services/ultras-registry";
import { UltrasSocialService } from "../src/lib/services/ultras-social-service";

const post = "westham s7abna o3chran dyalna";
const farUltras = getClubUltras("FAR Rabat");
const m = findMentionedClubsInText(post, "FAR Rabat");

// @ts-ignore
const farComment = UltrasSocialService["generateSemanticFallbackComment"](farUltras, post, "GENERAL", m, "AR");
// @ts-ignore
const whuComment = UltrasSocialService["generateOpponentFallbackComment"](m[0], "FAR Rabat", post);

console.log("=== FRIENDSHIP / PRAISE TEST ===");
console.log("Post:", post);
console.log("Mentioned:", m[0].clubName);
console.log("FAR Rabat Ultras Reaction:\n", farComment);
console.log("West Ham Ultras Reaction:\n", whuComment);
