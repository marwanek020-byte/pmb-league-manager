import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClubUltras } from "@/lib/services/ultras-registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, tone, language = "AR", customNote } = await req.json();

    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      include: {
        league: true,
        players: { where: { status: "REGISTERED" }, take: 10 },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const ultras = getClubUltras(club.name);
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

    // Template Fallback Generator
    const generateTemplate = () => {
      if (language === "AR") {
        switch (topic) {
          case "DERBY_HYPE":
            return `🚨 **نداء الكورفا والمدرب قبل قمة الجولة** ⚔️\n\n` +
              `الماتش الجاي ماشي مجرد 3 نقاط.. هادي مسألة شرف وكبرياء! اللاعبين واجدين بدنياً وتكتيكياً ومستعدين يحطو كاع ما عندهم فالتيران.\n\n` +
              `${ultras.chants[0]}\n` +
              `كنتسناو الدعم والتشجيع الحار من الدقيقة الأولى حتى صافرة النهاية! 90 دقيقة من القتالية! ${ultras.bannerEmoji}\n\n` +
              `#ديما_${club.name.replace(/\s+/g, "_")} #القمة #القتالية`;

          case "VICTORY":
            return `🏆 **3 نقاط غالية وعمل جماعي كبير!** 🔥\n\n` +
              `هنيئاً لكاع اللاعبين على الروح العالية والانضباط التكتيكي اليوم فالتيران. فوز مستحق كيهديه الفريق لكاع الجماهير الوفية اللي سانداتنا.\n\n` +
              `الخدمة مازال مستمرة والتركيز دابا كامل على التحديات الجاية! القادم أفضل إن شاء الله. ${ultras.bannerEmoji}\n\n` +
              `#ديما_${club.name.replace(/\s+/g, "_")} #انتصار #عمل_جماعي`;

          case "NEW_SIGNING":
            return `✍️ **مرحباً بك في قلعة ${club.name}!** 🌟\n\n` +
              `سعداء جداً بالإعلان عن تعزيز صفوف الفريق بصفقة مميزة غاتعطي إضافة كبيرة للمجموعة.\n` +
              `اللاعب جاهز للدفاع على ألوان النادي وتقديم الإضافة المرجوة. نتمناو ليه مسيرة عامرة بالألقاب والانتصارات! ${ultras.bannerEmoji}\n\n` +
              `#ميركاتو #تعاقد_جديد #${club.name.replace(/\s+/g, "")}`;

          case "BOUNCE_BACK":
            return `💬 **رسالة المدرب للجماهير الوفية** 🛡️\n\n` +
              `النتيجة الأخيرة ماكانتش فالمستوى اللي كنطمحو ليه والمسؤولية كتحملوها كاملين. خدينا الدروس اللازمة والخدمة غاتضاعف فالتمارين.\n` +
              `كنوعدو الكورفا بردة فعل قوية ورجولية فالماتش الجاي. بالدعم ديالكم غانرجعو أقوى! ${ultras.bannerEmoji}\n\n` +
              `#العودة_بقوة #ديما_${club.name.replace(/\s+/g, "_")}`;

          default:
            return `⚽ **رسالة من الطاقم التقني لنادي ${club.name}**\n\n` +
              `التركيز والعمل الجاد هما مفتاح النجاح. المجموعة متماسكة وعازمة على تحقيق أهداف النادي وإسعاد الجماهير الوفية! ${ultras.bannerEmoji}\n\n` +
              `#ديما_${club.name.replace(/\s+/g, "_")}`;
        }
      } else if (language === "FR") {
        switch (topic) {
          case "DERBY_HYPE":
            return `🚨 **FOCUS SUR LE CHOC DU WEEK-END !** ⚔️\n\n` +
              `Une rencontre capitale nous attend. Les joueurs sont prêts tactiquement et physiquement pour livrer un combat total sur la pelouse.\n\n` +
              `Nous comptons sur l'énergie légendaire de nos supporters pour pousser l'équipe vers la victoire ! ${ultras.bannerEmoji}\n\n` +
              `#Allez${club.name.replace(/\s+/g, "")} #TeamSpirit`;

          case "VICTORY":
            return `🏆 **VICTOIRE IMPORTANTE & 3 POINTS EN POCHE !** 🔥\n\n` +
              `Félicitations à tout le groupe pour la discipline et la combativité affichées aujourd'hui. Un succès dédié à tous nos supporters !\n\n` +
              `Le travail continue dès demain pour préparer la suite. ${ultras.bannerEmoji}\n\n` +
              `#MatchdayVictory #${club.name.replace(/\s+/g, "")}`;

          default:
            return `⚽ **Message du Manager — ${club.name}**\n\n` +
              `Le travail acharné et la cohésion du groupe restent nos priorités. Ensemble vers nos objectifs ! ${ultras.bannerEmoji}`;
        }
      } else {
        // English
        switch (topic) {
          case "DERBY_HYPE":
            return `🚨 **MATCHDAY CLASH ON THE HORIZON!** ⚔️\n\n` +
              `We are fully locked in and tactically prepared for this crucial battle. Every player knows what this badge means.\n\n` +
              `We need the full support of our ultras from minute 1 to 90! Let's get the 3 points! ${ultras.bannerEmoji}\n\n` +
              `#${club.name.replace(/\s+/g, "")} #Matchday`;

          case "VICTORY":
            return `🏆 **BIG WIN & 3 CRUCIAL POINTS!** 🔥\n\n` +
              `Huge credit to the entire squad for the tactical discipline and heart on the pitch today. This victory is for our incredible fans!\n\n` +
              `Heads down, we focus immediately on the next challenge. ${ultras.bannerEmoji}\n\n` +
              `#Victory #${club.name.replace(/\s+/g, "")}`;

          default:
            return `⚽ **Manager Update — ${club.name}**\n\n` +
              `Total dedication and hard work every day. We keep fighting for our colors! ${ultras.bannerEmoji}`;
        }
      }
    };

    // If Gemini is available, generate a tailored prompt
    if (geminiApiKey) {
      const candidateModels = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-flash",
        "gemini-1.5-pro",
      ];

      const langInstruction =
        language === "AR"
          ? "Write in authentic Moroccan Football Darija/Arabic with strong passion, football terms, and hashtags."
          : language === "FR"
          ? "Write in professional, passionate French football press style."
          : "Write in modern English football social media style.";

      const prompt = `You are the Social Media & Press Officer of "${club.name}" in PMB League.
Ultras Group: ${ultras.groupName} (${ultras.bannerEmoji}).
Topic: "${topic}". Tone: "${tone || "PASSIONATE"}".
${customNote ? `Additional details to include: "${customNote}"` : ""}

Draft a high-impact, engaging club post with emojis, chants, and relevant hashtags.
${langInstruction}
Keep it punchy (between 50 and 120 words).`;

      for (const modelName of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.75, maxOutputTokens: 512 },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const generated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (generated && generated.trim()) {
              return NextResponse.json({ draftedContent: generated.trim() });
            }
          }
        } catch (geminiErr) {
          console.warn(`[SocialAIDraft] Gemini model ${modelName} failed, trying next model...`);
        }
      }
    }

    return NextResponse.json({ draftedContent: generateTemplate() });
  } catch (error: any) {
    console.error("Failed to draft social post:", error);
    return NextResponse.json({ error: "Failed to draft post" }, { status: 500 });
  }
}
