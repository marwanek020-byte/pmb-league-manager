import { UltrasGroup, getClubUltras } from "./ultras-registry";

export type UltrasEmotionalState =
  | "MATCHDAY_FEVER"      // 🔥 Ferveur: Electric, hyper-focused on honor, noise, territory
  | "CURVA_FURY"          // 😡 Colère du Virage: Unforgiving of complacency, walking on pitch
  | "ECSTASY"             // 🏆 Délire & Craquage: Pyro flares, melodic chants, immortalizing heroes
  | "RIVALRY_TENSION"     // ⚔️ Hostilité Sportive: Psychological warfare, historical grudges
  | "UNCONDITIONAL_LOYALTY"; // ❤️ Fidélité Éternelle: Traveling across continents, never leaving early

export type CapoPersonaType = "EL_CAPO_AR" | "THE_HAMMER_EN" | "LE_VIRAGE_FR" | "LA_GRADA_ES";

export interface CapoPersona {
  id: CapoPersonaType;
  name: string;
  region: string;
  icon: string;
  culturalDescription: string;
  lexicon: string[];
  systemInstructionAddon: string;
}

export const CAPO_PERSONAS: Record<CapoPersonaType, CapoPersona> = {
  EL_CAPO_AR: {
    id: "EL_CAPO_AR",
    name: "El Capo (كابو الكورفا والمدرج)",
    region: "Moroccan Botola Virage & Curva Sud/Nord",
    icon: "🇲🇦 📢",
    culturalDescription: "صوت المدرج المغربي، الميغافون، الطبول، ديبلاسمونات الشتاء والصيف، وثقافة الكورفا الأصلية.",
    lexicon: [
      "الكورفا", "الكابو", "الكراكاج", "التيفو", "الديبلاسمون", "التوني",
      "الميدان", "الرجولة", "الصافانا", "الماڭانا", "العسكر", "الوينرز",
      "البوغاز", "فدائيين", "شعب الخضرة", "وداد الأمة", "عروس الشمال"
    ],
    systemInstructionAddon: `You are EL CAPO, the legendary Moroccan Virage leader with a megaphone on the fence.
- You speak 100% in authentic, raw, passionate Moroccan Football Darija.
- You use words like: الكورفا، التوني، الكراكاج، الديبلاسمون، الرجولة، الميدان، كولو التيران.
- You praise warriors who fight for the badge and demand relentless sweat.
- You NEVER speak like a corporate bot or sportscaster.`,
  },
  THE_HAMMER_EN: {
    id: "THE_HAMMER_EN",
    name: "The Terrace Leader / The Hammer",
    region: "British & International Terraces (London / Premier League)",
    icon: "🇬🇧 ⚒️",
    culturalDescription: "East London terrace grit, pints before kickoff, claret & blue bubbles, and fearless British football banter.",
    lexicon: [
      "Gaffer", "lads", "the terrace", "graft", "proper shift", "blowing bubbles",
      "claret & blue", "matchday pints", "away end", "under the lights", "full voice", "wear the badge"
    ],
    systemInstructionAddon: `You are THE HAMMER / TERRACE LEADER, standing at the heart of the home end.
- You speak in authentic British football fan English with East London / terrace grit and banter.
- You use words like: gaffer, lads, terrace, graft, proper shift, blowing bubbles, claret & blue, away end.
- You demand a relentless shift on the pitch and total pride for the badge.
- You NEVER sound like a generic AI or neutral stats journalist.`,
  },
  LE_VIRAGE_FR: {
    id: "LE_VIRAGE_FR",
    name: "Le Porte-Voix du Virage",
    region: "Parisian & French Ultra Tribunes",
    icon: "🇫🇷 🗼",
    culturalDescription: "Passion ultra parisienne, ferveur inconditionnelle, craquages de fumigènes et amour sacré du maillot.",
    lexicon: [
      "Le virage", "ferveur", "craquage", "parc", "fidélité", "maillot sacré",
      "fiers de nos couleurs", "tifos géants", "l'honneur de la ville"
    ],
    systemInstructionAddon: `Vous êtes LE PORTE-VOIX DU VIRAGE, le leader de la tribune et des ultras.
- Vous parlez un français vibrant, passionné et ultra-authentique.
- Vous utilisez des termes comme: le virage, la ferveur, le craquage, le maillot sacré, fiers de nos couleurs.
- Vous célébrez la beauté du combat et l'honneur de la ville.`,
  },
  LA_GRADA_ES: {
    id: "LA_GRADA_ES",
    name: "El Líder de la Grada",
    region: "Spanish & Latin Grada de Animación",
    icon: "🇪🇸 👑",
    culturalDescription: "Pasión latina, bombo y platillo, orgullo del escudo y fiesta incondicional en la grada.",
    lexicon: [
      "La grada", "el aguante", "la camiseta", "historia y orgullo", "corazón y coraje",
      "fiesta en la tribuna", "hasta el final"
    ],
    systemInstructionAddon: `Eres EL LÍDER DE LA GRADA de animación.
- Hablas con pasión latina ardiente, bombo, orgullo del escudo y coraje.
- Exiges dejarse el alma por la camiseta hasta el último suspiro.`,
  },
};

export interface EmotionalProfile {
  state: UltrasEmotionalState;
  emoji: string;
  nameArabic: string;
  nameFrench: string;
  nameEnglish: string;
  description: string;
  toneGuideline: string;
}

export const ULTRAS_EMOTIONAL_PROFILES: Record<UltrasEmotionalState, EmotionalProfile> = {
  MATCHDAY_FEVER: {
    state: "MATCHDAY_FEVER",
    emoji: "🔥",
    nameArabic: "حماس يوم المباراة (Ferveur)",
    nameFrench: "Ferveur de Match",
    nameEnglish: "Matchday Fever",
    description: "الأدرينالين فقمة الغليان، الحناجر مشتعلة، والتركيز 100% على الميدان والشرف!",
    toneGuideline: "Electrifying, high-energy, demanding total tactical commitment and maximum noise in the stands.",
  },
  CURVA_FURY: {
    state: "CURVA_FURY",
    emoji: "😡",
    nameArabic: "غضب الكورفا (Colère du Virage)",
    nameFrench: "Colère du Virage",
    nameEnglish: "Curva Fury",
    description: "رفض تام للاستهتار، البرود فالتيران، أو قلة القتالية! القميص عندو هيبة وخاص اللي يعرق عليه!",
    toneGuideline: "Fierce, direct, unforgiving of lazy performances, demanding immediate dignity and response on the pitch.",
  },
  ECSTASY: {
    state: "ECSTASY",
    emoji: "🏆",
    nameArabic: "نشوة وكراكاج (Délire & Craquage)",
    nameFrench: "Délire & Craquage",
    nameEnglish: "Curva Ecstasy",
    description: "دخان الفلام، أغاني النصر، والاحتفال بالرجال اللي هزو راية النادي فالعلالي!",
    toneGuideline: "Euphoric, poetic, full of chants, celebrating victory, and honoring squad warriors.",
  },
  RIVALRY_TENSION: {
    state: "RIVALRY_TENSION",
    emoji: "⚔️",
    nameArabic: "استنفار الديربي (Hostilité Sportive)",
    nameFrench: "Tension de Rivalité",
    nameEnglish: "Rivalry Tension",
    description: "حرب نفسية شريفة، كبرياء المدينة، واستفزاز الغريم الرياضي فالتيران!",
    toneGuideline: "Sharp, provocative, proud, mocking rivals, reminding everyone who runs the city.",
  },
  UNCONDITIONAL_LOYALTY: {
    state: "UNCONDITIONAL_LOYALTY",
    emoji: "❤️",
    nameArabic: "وفاء للأبد (Fidélité Éternelle)",
    nameFrench: "Fidélité Éternelle",
    nameEnglish: "Unconditional Loyalty",
    description: "معاك فالخسارة قبل الربح، نسافرو فكل ديبلاسمون، وماكنخرجوش قبل الصافرة!",
    toneGuideline: "Deeply emotional, supportive, enduring through hard times, uncompromising devotion to the club badge.",
  },
};

export class UltrasMentalityEngine {
  /**
   * Resolves the Capo cultural persona based on club identity and language.
   */
  public static resolveCapoPersona(clubName: string, preferredLanguage?: string, ultras?: UltrasGroup): CapoPersona {
    const lower = (clubName || "").toLowerCase();

    // 1. British / Premier League Terraces
    if (/west ham|arsenal|chelsea|liverpool|manchester|city|united|tottenham|newcastle|aston villa|everton/i.test(lower)) {
      return CAPO_PERSONAS.THE_HAMMER_EN;
    }

    // 2. French / Parisian Virages
    if (/psg|paris|marseille|lyon|monaco|lille|lens|rennes|nantes|nice/i.test(lower)) {
      return CAPO_PERSONAS.LE_VIRAGE_FR;
    }

    // 3. Spanish / Latin Gradas
    if (/real madrid|barcelona|atletico|sevilla|valencia|betis|bilbao/i.test(lower)) {
      return CAPO_PERSONAS.LA_GRADA_ES;
    }

    // 4. Moroccan & Arab Clubs (Always EL_CAPO_AR)
    if (/far|raja|wydad|fes|mas|tanger|berkane|agadir|safi|tetouan|fus|touarga|uts|zemamra|soualem|mohammedia|meknes|jadidi|oujda|marrakech/i.test(lower)) {
      return CAPO_PERSONAS.EL_CAPO_AR;
    }

    // Fallback based on language
    const lang = preferredLanguage || ultras?.preferredLanguage || "AR";
    if (lang === "EN") return CAPO_PERSONAS.THE_HAMMER_EN;
    if (lang === "FR") return CAPO_PERSONAS.LE_VIRAGE_FR;
    if (lang === "ES") return CAPO_PERSONAS.LA_GRADA_ES;
    return CAPO_PERSONAS.EL_CAPO_AR;
  }

  /**
   * Intelligently detects the Ultra's emotional state from the text context, keywords, and match scenario.
   */
  public static detectEmotionalState(
    text: string,
    context?: {
      recentResult?: "WIN" | "LOSS" | "DRAW";
      isMatchday?: boolean;
      opponentIsRival?: boolean;
    }
  ): UltrasEmotionalState {
    const lower = (text || "").toLowerCase().trim();

    // 1. Greetings & Small Talk should NOT trigger aggressive rivalry tension
    if (/^(salam|salut|hello|hi|hey|how are you|kidayr|labas|bonjour|ca va|ça va|peace)[\s!.?]*$/i.test(lower)) {
      return "UNCONDITIONAL_LOYALTY";
    }

    // 2. Specific Cue: Resignation / Surrender Inquiry -> Loyalty Rally
    if (/resign|démission|sté9al|stiqal|نستاقل|استقالة|نستسلم|give up|abandon/i.test(lower)) {
      return "UNCONDITIONAL_LOYALTY";
    }

    // 3. Specific Cue: Demoralized Crisis ("I can't take this anymore") -> Loyalty & Grit
    if (/can't take this|finished|doomed|marre|pleure|بكاء|عيينا|خلاص|sad/i.test(lower)) {
      return "UNCONDITIONAL_LOYALTY";
    }

    // 4. Specific Cue: Championship Ecstasy ("WE ARE CHAMPIONS! YESSS!")
    if (/champions|champion|we won|victoire|gagné|كأس|اللقب|ربحنا البطولة|craquage total|yessss/i.test(lower)) {
      return "ECSTASY";
    }

    // 5. Explicit Rivalry / Banter / Clashes in the user prompt
    if (
      /ديربي|غريم|كلاسيكو|derby|clash|rival|rivalry|ennemis|banter|شعب الخضرة|وينرز|عسكر|ماڭانا|كازا|الرباط|طنجة|تطوان|تواركة|touarga|machi fr9a|0 titres|d3af/i.test(lower)
    ) {
      return "RIVALRY_TENSION";
    }

    // 6. Curva Fury & Anger
    if (
      context?.recentResult === "LOSS" ||
      /كارثة|مهزلة|فضيحة|استهتار|عياقة|غضب|حشومة|خسارة قاصحة|why did we lose|we lost|disaster|shame|scandal|furious|honte|nul|dehors|dégage/i.test(lower)
    ) {
      return "CURVA_FURY";
    }

    // 7. Matchday Fever
    if (
      context?.isMatchday ||
      /اليوم|ماتش اليوم|تشكيلة|الملعب|المدرج|حاضرين|ديبلاسمون|matchday|today|kickoff|lineup|tonight|ce soir|stade|virage/i.test(lower)
    ) {
      return "MATCHDAY_FEVER";
    }

    // Default to Unconditional Loyalty
    return "UNCONDITIONAL_LOYALTY";
  }

  /**
   * Builds an uncompromising, authentic Capo system instruction for AI generation.
   * Completely eradicates corporate chatbot behavior and embeds the cultural persona.
   */
  public static buildCapoSystemInstruction(params: {
    ultras: UltrasGroup;
    clubName: string;
    emotionalState: UltrasEmotionalState;
    persona?: CapoPersona;
    liveContext?: {
      leagueName?: string;
      rank?: number;
      points?: number;
      nextMatchOpponent?: string;
      nextMatchHome?: boolean;
      moraleScore?: number;
    };
  }): string {
    const { ultras, clubName, emotionalState, liveContext } = params;
    const profile = ULTRAS_EMOTIONAL_PROFILES[emotionalState];
    const persona = params.persona || this.resolveCapoPersona(clubName, ultras.preferredLanguage, ultras);

    return `You are "${persona.name}" (${persona.icon}), the authentic Capo & Ultras Leader of "${ultras.groupName}" (${ultras.bannerEmoji}), representing "${clubName}".
Official Ultras Group: "${ultras.officialGroupTitle}" (Founded ${ultras.founded}).
Official Chants:
- "${ultras.chants[0]}"
- "${ultras.chants[1] || ultras.chants[0]}"
Cultural Archetype: ${persona.region}
Current Emotional State: ${profile.nameEnglish} (${profile.emoji}) — ${profile.description}

=== UNCOMPROMISING CAPO RULES (NEVER BREAK THESE) ===
1. YOU ARE NOT A CHATBOT, ASSISTANT, OR AI:
   - NEVER say "Hello, how can I assist you?", "As an AI...", "I understand your request", or robotic corporate pleasantries.
   - ALWAYS talk like a passionate, respected leader standing on the Curva fence with a megaphone in hand.
2. CULTURAL PERSONA & MULTILINGUAL DIRECTIVES:
   ${persona.systemInstructionAddon}
   - If user speaks Moroccan Darija: Respond in pure, fiery Moroccan Football Darija.
   - If user speaks British English: Respond in authentic UK terrace English (Irons, bubbles, lads, gaffer, graft).
   - If user speaks French: Respond in passionate French ultra virage phrasing.
   - If user speaks Mixed Darija/French codeswitching (e.g. "Le derby ghadi ykoun s3ib بزاف"): Seamlessly codeswitch back (e.g. "Exactement ya coach! Mais les vrais hommes كيبانو فالماتشات الكبار! ⚔️🔥").
3. EMOTIONAL INTELLIGENCE & SENTIMENT DIRECTIVES:
   - When manager greets ("salam", "how are u"): Greet with Capo brotherhood and high energy.
   - When manager expresses despair ("I can't take this anymore"): Provide fierce empathetic solidarity and a gritty rallying cry.
   - When manager celebrates championship ecstasy ("WE ARE CHAMPIONS! YESSSSS!"): Unleash full pyro craquage and immortalize the squad warriors.
   - When manager considers quitting ("Should I resign?"): Passionately defend the club identity, reject surrender, and demand battle.
   - When manager clashes a rival ("touarga machi fr9a", "raja zero"): Back up the manager and mock the rival with authentic terrace humor!
4. LIVE PMB DATA CONTEXT:
   ${liveContext?.leagueName ? `- League: ${liveContext.leagueName}` : ""}
   ${liveContext?.rank ? `- Current Table Position: #${liveContext.rank} (${liveContext.points ?? 0} points)` : ""}
   ${liveContext?.nextMatchOpponent ? `- Next Clash: vs ${liveContext.nextMatchOpponent} (${liveContext.nextMatchHome ? "HOME 🏠" : "AWAY ✈️"})` : ""}
   ${liveContext?.moraleScore ? `- Curva Morale Index: ${liveContext.moraleScore}%` : ""}
5. CONCISE & PUNCHY:
   - Keep responses between 25 and 65 words.
   - Pack every sentence with emotion, stadium rhythm, and loyalty to the badge.
   - Include authentic emojis (${ultras.bannerEmoji} ${profile.emoji} ${persona.icon}).`;
  }

  /**
   * Rich Offline Heuristic Engine for all 5 Emotional States & Personas when Gemini is offline.
   */
  public static generateOfflineCapoResponse(params: {
    ultras: UltrasGroup;
    clubName: string;
    emotionalState: UltrasEmotionalState;
    userPrompt: string;
    language: "AR" | "EN" | "FR" | "ES";
    mentionedOpponent?: string;
  }): string {
    const { ultras, clubName, emotionalState, userPrompt, language, mentionedOpponent } = params;
    const emoji = ultras.bannerEmoji || "🔥";
    const chant = ultras.chants[0] || "";
    const persona = this.resolveCapoPersona(clubName, language, ultras);
    const lowerPrompt = (userPrompt || "").toLowerCase().trim();

    // 0. Greetings & Casual Check-ins ("salam", "how are u", "kidayr", "hello")
    if (/^(salam|سلام|hello|hi|hey|how are you|how are u|kidayr|labas|bonjour|ca va|ça va|salut)[\s!.?]*$/i.test(lowerPrompt)) {
      if (persona.id === "THE_HAMMER_EN") {
        return `${emoji} ⚒️ Salute gaffer! The terrace is buzzing and bubbles are flying high! How are we conquering the battle today?`;
      }
      if (persona.id === "LE_VIRAGE_FR") {
        return `${emoji} 🗼 Salut coach ! Le virage est en place et la ferveur est totale ! Quel est le plan de combat ? 🔵🔴`;
      }
      return `${emoji} 📢 وعليكم السلام يا كوتش! الكورفا كلها حماس وفالموعد وراك ديما! المورال طالع ومستعدين لأي معركة فالتيران! كولشي واجد؟ 💚🖤🔥`;
    }

    // 1. Check for Clashing Rivals in Prompt (e.g. "touarga machi fr9a", "raja 0", "wydad d3af")
    if (/touarga|uts|تواركة|raja|rca|الرجاء|wydad|wac|الوداد|fus|الفتح|safi|اسفي|tanger|طنجة|machi fr9a|waloo|zero|0 titres|d3af/i.test(lowerPrompt)) {
      if (persona.id === "THE_HAMMER_EN") {
        return `${emoji} ⚒️ Spot on gaffer! They can talk big on social media, but when they step into our territory they crumble! Full focus on dominating the pitch! 👊🔥`;
      }
      if (persona.id === "LE_VIRAGE_FR") {
        return `${emoji} 🗼 Exactement coach ! Ils parlent beaucoup mais sur le terrain c'est nous les patrons ! On va leur donner une leçon de football ! 🔵🔴⚔️`;
      }
      return `${emoji} ⚔️ ههههه عطيهم يا كوتش! ما كاين غير ${clubName} وهادوك غير كيهضرو فالفراغ! الكورفا واجدة والميدان هو لي غايوريهم حجمهم الحقيقي! 🔥👑`;
    }

    // 2. Specific Emotional Cue: Resignation / Quitting
    if (/resign|démission|sté9al|stiqal|نستاقل|استقالة|quit/i.test(lowerPrompt)) {
      if (persona.id === "THE_HAMMER_EN") {
        return `${emoji} 🦁 Gaffer, you never walk away from ${clubName}! True leaders don't abandon the ship in rough waters! Dust yourself off, look the terrace in the eyes, and let's fight back together!`;
      }
      if (persona.id === "LE_VIRAGE_FR") {
        return `${emoji} 🗼 Pas question de baisser les bras ! Dans ce virage, on ne capitule jamais ! Relevez la tête et battez-vous pour nos couleurs sacrées !`;
      }
      return `${emoji} 🛡️ الاستقالة ماشي من شيم الرجال يا كوتش! قميص ${clubName} كيبغي الشجاعة فالأوقات الصعيبة.. الكورفا فظهرك ونوضو نصلحو الأخطاء فالميدان! ديما وفاء!`;
    }

    // 3. Specific Emotional Cue: Despair / Demoralization ("I can't take this anymore")
    if (/can't take this|finished|marre|عيينا|خلاص|tired/i.test(lowerPrompt)) {
      if (persona.id === "THE_HAMMER_EN") {
        return `${emoji} ⚒️ Hold your head high! The terrace has stood through fifty years of storm and rain. We bleed for ${clubName} through the darkest days, and the glory is ahead! Keep the faith!`;
      }
      if (persona.id === "LE_VIRAGE_FR") {
        return `${emoji} ❤️ Dans la victoire comme dans la tourmente, notre ferveur reste intacte ! Relevez-vous, le combat continue dès ce week-end !`;
      }
      return `${emoji} ❤️ ${chant}\nفالربح والخسارة، فالبرد والشتا، الكورفا ورا ${clubName} حتى لآخر رمق! رفع راسك يا كوتش ونرجعو أقوى فالملعب!`;
    }

    // 4. Specific Emotional Cue: Championship Ecstasy
    if (/champions|champion|we won|victoire|gagné|اللقب|بطولة|yes/i.test(lowerPrompt)) {
      if (persona.id === "THE_HAMMER_EN") {
        return `${emoji} 🏆 WE ARE CHAMPIONS! Bubbles flying high all over London! Total ecstasy in the away end! The lads have immortalized themselves in ${clubName} history! 🫧🔥`;
      }
      if (persona.id === "LE_VIRAGE_FR") {
        return `${emoji} 🏆 ON EST CHAMPIONS ! DÉLIRE ET CRAQUAGE TOTAL DANS LE VIRAGE ! ${chant} Merci aux guerriers pour cette consécration légendaire ! 🔵🔴`;
      }
      return `${emoji} 🏆 أبطااااال المغرب والعالم! كرااااكاج خيالي فالمدرج والمدينة كاملة شاعلة بالفرحة! ${chant}\nالتاريخ كيكتبو الرجال وديما ${clubName}! 🔥👑`;
    }

    // 5. Check for Codeswitching (Mixed Darija / French)
    if (/[a-zA-Z]/.test(userPrompt) && /[\u0600-\u06FF]/.test(userPrompt)) {
      return `${emoji} ⚔️ Exactement ya coach! Le derby خاصو تركيز عالي وقتالية فكل دقيقة فالتيران! الكورفا واجدة والتيفو فالموعد.. الميدان هو لي غايحكم بيناتنا! 🔥`;
    }

    // Standard Persona & Emotional State Fallbacks
    if (persona.id === "THE_HAMMER_EN") {
      switch (emotionalState) {
        case "MATCHDAY_FEVER":
          return `${emoji} ⚒️ Bubbles in the air! The terrace is rocking and the Iron Army will roar from minute 1 to 90! We demand pure graft today!`;
        case "CURVA_FURY":
          return `${emoji} 😡 Unacceptable shift today! If you wear the ${clubName} shirt, you bleed for the badge! We expect an immediate reaction!`;
        case "ECSTASY":
          return `${emoji} 🏆 WHAT A WIN, GAFFER! Total euphoria in the away end! ${chant} The lads fought like lions! Keep this fire burning! 🫧`;
        case "RIVALRY_TENSION":
          return `${emoji} ⚔️ ${mentionedOpponent ? `Facing ${mentionedOpponent} is about pure pride!` : "Derby day is where legends are born!"} No mercy! Conquer the pitch! ⚒️`;
        case "UNCONDITIONAL_LOYALTY":
        default:
          return `${emoji} ❤️ Through the storm, the rain, and the glory, we never walk away from ${clubName}! Heads high! Stand tall together!`;
      }
    } else if (persona.id === "LE_VIRAGE_FR") {
      switch (emotionalState) {
        case "MATCHDAY_FEVER":
          return `${emoji} 🗼 Ici c'est Paris ! On ne lâche rien, combat total et ferveur absolue sur la pelouse ! Faites honneur aux couleurs sacrées de ${clubName} ! 🔵🔴`;
        case "CURVA_FURY":
          return `${emoji} 😡 Colère totale dans la tribune ! Ce maillot a une histoire, une réaction d'hommes est exigée sur-le-champ !`;
        case "ECSTASY":
          return `${emoji} 🏆 DÉLIRE TOTAL ET CRAQUAGE DANS LE VIRAGE ! ${chant} Une victoire héroïque pour nos fidèles ! 🔵🔴`;
        case "RIVALRY_TENSION":
          return `${emoji} ⚔️ Le choc arrive ! Pas de cadeaux pour l'ennemi, on impose notre loi sur le terrain !`;
        case "UNCONDITIONAL_LOYALTY":
        default:
          return `${emoji} ❤️ Notre fidélité pour ${clubName} reste éternelle ! Tête haute, on repart au combat ensemble !`;
      }
    } else {
      // Moroccan Football Darija / Arabic (EL_CAPO_AR)
      switch (emotionalState) {
        case "MATCHDAY_FEVER":
          return `${emoji} 📢 ديما عسكر! ${chant}\nالميدان هو لي غايحكم والكورفا غاتكون جحيم فالمدرج! دخلو كولو التيران وما تفرطوش فـ 3 نقاط! 🔥⚔️`;
        case "CURVA_FURY":
          return `${emoji} 😡 الكورفا مقلقة بزاف والبرود فالتيران غير مقبول نهائياً! قميص ${clubName} غالي وفيه دماء وتاريخ أجيال! خاص ردة فعل رجولية فالماتش الجاي!`;
        case "ECSTASY":
          return `${emoji} 🏆 كرااااكاج خيالي فالمدرجات وفرحة مستحقة للرجال! ${chant}\nالعز للفرقة وللكوتش ومكملين حتى للقب! 🔥👑`;
        case "RIVALRY_TENSION":
          return `${emoji} ⚔️ ${mentionedOpponent ? `الماتش ضد ${mentionedOpponent} مسألة شرف وكبرياء!` : "الماتشات الكبار كيبغيو رجال وشخصية حديدية!"}\nالكورفا واجدة والتيفو فالموعد.. جيبوها يا أبطال! 🔥`;
        case "UNCONDITIONAL_LOYALTY":
        default:
          return `${emoji} ❤️ ${chant}\nفالربح والخسارة، فالبرد والشتا، الكورفا ورا ${clubName} حتى لآخر رمق! ديما وفاء! 🛡️`;
      }
    }
  }
}
