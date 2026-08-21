export interface UltrasGroup {
  clubName: string;
  groupName: string;
  officialGroupTitle: string; // e.g. "Ultras Askary 1958 & Black Army 2006"
  founded: number;
  colors: string[]; // e.g. ["#005A36", "#000000"]
  bannerEmoji: string;
  chants: string[];
  leaderUsername: string;
  leaderDisplayName: string;
  avatarSeed: string;
  tone: "PASSIONATE" | "MILITANT" | "PROUD" | "VOLATILE" | "LOYAL";
}

export const KNOWN_ULTRAS_GROUPS: Record<string, UltrasGroup> = {
  "far rabat": {
    clubName: "FAR Rabat",
    groupName: "FAR Rabat Ultras",
    officialGroupTitle: "Ultras Askary 1958 & Black Army 2006",
    founded: 1958,
    colors: ["#005A36", "#000000", "#D32F2F"],
    bannerEmoji: "💚🖤🔴",
    chants: [
      "ديما عسكر.. العاصمة برجالها وفالميدان صقور!",
      "القميص غالي والدم أسود وأخضر فالعروق!",
      "كابيتال بويز وفدائيين ورا الزعيم فكل بلاصة!",
    ],
    leaderUsername: "far_rabat_ultras",
    leaderDisplayName: "FAR Rabat Ultras 💚🖤",
    avatarSeed: "askary",
    tone: "MILITANT",
  },
  "raja casablanca": {
    clubName: "Raja Casablanca",
    groupName: "Raja Casablanca Ultras",
    officialGroupTitle: "Ultras Green Boys 2005 & Eagles 2006",
    founded: 2005,
    colors: ["#006837", "#FFFFFF"],
    bannerEmoji: "💚🤍🦅",
    chants: [
      "في بلادي ظلموني.. الخضرة الوطنية ديما فالقلب!",
      "كورفا سود ماڭانا.. شعب الخضرة لا يستسلم!",
      "رجاوي فدائي وحالفين حتى نديرو الكورتاج فكاع المدن!",
    ],
    leaderUsername: "raja_casablanca_ultras",
    leaderDisplayName: "Raja Casablanca Ultras 🦅💚",
    avatarSeed: "greenboys",
    tone: "PASSIONATE",
  },
  "wydad ac": {
    clubName: "Wydad AC",
    groupName: "Wydad AC Ultras",
    officialGroupTitle: "Ultras Winners 2005",
    founded: 2005,
    colors: ["#ED1C24", "#FFFFFF"],
    bannerEmoji: "❤️🤍⭐",
    chants: [
      "معا للأبد.. فدائيو الوداد فكل قارة!",
      "ودادي حمر وبيض والشرف فوق كل اعتبار!",
      "كورفا نورد طالعة بالروح ونموتو على وداد الأمة!",
    ],
    leaderUsername: "wydad_ac_ultras",
    leaderDisplayName: "Wydad AC Ultras ❤️🤍",
    avatarSeed: "winners",
    tone: "PASSIONATE",
  },
  "maghreb de fes": {
    clubName: "Maghreb de Fes",
    groupName: "MAS Fes Ultras",
    officialGroupTitle: "Ultras Fatal Tigers 2006",
    founded: 2006,
    colors: ["#FFF200", "#000000"],
    bannerEmoji: "💛🖤🐯",
    chants: [
      "الفهد الأصفر فالعاصمة العلمية حاكم بأحكامو!",
      "الماص حضارة وتاريخ.. الصافانا ترجع للأمجاد!",
    ],
    leaderUsername: "mas_fes_ultras",
    leaderDisplayName: "MAS Fes Ultras 💛🖤",
    avatarSeed: "fataltigers",
    tone: "PROUD",
  },
  "mas fes": {
    clubName: "MAS Fes",
    groupName: "MAS Fes Ultras",
    officialGroupTitle: "Ultras Fatal Tigers 2006",
    founded: 2006,
    colors: ["#FFF200", "#000000"],
    bannerEmoji: "💛🖤🐯",
    chants: [
      "الفهد الأصفر فالعاصمة العلمية حاكم بأحكامو!",
      "الماص حضارة وتاريخ.. الصافانا ترجع للأمجاد!",
    ],
    leaderUsername: "mas_fes_ultras",
    leaderDisplayName: "MAS Fes Ultras 💛🖤",
    avatarSeed: "fataltigers",
    tone: "PROUD",
  },
  "ittihad tanger": {
    clubName: "Ittihad Tanger",
    groupName: "IR Tanger Ultras",
    officialGroupTitle: "Ultras Hercules 2007",
    founded: 2007,
    colors: ["#003399", "#FFFFFF"],
    bannerEmoji: "💙🤍🌊",
    chants: [
      "عروس الشمال زرقا وبيضا.. طنجة العالية برجالها!",
      "هيركوليس فالبوغاز.. الفوز ولا شيء غير الفوز!",
    ],
    leaderUsername: "ir_tanger_ultras",
    leaderDisplayName: "IR Tanger Ultras 💙🤍",
    avatarSeed: "hercules",
    tone: "MILITANT",
  },
  "ir tanger": {
    clubName: "IR Tanger",
    groupName: "IR Tanger Ultras",
    officialGroupTitle: "Ultras Hercules 2007",
    founded: 2007,
    colors: ["#003399", "#FFFFFF"],
    bannerEmoji: "💙🤍🌊",
    chants: [
      "عروس الشمال زرقا وبيضا.. طنجة العالية برجالها!",
      "هيركوليس فالبوغاز.. الفوز ولا شيء غير الفوز!",
    ],
    leaderUsername: "ir_tanger_ultras",
    leaderDisplayName: "IR Tanger Ultras 💙🤍",
    avatarSeed: "hercules",
    tone: "MILITANT",
  },
  "rs berkane": {
    clubName: "RS Berkane",
    groupName: "RS Berkane Ultras",
    officialGroupTitle: "Ultras Orange Boys 2007",
    founded: 2007,
    colors: ["#FF6600", "#000000"],
    bannerEmoji: "🧡🖤🍊",
    chants: [
      "البرتقالي فإفريقيا والمغرب مرعب الخصوم!",
      "ولاد الشرق والبرتقال.. الهمة والشان والانتصار!",
    ],
    leaderUsername: "rs_berkane_ultras",
    leaderDisplayName: "RS Berkane Ultras 🧡🖤",
    avatarSeed: "orangeboys",
    tone: "LOYAL",
  },
  "hassania agadir": {
    clubName: "Hassania Agadir",
    groupName: "Hassania Agadir Ultras",
    officialGroupTitle: "Ultras Imazighen 2006",
    founded: 2006,
    colors: ["#ED1C24", "#FFFFFF"],
    bannerEmoji: "🔴⚪ⵣ",
    chants: [
      "سوس العالمة حمرة وبيضا.. إمازيغن فالقلب والدم!",
      "غزالة سوس فالقمة.. الرجولة والشهامة الأمازيغية!",
    ],
    leaderUsername: "hassania_agadir_ultras",
    leaderDisplayName: "Hassania Agadir Ultras 🔴⚪",
    avatarSeed: "imazighen",
    tone: "PROUD",
  },
  "fus rabat": {
    clubName: "FUS Rabat",
    groupName: "FUS Rabat Ultras",
    officialGroupTitle: "Ultras Capital Boys 2007",
    founded: 2007,
    colors: ["#ED1C24", "#FFFFFF"],
    bannerEmoji: "🔴⚪🏰",
    chants: [
      "الفتح الرباطي مدرسة وتاريخ العاصمة!",
      "كابيتال بويز ديما فالموعد!",
    ],
    leaderUsername: "fus_rabat_ultras",
    leaderDisplayName: "FUS Rabat Ultras 🔴⚪",
    avatarSeed: "capitalboys",
    tone: "LOYAL",
  },
  "moghreb tetouan": {
    clubName: "Moghreb Tetouan",
    groupName: "MAT Tetouan Ultras",
    officialGroupTitle: "Ultras Los Matadores 2005 & Siempre Paloma",
    founded: 2005,
    colors: ["#ED1C24", "#003399", "#FFFFFF"],
    bannerEmoji: "🔴⚪🕊️",
    chants: [
      "الحمامة البيضاء فالشمال ما كترضى بغير الصدارة!",
      "ماتادوريس وسيمبري بالوما فكل ديبلاسمون حاضرين!",
    ],
    leaderUsername: "mat_tetouan_ultras",
    leaderDisplayName: "MAT Tetouan Ultras 🔴🕊️",
    avatarSeed: "matadores",
    tone: "PASSIONATE",
  },
  "olympic safi": {
    clubName: "Olympic Safi",
    groupName: "Olympic Safi Ultras",
    officialGroupTitle: "Ultras Shark 2006",
    founded: 2006,
    colors: ["#003399", "#ED1C24"],
    bannerEmoji: "💙🔴🦈",
    chants: [
      "قروش المحيط.. حاضرة المحيط تضرب بقوة!",
      "شارك فالمدرج يرعب كاع الخصوم!",
    ],
    leaderUsername: "olympic_safi_ultras",
    leaderDisplayName: "Olympic Safi Ultras 🦈💙",
    avatarSeed: "shark",
    tone: "MILITANT",
  },
};

/**
 * Returns the authentic Ultras metadata for any club name.
 * Generates an automatic dynamic Ultras group if custom or unlisted.
 */
export function getClubUltras(clubName: string): UltrasGroup {
  const clean = clubName.toLowerCase().trim();

  for (const [key, ultras] of Object.entries(KNOWN_ULTRAS_GROUPS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return ultras;
    }
  }

  // Dynamic fallback for custom admin clubs
  const slug = clean.replace(/[^a-z0-9]/g, "_");
  return {
    clubName,
    groupName: `${clubName} Ultras`,
    officialGroupTitle: `Ultras ${clubName} Legion`,
    founded: 2020,
    colors: ["#D4AF37", "#111111"],
    bannerEmoji: "⚡🛡️",
    chants: [
      `ديما ${clubName}! الروح والقتالية حتى آخر دقيقة!`,
      `جمهور ${clubName} الوفي ورا الفريق فكل ماتش!`,
    ],
    leaderUsername: `${slug || "club"}_ultras`,
    leaderDisplayName: `${clubName} Ultras ⚡`,
    avatarSeed: slug || "fans",
    tone: "PASSIONATE",
  };
}
