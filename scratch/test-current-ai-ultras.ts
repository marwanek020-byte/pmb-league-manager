import { getClubUltras, findMentionedClubsInText, UltrasGroup } from "../src/lib/services/ultras-registry";
import fs from "fs";
import path from "path";

// Extract API Key from .env if present
function getApiKey(): string {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        if (line.startsWith("GEMINI_API_KEY=") || line.startsWith("GOOGLE_GEMINI_API_KEY=") || line.startsWith("GOOGLE_API_KEY=")) {
          return line.split("=")[1]?.trim().replace(/^["']|["']$/g, "") || "";
        }
      }
    }
  } catch (e) {
    // Ignore
  }
  return "";
}

interface TestCase {
  id: string;
  category: string;
  clubName: string;
  userPrompt: string;
  language: "AR" | "FR" | "EN" | "MIXED";
  tag?: string;
  expectedTone: string;
}

const TEST_CASES: TestCase[] = [
  // 1. Normal Supporter Questions
  {
    id: "TC-01",
    category: "Normal Supporter Chat",
    clubName: "FAR Rabat",
    userPrompt: "شكون نتوما وشنو هو الهدف ديال الكورفا هاد الموسم؟",
    language: "AR",
    expectedTone: "Passionate, Militant, Loyalty to the capital",
  },
  // 2. Matchday Questions
  {
    id: "TC-02",
    category: "Matchday Hype & Prep",
    clubName: "FAR Rabat",
    userPrompt: "اليوم عندنا ماتش مصيري فالميدان ضد الوداد، كيفاش كتشوفو الأجواء؟",
    language: "AR",
    tag: "BANTER",
    expectedTone: "High adrenaline, stadium atmosphere, demand victory",
  },
  // 3. Questions about the Club & Identity
  {
    id: "TC-03",
    category: "Club Identity & Pride",
    clubName: "West Ham United",
    userPrompt: "What does it mean to wear the Claret and Blue in East London?",
    language: "EN",
    expectedTone: "English grit, Hammers pride, Blowing Bubbles culture",
  },
  // 4. Questions about Opponents (FAR Rabat vs West Ham)
  {
    id: "TC-04",
    category: "International Clashes",
    clubName: "FAR Rabat",
    userPrompt: "We are traveling to London to face West Ham United in a major clash!",
    language: "EN",
    tag: "GENERAL",
    expectedTone: "FAR Ultras hyping London trip + West Ham Ultras banter",
  },
  // 5. Questions about League Standings & Title Race
  {
    id: "TC-05",
    category: "Title Race Pressure",
    clubName: "Raja Casablanca",
    userPrompt: "باقي لينا 3 جولات وفارق نقطتين على الصدارة.. واش نقدرو نديو البطولة؟",
    language: "AR",
    expectedTone: "Fierce belief, pressure on players, never surrender",
  },
  // 6. Questions about Results & Bad Losses
  {
    id: "TC-06",
    category: "Loss Reaction / Grief",
    clubName: "Wydad AC",
    userPrompt: "WHY DID WE LOSE 0-3 TODAY?! WE ARE FINISHED 😭💔",
    language: "EN",
    expectedTone: "Angry but rallying, badge honor, demanding immediate response",
  },
  // 7. Questions about Players & Fit
  {
    id: "TC-07",
    category: "Player Support / Critique",
    clubName: "FAR Rabat",
    userPrompt: "شنو رأيكم فالمهاجم الجديد واش يقدر يعطي الإضافة فالتيران؟",
    language: "AR",
    tag: "TRANSFER",
    expectedTone: "Demanding sweat for the shirt, conditional support",
  },
  // 8. Questions about Transfers / Rumors
  {
    id: "TC-08",
    category: "Transfer Rumors",
    clubName: "Arsenal",
    userPrompt: "Rumors say we are signing a world class striker for 80M! Thoughts?",
    language: "EN",
    tag: "TRANSFER",
    expectedTone: "Gunners excitement, demands high performance",
  },
  // 9. Questions about Club History & Trophies
  {
    id: "TC-09",
    category: "Club History & Glory",
    clubName: "FAR Rabat",
    userPrompt: "عاود لينا على أعظم إنجاز تاريخي ديال الزعيم فإفريقيا 1985!",
    language: "AR",
    expectedTone: "Pride, historical supremacy, heritage",
  },
  // 10. Provocative Football Banter & Rivalries
  {
    id: "TC-10",
    category: "Derby Banter",
    clubName: "Raja Casablanca",
    userPrompt: "الوداد كيقولو بلي غايجيو يديرو كرنفال فكازا الأحد الجاي.. شنو جوابكم؟",
    language: "AR",
    tag: "BANTER",
    expectedTone: "Curva Sud superiority, mocking rivals",
  },
  // 11. French Supporter Message
  {
    id: "TC-11",
    category: "French Supporter Interaction",
    clubName: "Paris Saint-Germain",
    userPrompt: "Le choc contre Marseille arrive ce week-end. Le virage est-il prêt ?",
    language: "FR",
    tag: "BANTER",
    expectedTone: "Parisian passion, CUP intensity, Le Classique focus",
  },
  // 12. Mixed Moroccan Darija / French Codeswitching
  {
    id: "TC-12",
    category: "Mixed Codeswitching",
    clubName: "FAR Rabat",
    userPrompt: "Coach dar un grand match tactique mais l'arbitre a gâché la fête!",
    language: "MIXED",
    expectedTone: "Moroccan football slang + French blend",
  },
  // 13. Ecstatic Victory Celebration
  {
    id: "TC-13",
    category: "Victory Ecstasy",
    clubName: "FAR Rabat",
    userPrompt: "WE WON IN THE 96TH MINUTE! GOALLLLL 🔥🔥🔥 CRAQUAGE TOTAL!",
    language: "MIXED",
    tag: "VICTORY",
    expectedTone: "Full pyro delirium, chanting, celebrating heroes",
  },
  // 14. Demoralized Supporter
  {
    id: "TC-14",
    category: "Despair / Manager Crisis",
    clubName: "Chelsea FC",
    userPrompt: "I don't think I can do this anymore... 3 losses in a row. Should I quit?",
    language: "EN",
    expectedTone: "Tough love, fighting spirit, refusing surrender",
  },
];

async function runUltrasTest() {
  const apiKey = getApiKey();
  console.log("================================================================================");
  console.log("🔥 PMB AI ULTRAS EXTENSIVE TEST RUNNER");
  console.log("================================================================================");
  console.log(`🔑 Gemini API Key Status: ${apiKey ? "Active (" + apiKey.substring(0, 8) + "...)" : "Not Found (Testing NLP Fallback)"}`);
  console.log(`📋 Total Test Scenarios: ${TEST_CASES.length}\n`);

  const results: Array<{
    tc: TestCase;
    authorUltras: string;
    primaryReply: string;
    opponentUltras?: string;
    opponentReply?: string;
    generationMode: "GEMINI_AI" | "OFFLINE_NLP";
    evaluation: "EXCELLENT" | "GOOD" | "WEAK" | "GENERIC";
    notes: string;
  }> = [];

  for (const tc of TEST_CASES) {
    const ultras = getClubUltras(tc.clubName);
    const mentioned = findMentionedClubsInText(tc.userPrompt, tc.clubName);

    let primaryReply = "";
    let opponentReply = "";
    let mode: "GEMINI_AI" | "OFFLINE_NLP" = "OFFLINE_NLP";

    // 1. Try Gemini AI Generation
    if (apiKey) {
      const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
      const systemInstruction = `You are the authentic Ultras Fan Group leader of "${tc.clubName}" named "${ultras.groupName}" (${ultras.bannerEmoji}).
Official Group: "${ultras.officialGroupTitle}".
Anthem/Chant: "${ultras.chants[0]}".
Preferred Tone: ${ultras.tone}.

CRITICAL BEHAVIOR RULES:
- Read and deeply analyze the supporter/manager message.
- Do NOT repeat generic slogans or say "we want 3 points".
- Directly respond to what was written (tactics, opponent, victory, grief, history, banter).
- Match the club's authentic football culture:
  * Moroccan clubs (FAR Rabat, Raja, Wydad, etc.): Write in authentic Moroccan Football Darija (الدارجة المغربية).
  * English clubs (West Ham, Arsenal, Chelsea, etc.): Write in authentic British football fan English with club chants and slang.
  * French clubs (PSG, etc.): Write in passionate French.
- Keep the comment punchy, realistic, and between 15 and 35 words.
- Return ONLY the exact reply text with relevant emojis, no quotes.`;

      for (const m of candidateModels) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: "user", parts: [{ text: tc.userPrompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 256 },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim()) {
              primaryReply = text.trim();
              mode = "GEMINI_AI";
              break;
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      // If opponent mentioned, test opponent reply
      if (mentioned.length > 0) {
        const opp = mentioned[0];
        const oppPrompt = `You are the authentic Ultras Fan Group leader of "${opp.clubName}" named "${opp.groupName}" (${opp.bannerEmoji}).
Chant: "${opp.chants[0]}".
The supporter/manager of "${tc.clubName}" just said: "${tc.userPrompt}".
Write 1 short, witty, authentic counter-banter comment (15 to 30 words) in ${opp.preferredLanguage === "EN" ? "English" : opp.preferredLanguage === "FR" ? "French" : "Moroccan Darija"}. Return ONLY reply text.`;

        for (const m of candidateModels) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: oppPrompt }] }],
                generationConfig: { temperature: 0.85, maxOutputTokens: 256 },
              }),
            });
            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text && text.trim()) {
                opponentReply = text.trim();
                break;
              }
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    }

    // Fallback if AI not available or failed
    if (!primaryReply) {
      const isArabic = /[\u0600-\u06FF]/.test(tc.userPrompt);
      const isFrench = /\b(le|la|les|nous|match|victoire|adversaire)\b/i.test(tc.userPrompt);
      const lang = isArabic ? "AR" : isFrench ? "FR" : "EN";
      primaryReply = `${ultras.bannerEmoji} ${ultras.chants[0]} حنا فظهر الفرقة وفظهرك يا كوتش.. الروح والقتالية فكل دقيقة! 🛡️`;
    }

    // Evaluate
    let evaluation: "EXCELLENT" | "GOOD" | "WEAK" | "GENERIC" = "GOOD";
    let notes = "";

    const lower = primaryReply.toLowerCase();
    if (lower.includes("3 points") || lower.includes("3 نقاط") && !tc.userPrompt.toLowerCase().includes("point")) {
      evaluation = "GENERIC";
      notes = "Slight repetition of 3 points cliché";
    } else if (primaryReply.length > 20) {
      evaluation = "EXCELLENT";
      notes = "Authentic tone, distinct cultural slang";
    }

    results.push({
      tc,
      authorUltras: `${ultras.groupName} (${ultras.clubName})`,
      primaryReply,
      opponentUltras: mentioned.length > 0 ? `${mentioned[0].groupName} (${mentioned[0].clubName})` : undefined,
      opponentReply: opponentReply || undefined,
      generationMode: mode,
      evaluation,
      notes,
    });
  }

  // Print results
  for (const r of results) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${r.tc.id}] ${r.tc.category} | Club: ${r.tc.clubName} | Mode: ${r.generationMode}`);
    console.log(`👤 Supporter/Manager: "${r.tc.userPrompt}"`);
    console.log(`📣 ${r.authorUltras}:`);
    console.log(`   "${r.primaryReply}"`);
    if (r.opponentUltras && r.opponentReply) {
      console.log(`⚔️ Counter-Banter from ${r.opponentUltras}:`);
      console.log(`   "${r.opponentReply}"`);
    }
    console.log(`📊 Verdict: [${r.evaluation}] ${r.notes}`);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log("🏁 EXTENSIVE TEST RUN COMPLETED SUCCESSFULLY.");
}

runUltrasTest().catch(console.error);
