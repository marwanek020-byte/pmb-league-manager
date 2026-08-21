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
  preferredLanguage?: "AR" | "EN" | "FR" | "ES";
  aliases?: string[];
  rivals?: string[];
  nickname?: string;
}

export const KNOWN_ULTRAS_GROUPS: Record<string, UltrasGroup> = {
  // ── MOROCCAN BOTOLA PRO CLUBS ─────────────────────────────────────────────
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
    preferredLanguage: "AR",
    nickname: "زعيم العاصمة",
    aliases: ["far", "far rabat", "as far", "asfar", "askary", "black army", "الجيش الملكي", "الجيش", "الزعيم", "العسكر", "عساكر", "فار رباط", "زعيم العاصمة"],
    rivals: ["raja casablanca", "wydad ac", "fus rabat", "maghreb de fes"],
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
    preferredLanguage: "AR",
    nickname: "النسور الخضر",
    aliases: ["raja", "raja casablanca", "rca", "green boys", "eagles", "الرجاء", "الرجاء البيضاوي", "الخضرة", "النسور", "الماغانا", "كورفا سود"],
    rivals: ["wydad ac", "far rabat", "maghreb de fes"],
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
    preferredLanguage: "AR",
    nickname: "وداد الأمة",
    aliases: ["wydad", "wydad ac", "wac", "winners", "الوداد", "الوداد البيضاوي", "الوداد الرياضي", "الحمرا", "وداد الأمة", "كورفا نورد"],
    rivals: ["raja casablanca", "far rabat"],
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
    preferredLanguage: "AR",
    nickname: "النمور الصفر",
    aliases: ["mas", "mas fes", "maghreb de fes", "maghreb fes", "fatal tigers", "الماص", "المغرب الفاسي", "الفاسي", "النمور الصفر"],
    rivals: ["far rabat", "raja casablanca"],
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
    preferredLanguage: "AR",
    nickname: "النمور الصفر",
    aliases: ["mas", "mas fes", "fatal tigers", "الماص", "المغرب الفاسي"],
    rivals: ["far rabat", "raja casablanca"],
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
    preferredLanguage: "AR",
    nickname: "فرسان البوغاز",
    aliases: ["irt", "ir tanger", "ittihad tanger", "hercules", "اتحاد طنجة", "طنجة", "هيركوليس", "فرسان البوغاز"],
    rivals: ["moghreb tetouan"],
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
    preferredLanguage: "AR",
    nickname: "فرسان البوغاز",
    aliases: ["irt", "ir tanger", "ittihad tanger", "اتحاد طنجة", "طنجة"],
    rivals: ["moghreb tetouan"],
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
    preferredLanguage: "AR",
    nickname: "فرسان الشرق",
    aliases: ["rsb", "rs berkane", "orange boys", "نهضة بركان", "بركان", "البركانيين", "أورانج بويز"],
    rivals: ["mouloudia oujda", "raja casablanca"],
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
    preferredLanguage: "AR",
    nickname: "غزالة سوس",
    aliases: ["husa", "hassania agadir", "imazighen", "حسنية أكادير", "أكادير", "إمازيغن", "غزالة سوس"],
    rivals: ["kawkab marrakech"],
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
    preferredLanguage: "AR",
    nickname: "الفتح الرياضي",
    aliases: ["fus", "fus rabat", "capital boys", "الفتح الرباطي", "الفتح", "الفتح الرياضي"],
    rivals: ["far rabat"],
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
    preferredLanguage: "AR",
    nickname: "الحمامة البيضاء",
    aliases: ["mat", "mat tetouan", "moghreb tetouan", "tetouan", "los matadores", "المغرب التطواني", "تطوان", "الحمامة البيضاء", "تطواني"],
    rivals: ["ittihad tanger"],
  },
  "union touarga": {
    clubName: "Union Touarga",
    groupName: "Union Touarga Ultras",
    officialGroupTitle: "Ultras Touarga Sons 2018",
    founded: 2018,
    colors: ["#FDB913", "#002B49"],
    bannerEmoji: "🟡🔵⚡",
    chants: [
      "تواركة العاصمة.. شباب التحدي والعزيمة!",
      "الصفرا والزرقا فالميدان برجالها!",
    ],
    leaderUsername: "union_touarga_ultras",
    leaderDisplayName: "Union Touarga Ultras 🟡🔵",
    avatarSeed: "touarga",
    tone: "PROUD",
    preferredLanguage: "AR",
    nickname: "فرسان تواركة",
    aliases: ["touarga", "union touarga", "uts", "uts rabat", "تواركة", "اتحاد تواركة", "تواركا", "اتحاد يعقوب المنصور"],
    rivals: ["far rabat", "fus rabat"],
  },
  "uts rabat": {
    clubName: "Union Touarga",
    groupName: "Union Touarga Ultras",
    officialGroupTitle: "Ultras Touarga Sons 2018",
    founded: 2018,
    colors: ["#FDB913", "#002B49"],
    bannerEmoji: "🟡🔵⚡",
    chants: [
      "تواركة العاصمة.. شباب التحدي والعزيمة!",
      "الصفرا والزرقا فالميدان برجالها!",
    ],
    leaderUsername: "union_touarga_ultras",
    leaderDisplayName: "Union Touarga Ultras 🟡🔵",
    avatarSeed: "touarga",
    tone: "PROUD",
    preferredLanguage: "AR",
    nickname: "فرسان تواركة",
    aliases: ["touarga", "union touarga", "uts", "uts rabat", "تواركة", "اتحاد تواركة"],
    rivals: ["far rabat", "fus rabat"],
  },
  "olympiquede safi": {
    clubName: "Olympique Safi",
    groupName: "OCS Safi Ultras",
    officialGroupTitle: "Ultras Shark 2006",
    founded: 2006,
    colors: ["#003399", "#ED1C24"],
    bannerEmoji: "💙🔴🦈",
    chants: [
      "القرش المسفيوي فالمحيط حاكم بأحكامو!",
      "التراس شارك.. وفاء أبدي للمدينة الزرقا!",
    ],
    leaderUsername: "ocs_safi_ultras",
    leaderDisplayName: "OCS Safi Ultras 🦈💙",
    avatarSeed: "shark",
    tone: "MILITANT",
    preferredLanguage: "AR",
    nickname: "القرش المسفيوي",
    aliases: ["ocs", "safi", "olympique safi", "olympiquede safi", "shark", "اولمبيك اسفي", "أولمبيك آسفي", "اسفي", "آسفي", "القرش المسفيوي"],
    rivals: ["raja casablanca", "hassania agadir"],
  },
  "chabab mohammedia": {
    clubName: "Chabab Mohammedia",
    groupName: "SCCM Ultras",
    officialGroupTitle: "Ultras Red Stars 2008",
    founded: 2008,
    colors: ["#ED1C24", "#000000"],
    bannerEmoji: "🔴🖤⭐",
    chants: ["شباب المحمدية مدينة الزهور والبطولات!"],
    leaderUsername: "sccm_ultras",
    leaderDisplayName: "SCCM Ultras 🔴🖤",
    avatarSeed: "sccm",
    tone: "LOYAL",
    preferredLanguage: "AR",
    nickname: "مدينة الزهور",
    aliases: ["sccm", "chabab mohammedia", "mohammedia", "شباب المحمدية", "المحمدية"],
    rivals: ["raja casablanca", "wydad ac"],
  },
  "codm meknes": {
    clubName: "CODM Meknes",
    groupName: "CODM Meknes Ultras",
    officialGroupTitle: "Ultras Red Men 2008",
    founded: 2008,
    colors: ["#ED1C24", "#FFFFFF"],
    bannerEmoji: "🔴⚪⚔️",
    chants: ["الكوديم فالعاصمة الإسماعيلية تاريخ لا يموت!"],
    leaderUsername: "codm_ultras",
    leaderDisplayName: "CODM Meknes Ultras 🔴⚪",
    avatarSeed: "codm",
    tone: "MILITANT",
    preferredLanguage: "AR",
    nickname: "فرسان الإسماعيلية",
    aliases: ["codm", "codm meknes", "meknes", "الكوديم", "مكناس", "النادي المكناسي"],
    rivals: ["maghreb de fes"],
  },
  "difaa el jadidi": {
    clubName: "Difaâ El Jadidi",
    groupName: "DHJ Ultras",
    officialGroupTitle: "Ultras Cap Soleil 2007",
    founded: 2007,
    colors: ["#005A36", "#FFFFFF"],
    bannerEmoji: "💚🤍☀️",
    chants: ["فدائيو دكالة.. الدفاع الجديدي ديما فالعلالي!"],
    leaderUsername: "dhj_ultras",
    leaderDisplayName: "DHJ Ultras 💚🤍",
    avatarSeed: "dhj",
    tone: "PASSIONATE",
    preferredLanguage: "AR",
    nickname: "فرسان دكالة",
    aliases: ["dhj", "difaa el jadidi", "jadidi", "الدفاع الحسني الجديدي", "الجديدة", "دكالة"],
    rivals: ["olympiquede safi", "raja casablanca"],
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
    preferredLanguage: "AR",
    nickname: "قروش المحيط",
    aliases: ["ocs", "olympic safi", "olympique safi", "shark", "أولمبيك آسفي", "آسفي", "قروش المحيط"],
    rivals: ["raja casablanca", "far rabat"],
  },

  // ── PREMIER LEAGUE & INTERNATIONAL CLUBS ──────────────────────────────────
  "west ham united": {
    clubName: "West Ham United",
    groupName: "West Ham United Ultras",
    officialGroupTitle: "The Iron Army & Claret and Blue 1895",
    founded: 1895,
    colors: ["#7A263A", "#1BB1E7", "#F3D459"],
    bannerEmoji: "⚒️🍷🫧",
    chants: [
      "I'm forever blowing bubbles, pretty bubbles in the air! 🫧⚒️",
      "Come on you Irons! East London pride and passion!",
      "West Ham till I die! Claret and Blue through and through!",
    ],
    leaderUsername: "west_ham_ultras",
    leaderDisplayName: "West Ham Ultras ⚒️🫧",
    avatarSeed: "hammers",
    tone: "PASSIONATE",
    preferredLanguage: "EN",
    nickname: "The Hammers",
    aliases: ["west ham", "westham", "west ham united", "hammers", "irons", "the hammers", "ويستهام", "وست هام", "الهامرز", "وست هام يونايتد"],
    rivals: ["chelsea", "tottenham", "millwall", "arsenal"],
  },
  "west ham": {
    clubName: "West Ham United",
    groupName: "West Ham United Ultras",
    officialGroupTitle: "The Iron Army & Claret and Blue 1895",
    founded: 1895,
    colors: ["#7A263A", "#1BB1E7", "#F3D459"],
    bannerEmoji: "⚒️🍷🫧",
    chants: [
      "I'm forever blowing bubbles, pretty bubbles in the air! 🫧⚒️",
      "Come on you Irons! East London pride and passion!",
      "West Ham till I die! Claret and Blue through and through!",
    ],
    leaderUsername: "west_ham_ultras",
    leaderDisplayName: "West Ham Ultras ⚒️🫧",
    avatarSeed: "hammers",
    tone: "PASSIONATE",
    preferredLanguage: "EN",
    nickname: "The Hammers",
    aliases: ["west ham", "westham", "west ham united", "hammers", "irons", "ويستهام", "وست هام"],
    rivals: ["chelsea", "tottenham", "millwall", "arsenal"],
  },
  "arsenal": {
    clubName: "Arsenal",
    groupName: "Arsenal Ultras",
    officialGroupTitle: "RedAction & Ashburton Army 1886",
    founded: 1886,
    colors: ["#EF0107", "#063672", "#FFFFFF"],
    bannerEmoji: "🔴⚪💣",
    chants: [
      "North London forever, whatever the weather, these streets are our own!",
      "And it's Arsenal, Arsenal FC, by far the greatest team the world has ever seen!",
      "Come on you Gunners! Victoria Concordia Crescit!",
    ],
    leaderUsername: "arsenal_ultras",
    leaderDisplayName: "Arsenal Ultras 🔴💣",
    avatarSeed: "gunners",
    tone: "PASSIONATE",
    preferredLanguage: "EN",
    nickname: "The Gunners",
    aliases: ["arsenal", "arsenal fc", "gunners", "the gunners", "أرسنال", "ارسنال", "الغانرز"],
    rivals: ["tottenham", "chelsea", "manchester united"],
  },
  "chelsea": {
    clubName: "Chelsea FC",
    groupName: "Chelsea Ultras",
    officialGroupTitle: "Shed End & Blue Army 1905",
    founded: 1905,
    colors: ["#034694", "#EE242C", "#FFFFFF"],
    bannerEmoji: "🔵🦁💙",
    chants: [
      "Blue is the colour, football is the game!",
      "Carefree, wherever you may be, we are the famous CFC!",
      "Keep the blue flag flying high!",
    ],
    leaderUsername: "chelsea_ultras",
    leaderDisplayName: "Chelsea Ultras 🔵🦁",
    avatarSeed: "chelsea",
    tone: "PASSIONATE",
    preferredLanguage: "EN",
    nickname: "The Blues",
    aliases: ["chelsea", "chelsea fc", "blues", "the blues", "تشيلسي", "البلوز"],
    rivals: ["tottenham", "arsenal", "west ham", "fulham"],
  },
  "liverpool": {
    clubName: "Liverpool FC",
    groupName: "Liverpool Ultras",
    officialGroupTitle: "Spion Kop 1906 & Spirit of Shankly",
    founded: 1892,
    colors: ["#C8102E", "#00B2A9", "#F6EB61"],
    bannerEmoji: "🔴🦅🔥",
    chants: [
      "You'll Never Walk Alone! Hold your head up high!",
      "Allez Allez Allez! We've conquered all of Europe, we're never gonna stop!",
      "Fields of Anfield Road, where once was Sean Fallon and Shankly!",
    ],
    leaderUsername: "liverpool_ultras",
    leaderDisplayName: "Liverpool Ultras 🔴🦅",
    avatarSeed: "liverpool",
    tone: "LOYAL",
    preferredLanguage: "EN",
    nickname: "The Reds",
    aliases: ["liverpool", "liverpool fc", "the reds", "kopites", "lfc", "ليفربول", "الريدز"],
    rivals: ["manchester united", "everton", "manchester city"],
  },
  "manchester united": {
    clubName: "Manchester United",
    groupName: "Man United Ultras",
    officialGroupTitle: "Red Devils & The Red Army 1878",
    founded: 1878,
    colors: ["#DA291C", "#FBE122", "#000000"],
    bannerEmoji: "🔴👹⚡",
    chants: [
      "Glory Glory Man United, as the reds go marching on on on!",
      "Take me home, United road, to the place I belong, to Old Trafford!",
    ],
    leaderUsername: "man_united_ultras",
    leaderDisplayName: "Man United Ultras 🔴👹",
    avatarSeed: "manunited",
    tone: "PROUD",
    preferredLanguage: "EN",
    nickname: "The Red Devils",
    aliases: ["manchester united", "man united", "man utd", "red devils", "mufc", "مانشستر يونايتد", "اليونايتد", "الشياطين الحمر"],
    rivals: ["manchester city", "liverpool", "arsenal", "leeds"],
  },
  "manchester city": {
    clubName: "Manchester City",
    groupName: "Man City Ultras",
    officialGroupTitle: "Cityzens 1894 Group",
    founded: 1894,
    colors: ["#6CABDD", "#1C2C5B", "#FFFFFF"],
    bannerEmoji: "💙🤍🦈",
    chants: [
      "Blue Moon, you saw me standing alone without a dream in my heart!",
      "City, City, the best team in the land and all the world!",
    ],
    leaderUsername: "man_city_ultras",
    leaderDisplayName: "Man City Ultras 💙🦈",
    avatarSeed: "mancity",
    tone: "PROUD",
    preferredLanguage: "EN",
    nickname: "The Cityzens",
    aliases: ["manchester city", "man city", "cityzens", "mcfc", "مانشستر سيتي", "السيتي"],
    rivals: ["manchester united", "liverpool"],
  },
  "real madrid": {
    clubName: "Real Madrid",
    groupName: "Real Madrid Ultras",
    officialGroupTitle: "Grada Fans RMCF 1902",
    founded: 1902,
    colors: ["#FEBE10", "#00529F", "#FFFFFF"],
    bannerEmoji: "👑⚪⚡",
    chants: [
      "¡Hala Madrid y nada más! ¡Historia que tú hiciste, historia por hacer!",
      "¡Reyes de Europa, campeones una y otra vez!",
      "¡Cómo no te voy a querer, si fuiste campeón de Europa por enésima vez!",
    ],
    leaderUsername: "real_madrid_ultras",
    leaderDisplayName: "Real Madrid Ultras 👑⚪",
    avatarSeed: "realmadrid",
    tone: "PROUD",
    preferredLanguage: "ES",
    nickname: "Los Blancos",
    aliases: ["real madrid", "real madrid cf", "rmcf", "madridistas", "los blancos", "los merengues", "ريال مدريد", "الملكي", "الميرنغي"],
    rivals: ["barcelona", "atletico madrid"],
  },
  "barcelona": {
    clubName: "FC Barcelona",
    groupName: "FC Barcelona Ultras",
    officialGroupTitle: "Penyes FCB & Almogàvers 1899",
    founded: 1899,
    colors: ["#004D98", "#A50044", "#EDBB00"],
    bannerEmoji: "🔵🔴💙❤️",
    chants: [
      "¡Tot el camp és un clam, som la gent blaugrana! ¡Visca el Barça!",
      "¡Un crit valent, tenim un nom que el sap tothom: Barça, Barça, Baaarça!",
    ],
    leaderUsername: "barcelona_ultras",
    leaderDisplayName: "FC Barcelona Ultras 🔵🔴",
    avatarSeed: "barcelona",
    tone: "PASSIONATE",
    preferredLanguage: "ES",
    nickname: "Blaugrana",
    aliases: ["barcelona", "fc barcelona", "barca", "barça", "fcb", "cules", "culers", "blaugrana", "برشلونة", "البارسا", "البلوغرانا"],
    rivals: ["real madrid", "espanyol"],
  },
  "paris saint-germain": {
    clubName: "Paris Saint-Germain",
    groupName: "PSG Ultras",
    officialGroupTitle: "Collectif Ultras Paris (CUP) 1970",
    founded: 1970,
    colors: ["#004170", "#DA291C", "#FFFFFF"],
    bannerEmoji: "🔵🔴🗼",
    chants: [
      "Ô Ville Lumière, sens la chaleur de notre cœur !",
      "Paris est magique ! Ici c'est Paris !",
      "Allez Paris Saint-Germain, tes supporters sont là !",
    ],
    leaderUsername: "psg_ultras",
    leaderDisplayName: "PSG Ultras 🔵🔴🗼",
    avatarSeed: "psg",
    tone: "PASSIONATE",
    preferredLanguage: "FR",
    nickname: "Les Parisiens",
    aliases: ["psg", "paris saint-germain", "paris sg", "paris", "les parisiens", "باريس سان جيرمان", "باريس", "بي اس جي"],
    rivals: ["marseille", "olympique marseille"],
  },
  "bayern munich": {
    clubName: "Bayern Munich",
    groupName: "Bayern Munich Ultras",
    officialGroupTitle: "Schickeria München 2002",
    founded: 1900,
    colors: ["#DC052D", "#0066B2", "#FFFFFF"],
    bannerEmoji: "🔴⚪🦁",
    chants: [
      "Mia San Mia! Stern des Südens, du wirst niemals untergehn!",
      "Super Bayern, Super Bayern, Hey, Hey!",
    ],
    leaderUsername: "bayern_ultras",
    leaderDisplayName: "Bayern Ultras 🔴⚪",
    avatarSeed: "bayern",
    tone: "PROUD",
    preferredLanguage: "EN",
    nickname: "Die Roten",
    aliases: ["bayern", "bayern munich", "fc bayern", "die roten", "بايرن ميونخ", "البافاري", "بايرن"],
    rivals: ["borussia dortmund"],
  },
};

/**
 * Returns the authentic Ultras metadata for any club name.
 * Generates an automatic dynamic Ultras group if custom or unlisted.
 */
export function getClubUltras(clubName: string): UltrasGroup {
  const clean = (clubName || "").toLowerCase().trim();

  // 1. Direct exact or key match
  for (const [key, ultras] of Object.entries(KNOWN_ULTRAS_GROUPS)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return ultras;
    }
  }

  // 2. Check aliases
  for (const ultras of Object.values(KNOWN_ULTRAS_GROUPS)) {
    if (ultras.aliases && ultras.aliases.some((alias) => clean === alias || clean.includes(alias))) {
      return ultras;
    }
  }

  // 3. Dynamic fallback for custom admin clubs
  const slug = clean.replace(/[^a-z0-9]/g, "_");
  const isEnglishOrWestern = /^[a-zA-Z0-9\s._-]+$/.test(clubName);

  if (isEnglishOrWestern) {
    return {
      clubName,
      groupName: `${clubName} Ultras`,
      officialGroupTitle: `Ultras ${clubName} Legion`,
      founded: 2020,
      colors: ["#1E40AF", "#F59E0B"],
      bannerEmoji: "⚡🛡️🔥",
      chants: [
        `We are ${clubName}! Fighting for the badge till the final whistle!`,
        `Always behind ${clubName}! Passion, honor, and victory!`,
      ],
      leaderUsername: `${slug || "club"}_ultras`,
      leaderDisplayName: `${clubName} Ultras ⚡`,
      avatarSeed: slug || "fans",
      tone: "PASSIONATE",
      preferredLanguage: "EN",
      nickname: clubName,
    };
  }

  return {
    clubName,
    groupName: `${clubName} ألتراس`,
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
    preferredLanguage: "AR",
    nickname: clubName,
  };
}

/**
 * Intelligent entity detector to find any club mentioned in a post text.
 * Avoids false positive matches on short common words.
 */
export function findMentionedClubsInText(text: string, currentClubName?: string): UltrasGroup[] {
  if (!text || typeof text !== "string") return [];
  const textLower = text.toLowerCase();
  const currentClubLower = (currentClubName || "").toLowerCase().trim();
  const matched: UltrasGroup[] = [];
  const addedKeys = new Set<string>();

  for (const [key, ultras] of Object.entries(KNOWN_ULTRAS_GROUPS)) {
    if (currentClubLower && (currentClubLower === key || currentClubLower.includes(key) || key.includes(currentClubLower))) {
      continue;
    }

    // Check key with word boundary safety (e.g. avoid matching "far" inside "safari" or "farewell")
    let isMatch = false;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\s|[.,!?;:#@"'()\\[\\]])${escapedKey}($|\\s|[.,!?;:#@"'()\\[\\]])`, "i");
    if (regex.test(textLower)) {
      isMatch = true;
    }

    // Also test aliases safely
    if (!isMatch && ultras.aliases) {
      for (const alias of ultras.aliases) {
        if (alias.length < 3) continue; // Skip very short abbreviations to prevent false positives
        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const aliasRegex = new RegExp(`(^|\\s|[.,!?;:#@"'()\\[\\]])${escapedAlias}($|\\s|[.,!?;:#@"'()\\[\\]])`, "i");
        if (aliasRegex.test(textLower)) {
          isMatch = true;
          break;
        }
      }
    }

    if (isMatch && !addedKeys.has(ultras.clubName)) {
      addedKeys.add(ultras.clubName);
      matched.push(ultras);
    }
  }

  return matched;
}

