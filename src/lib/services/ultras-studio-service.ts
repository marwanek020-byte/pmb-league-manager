import { UltrasGroup, getClubUltras } from "./ultras-registry";
import { UltrasMentalityEngine, CapoPersona } from "./ultras-mentality-engine";

export interface GeneratedChant {
  id: string;
  title: string;
  category: "MATCHDAY_BATTLE" | "DERBY_RIVALRY" | "HERO_TRIBUTE" | "ETERNAL_LOYALTY";
  language: "AR" | "EN" | "FR" | "ES";
  tempo: string; // e.g. "120 BPM · Heavy Drumbeat"
  instruments: string[]; // e.g. ["Darbouka", "Large Bass Drum", "Megaphone Call-and-Response"]
  lyrics: {
    verse: string[];
    chorus: string[];
    outro?: string[];
  };
  englishTranslation?: string;
}

export interface TifoChoreography {
  id: string;
  title: string;
  fixtureMatchup: string;
  theme: string;
  tierLayout: string;
  latinTypographySlogan: string;
  arabicSlogan?: string;
  colorDistribution: {
    sectorA: string;
    sectorB: string;
    sectorC: string;
  };
  centralIllustration: string;
  pyroTiming: Array<{
    minute: string;
    action: string;
    pyroType: string;
    warningProtocol: string;
  }>;
  asciiVisualLayout: string;
}

export class UltrasStudioService {
  /**
   * Generates authentic, rhythmic supporter chants tailored to club and culture.
   */
  public static async generateOriginalChant(params: {
    clubName: string;
    category: "MATCHDAY_BATTLE" | "DERBY_RIVALRY" | "HERO_TRIBUTE" | "ETERNAL_LOYALTY";
    opponentName?: string;
    playerName?: string;
    preferredLanguage?: "AR" | "EN" | "FR" | "ES";
  }): Promise<GeneratedChant> {
    const { clubName, category, opponentName, playerName, preferredLanguage } = params;
    const ultras = getClubUltras(clubName);
    const persona = UltrasMentalityEngine.resolveCapoPersona(clubName, preferredLanguage || ultras.preferredLanguage, ultras);
    const lang = preferredLanguage || (persona.id === "THE_HAMMER_EN" ? "EN" : persona.id === "LE_VIRAGE_FR" ? "FR" : "AR");

    const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();

    if (geminiApiKey) {
      try {
        const prompt = `Generate an original, highly rhythmic, authentic football ultras chant for "${clubName}" (${ultras.officialGroupTitle}).
Category: ${category}
Language: ${lang}
Opponent: ${opponentName || "Rival Club"}
Hero Player: ${playerName || "Captain"}
Capo Persona: ${persona.name} (${persona.region})

Requirements:
- Make it genuinely melodic, rhyming, and rhythmic.
- If Arabic/Darija: Use authentic Moroccan Virage rhyming lyrics with drums and passion.
- If English: Use authentic British terrace rhyming 4-line verses (West Ham / Premier League style).
- If French: Use authentic French ultra Virage rhyming stanzas.
- Return strictly JSON in this exact structure:
{
  "title": "Chant Title",
  "tempo": "125 BPM · Fast Rhythmic Clap",
  "instruments": ["Darbouka", "Bass Drum", "Megaphone"],
  "verse": ["Line 1", "Line 2", "Line 3", "Line 4"],
  "chorus": ["Chorus Line 1", "Chorus Line 2", "Chorus Line 3", "Chorus Line 4"],
  "outro": ["Outro Line 1", "Outro Line 2"],
  "englishTranslation": "Short meaning summary"
}`;

        const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
        for (const modelName of candidateModels) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText);
              return {
                id: `chant-${Date.now()}`,
                title: parsed.title || `${clubName} Curva Anthem`,
                category,
                language: lang,
                tempo: parsed.tempo || "120 BPM · Driving Drumbeat",
                instruments: parsed.instruments || ["Darbouka", "Bass Drum", "Terrace Claps"],
                lyrics: {
                  verse: parsed.verse || [],
                  chorus: parsed.chorus || [],
                  outro: parsed.outro || [],
                },
                englishTranslation: parsed.englishTranslation,
              };
            }
          }
        }
      } catch (err) {
        console.warn("[UltrasStudio] Gemini chant generation fallback to offline generator:", err);
      }
    }

    // Offline Curated Rhythmic Chants
    return this.getOfflineChant(clubName, category, lang, opponentName, playerName, ultras);
  }

  /**
   * Generates a complete TIFO choreography and pyro blueprint for major matches.
   */
  public static generateTifoConcept(params: {
    clubName: string;
    opponentName: string;
    isDerby?: boolean;
    fixtureTitle?: string;
  }): TifoChoreography {
    const { clubName, opponentName, isDerby = true, fixtureTitle = "PMB Championship Clash" } = params;
    const ultras = getClubUltras(clubName);
    const colors = ultras.colors.join(" & ");

    const isMoroccan = /far|raja|wydad|fes|tanger|berkane|agadir/i.test(clubName);

    const latinSlogan = isDerby ? "VICTORIA INVICTA · DOMINATIO URBIS" : "SEMPER FIDELIS · GLORIA AETERNA";
    const arabicSlogan = isDerby ? "المجد لمن صنع التاريخ.. والسيادة للزعيم" : "وفاء الأجيال.. وعشق لا ينتهي";

    const asciiVisualLayout = `
┌───────────────────────────────────────────────────────────┐
│               CURVA TIFO STADIUM BLUEPRINT                │
├─────────────────────────┬─────────────────────────────────┤
│ [SECTOR A: LEFT TRIBUNE]│ [SECTOR B: CENTRAL CURVA CORE]  │
│ 3,000 Duo-Color Cards   │ 3D Giant Drop Canvas (45m x 25m)│
│ Pattern: Striped Fabric │ Motif: Mythical Mascot Crest    │
├─────────────────────────┼─────────────────────────────────┤
│ [SECTOR C: RIGHT FLANK] │ [LOWER TERRACE: PYRO BARRIER]   │
│ 3,000 Duo-Color Cards   │ 50x Smoked Strobes (Sync Min 0) │
└─────────────────────────┴─────────────────────────────────┘
    `;

    return {
      id: `tifo-${Date.now()}`,
      title: `${ultras.officialGroupTitle} · Choreography "${isDerby ? "The Fortress of Pride" : "Eternal Brotherhood"}"`,
      fixtureMatchup: `${clubName} vs ${opponentName}`,
      theme: isDerby ? "Total City Dominance & Historical Supremacy" : "Unconditional Loyalty & Continental Glory",
      tierLayout: "3-Tier Complete Curva Choreography (Lower, Mid & Upper Terraces)",
      latinTypographySlogan: latinSlogan,
      arabicSlogan: isMoroccan ? arabicSlogan : undefined,
      colorDistribution: {
        sectorA: `Sector A (West): 3,000 Mosaic Cards in ${ultras.colors[0] || "Primary"}`,
        sectorB: `Sector B (Center): 45m x 25m 3D Hand-Painted Canvas displaying the Club Mascot`,
        sectorC: `Sector C (East): 3,000 Mosaic Cards in ${ultras.colors[1] || "Secondary"} & Gold`,
      },
      centralIllustration: `3D Silhouette of the ${ultras.groupName} Mascot rising above the city skyline with stadium floodlights.`,
      pyroTiming: [
        {
          minute: "00:00 (Walkout)",
          action: "Simultaneous Ignition of 60x Low-Smoke Flare Pots along the pitch perimeter.",
          pyroType: "Dense Color Smoke (Red / Green / Blue / Claret)",
          warningProtocol: "Curva safety stewards deployed with water buckets at 5-meter intervals.",
        },
        {
          minute: "45:00 (Halftime)",
          action: "Strobe flash sequence across the upper tier as the players return.",
          pyroType: "White Strobe Flash Flares",
          warningProtocol: "Strict clearance from fence banners.",
        },
        {
          minute: "90:00+ (Full-time)",
          action: "Grand Finale Craquage celebrating the final whistle result.",
          pyroType: "Handheld Torch Flares (Craquage Total)",
          warningProtocol: "Coordinated Capo signal from the central tower.",
        },
      ],
      asciiVisualLayout,
    };
  }

  private static getOfflineChant(
    clubName: string,
    category: string,
    lang: "AR" | "EN" | "FR" | "ES",
    opponentName?: string,
    playerName?: string,
    ultras?: UltrasGroup
  ): GeneratedChant {
    const opp = opponentName || "the rivals";
    const hero = playerName || "Our Captain";

    if (lang === "EN") {
      return {
        id: `chant-${Date.now()}`,
        title: `The Iron Terraces of ${clubName}`,
        category: category as any,
        language: "EN",
        tempo: "124 BPM · Heavy Terrace Claps & Bass Drum",
        instruments: ["Large Bass Drum", "Terrace Claps", "Snare Drum", "Megaphone"],
        lyrics: {
          verse: [
            `Through the smoke and East End rain,`,
            `The Claret and Blue will rise again!`,
            `We stand as one, we never yield,`,
            `The Iron Army owns the field!`,
          ],
          chorus: [
            `Oh ${clubName}! We hear the call!`,
            `Together we stand, we never fall!`,
            `From London town to foreign shores,`,
            `The terrace sings and the stadium roars!`,
          ],
          outro: [
            `Irons! Irons! Irons! ⚒️`,
            `Forever blowing bubbles high!`,
          ],
        },
        englishTranslation: "Authentic British terrace anthem celebrating relentless grit, unity, and heritage.",
      };
    }

    if (lang === "FR") {
      return {
        id: `chant-${Date.now()}`,
        title: `L'Écho du Virage (${clubName})`,
        category: category as any,
        language: "FR",
        tempo: "120 BPM · Tambour & Porte-Voix",
        instruments: ["Tambour Majeur", "Caisse Claire", "Porte-Voix", "Claps Collectifs"],
        lyrics: {
          verse: [
            `Dans la nuit sous les projecteurs,`,
            `On chante avec toute notre ferveur !`,
            `Pour ce maillot et cet écusson,`,
            `Nous ferons vibrer toutes les saisons !`,
          ],
          chorus: [
            `Allez ${clubName}, hissez nos couleurs !`,
            `Sur le terrain, montrez votre cœur !`,
            `Le virage est là, uni et debout,`,
            `Nous irons jusqu'au bout pour vous !`,
          ],
          outro: [
            `Fiers de nos couleurs ! 🔵🔴`,
            `Ici c'est la passion !`,
          ],
        },
        englishTranslation: "Passionate French Virage melody emphasizing unconditional loyalty and heart.",
      };
    }

    // Moroccan Darija
    return {
      id: `chant-${Date.now()}`,
      title: `صوت الكورفا الأبدي (${clubName})`,
      category: category as any,
      language: "AR",
      tempo: "128 BPM · إيقاع الدربوكة والطبول الكبرى",
      instruments: ["الدربوكة المغربية", "الطبل الكبير (Bombo)", "الميغافون", "سيمفونية الحناجر"],
      lyrics: {
        verse: [
          `من صغري وأنا معاك.. فكل بلاد وراك!`,
          `العسكر فالمدرج صوت الحق.. والراية فالعلالي ترفرف!`,
          `لا خوف لا تراجع فالميدان.. بالرجولة نغلبو الزمان!`,
          `قميص غالي فيه التاريخ.. ورجال كيموتو على التوني!`,
        ],
        chorus: [
          `أوووووه يا ${clubName} يا حبيب الملايين!`,
          `وراك الكورفا صامدة فكل حين!`,
          `جيبو البطولة وفرحو الشعب..`,
          `المدرج جحيم والنصر قريب!`,
        ],
        outro: [
          `ديما ديما معاك حتى للموت! 🔥`,
          `كرااااكاج فالمدرج والعز للرجال! 💚🖤`,
        ],
      },
      englishTranslation: "Authentic Moroccan Curva melody celebrating lifelong loyalty and militant fighting spirit on the pitch.",
    };
  }
}
