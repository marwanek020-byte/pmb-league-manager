import { prisma } from "@/lib/prisma";
import { getClubUltras } from "@/lib/services/ultras-registry";

/**
 * Service to manage AI Ultras, Social Media Breaking News,
 * Post-Match Reports, Direct Manager Messages, and Morale calculation.
 */
export class UltrasSocialService {
  /**
   * Helper to ensure an AI Ultras/Media bot user exists in the database
   */
  private static async getOrCreateBotUser(username: string, roleName = "ADMINISTRATOR"): Promise<string> {
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existing) return existing.id;

    const created = await prisma.user.create({
      data: {
        username,
        password: "AI_BOT_INTERNAL_SECURE_PASSWORD",
        role: roleName as any,
      },
      select: { id: true },
    });

    return created.id;
  }

  /**
   * 1. ⚽ AUTOMATIC POST-MATCH REPORT & ULTRAS INTERACTIONS
   */
  public static async publishPostMatchReport(matchId: string) {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          homeClub: { include: { manager: true } },
          awayClub: { include: { manager: true } },
          league: true,
          season: { include: { competitionSeason: true } },
          manOfTheMatch: true,
          events: {
            include: {
              player: { select: { fullName: true, position: true } },
              assistPlayer: { select: { fullName: true, position: true } },
            },
            orderBy: { minute: "asc" },
          },
        },
      });

      if (!match || match.status !== "COMPLETED") return;

      const homeUltras = getClubUltras(match.homeClub.name);
      const awayUltras = getClubUltras(match.awayClub.name);
      const mediaBotId = await this.getOrCreateBotUser("pmb_sports_media", "ADMINISTRATOR");

      const homeScore = match.homeGoals ?? 0;
      const awayScore = match.awayGoals ?? 0;

      // Extract Goals & Scorers
      const homeGoals = match.events.filter((e) => e.clubId === match.homeClub.id && e.type === "GOAL");
      const awayGoals = match.events.filter((e) => e.clubId === match.awayClub.id && e.type === "GOAL");

      const formatScorers = (events: typeof homeGoals) => {
        if (events.length === 0) return "—";
        return events
          .map((e) => `⚽ ${e.player.fullName} ${e.minute ? `(${e.minute}')` : ""}${e.assistPlayer ? ` [👟 ${e.assistPlayer.fullName}]` : ""}`)
          .join(", ");
      };

      // Determine Winner Tag
      let matchVerdict = "تعادل مثير وتقاسم النقاط 🤝";
      let tag: "VICTORY" | "STATEMENT" = "STATEMENT";

      if (homeScore > awayScore) {
        matchVerdict = `فوز مستحق لنادي ${match.homeClub.name} بثلاث نقاط غالية! 🔥`;
        tag = "VICTORY";
      } else if (awayScore > homeScore) {
        matchVerdict = `انتصار ثمين لنادي ${match.awayClub.name} خارج الديار! ✈️🔥`;
        tag = "VICTORY";
      }

      // Build Rich Post Content
      const postContent = `🚨 **نهاية المباراة | FULL TIME** ⚽
━━━━━━━━━━━━━━━━━━━━
🏆 **${match.league.name}** — الجولة ${match.matchday}
🏟️ **${match.homeClub.name}** ${homeScore} - ${awayScore} **${match.awayClub.name}**

${matchVerdict}

📊 **سجل الأهداف**:
• 🏠 ${match.homeClub.name}: ${formatScorers(homeGoals)}
• ✈️ ${match.awayClub.name}: ${formatScorers(awayGoals)}
${match.manOfTheMatch ? `\n⭐ **رجل المباراة (MOTM)**: **${match.manOfTheMatch.fullName}** (\`${match.manOfTheMatch.position.toUpperCase()}\`)` : ""}

#PMBLeague #${match.homeClub.name.replace(/\s+/g, "")} #${match.awayClub.name.replace(/\s+/g, "")}`;

      // Create Official Post
      const createdPost = await prisma.post.create({
        data: {
          content: postContent,
          tag,
          userId: mediaBotId,
          clubId: match.homeClub.id,
        },
      });

      // 2. Simulate AI Ultras Comments Under Post
      const homeUltrasBotId = await this.getOrCreateBotUser(homeUltras.leaderUsername);
      const awayUltrasBotId = await this.getOrCreateBotUser(awayUltras.leaderUsername);

      const commentsToCreate: Array<{ userId: string; clubId: string; content: string }> = [];

      if (homeScore > awayScore) {
        // Home Win Comments
        commentsToCreate.push({
          userId: homeUltrasBotId,
          clubId: match.homeClub.id,
          content: `${homeUltras.bannerEmoji} ${homeUltras.chants[0]} برافو للرجال.. 3 نقاط مهمة ومكملين فطريق البطولة! 💚🖤`,
        });
        commentsToCreate.push({
          userId: awayUltrasBotId,
          clubId: match.awayClub.id,
          content: `${awayUltras.bannerEmoji} هاد الهزيمة غير مقبولة تماماً! المدرب خاصو يتحمل المسؤولية ويصلح الدفاع قبل ما يفوت الفوت! 😤`,
        });
      } else if (awayScore > homeScore) {
        // Away Win Comments
        commentsToCreate.push({
          userId: awayUltrasBotId,
          clubId: match.awayClub.id,
          content: `${awayUltras.bannerEmoji} ديبلاسمون تاريخي ورجوع بـ 3 نقاط من قلب الميدان! العز للفرقة وللكوتش! ✈️🔥`,
        });
        commentsToCreate.push({
          userId: homeUltrasBotId,
          clubId: match.homeClub.id,
          content: `${homeUltras.bannerEmoji} خسارة قاصحة فبلادنا.. القميص عندو هيبة وخاص القتالية 90 دقيقة ماشي البرود فالتيران!`,
        });
      } else {
        // Draw Comments
        commentsToCreate.push({
          userId: homeUltrasBotId,
          clubId: match.homeClub.id,
          content: `${homeUltras.bannerEmoji} نقطة أحسن من والو ولكن كنا نستحقو نربحو.. الماتش الجاي ما كاين غير الفوز!`,
        });
        commentsToCreate.push({
          userId: awayUltrasBotId,
          clubId: match.awayClub.id,
          content: `${awayUltras.bannerEmoji} نقطة مزيانة خارج الميدان.. القتالية كانت حاضرة ونتمناو نواصلو بنفس الروح!`,
        });
      }

      for (const comment of commentsToCreate) {
        await prisma.postComment.create({
          data: {
            postId: createdPost.id,
            userId: comment.userId,
            clubId: comment.clubId,
            content: comment.content,
          },
        });
      }

      // 3. Send Direct Messages from Ultras to Both Managers
      await this.sendUltrasMatchDirectMessages(match, homeUltras, awayUltras, homeScore, awayScore);
    } catch (err) {
      console.error("[UltrasSocialService] Failed to publish post-match report:", err);
    }
  }

  /**
   * 2. 📩 DIRECT IN-GAME MESSAGES FROM ULTRAS TO MANAGERS
   */
  private static async sendUltrasMatchDirectMessages(
    match: any,
    homeUltras: any,
    awayUltras: any,
    homeScore: number,
    awayScore: number
  ) {
    try {
      const homeUltrasBotId = await this.getOrCreateBotUser(homeUltras.leaderUsername);
      const awayUltrasBotId = await this.getOrCreateBotUser(awayUltras.leaderUsername);

      // A. Message to Home Manager
      if (match.homeClub.manager) {
        let homeMsg = "";
        if (homeScore > awayScore) {
          homeMsg = `سلام كوتش ${match.homeClub.manager.username} 👑\n\n` +
            `الله يعطيكم الصحة على الماتش ديال اليوم! 3 نقاط مستحقة وفرحتو الكورفا كاملة.. ${homeUltras.chants[0]}\n` +
            `واصل بنفس الروح وحنا فظهرك ديما! ${homeUltras.bannerEmoji}`;
        } else if (homeScore < awayScore) {
          homeMsg = `كوتش ${match.homeClub.manager.username}.. الكورفا مقلقة بزاف من مستوى اليوم! ⚠️\n\n` +
            `مايمكنش نخسرو بهاد الطريقة فميداننا.. الدفاع كان فيه ارتباك كبير والهجوم كان غايب! راجع الخطة ديالك قبل الماتش الجاي راه الجمهور ماكيرحمش فالاستهتار!`;
        } else {
          homeMsg = `سلام كوتش.. ماتش كان صعيب وتقاسمنا النقاط. ضيعنا فرص الفوز ولكن القتالية كانت مقبولة. الماتش الجاي خاصنا 3 نقاط لا بديل عنها! ${homeUltras.bannerEmoji}`;
        }

        await prisma.directMessage.create({
          data: {
            senderId: homeUltrasBotId,
            receiverId: match.homeClub.manager.id,
            content: homeMsg,
          },
        });
      }

      // B. Message to Away Manager
      if (match.awayClub.manager) {
        let awayMsg = "";
        if (awayScore > homeScore) {
          awayMsg = `برافو يا كوتش ${match.awayClub.manager.username}! 🔥\n\n` +
            `رجعتو بـ 3 نقاط غالية من خارج الديار ولعبتو برجولة.. الكورفا كتشكرك على التكتيك العالي اليوم! ${awayUltras.chants[0]} ${awayUltras.bannerEmoji}`;
        } else if (awayScore < homeScore) {
          awayMsg = `كوتش ${match.awayClub.manager.username}، هاد الهزيمة خارج الميدان قاصحة! 🚨\n\n` +
            `الجمهور اللي دار الديبلاسمون كان يستحق يشوف قتالية أكبر. خاصك تخدم على توازن الفريق فالخرجات الجاية!`;
        } else {
          awayMsg = `نقطة إيجابية خارج الميدان يا كوتش.. شكراً على المجهود والتركيز دابا على الماتش الجاي فبلادنا! ${awayUltras.bannerEmoji}`;
        }

        await prisma.directMessage.create({
          data: {
            senderId: awayUltrasBotId,
            receiverId: match.awayClub.manager.id,
            content: awayMsg,
          },
        });
      }
    } catch (err) {
      console.error("[UltrasSocialService] Failed to send ultras direct messages:", err);
    }
  }

  /**
   * 3. 💣 "HERE WE GO!" TRANSFER & AUCTION BREAKING NEWS
   */
  public static async publishTransferAnnouncement(params: {
    playerName: string;
    position: string;
    overallRating: number;
    feeEur: number;
    fromClubName: string;
    toClubName: string;
    buyerClubId: string;
    transferType?: string;
  }) {
    try {
      const mediaBotId = await this.getOrCreateBotUser("pmb_sports_media", "ADMINISTRATOR");
      const buyerUltras = getClubUltras(params.toClubName);

      const feeFormatted = params.feeEur > 0 ? `€${(params.feeEur / 1_000_000).toFixed(1)}M` : "انتقال حر (Free Transfer)";

      const postContent = `🚨 **هير وي غو! | HERE WE GO!** 💣
━━━━━━━━━━━━━━━━━━━━
✍️ **رسمياً**: إتمام صفقة انتقال جديدة في الدوري!

• 👕 النادي المشتري: **${params.toClubName}**
• 👤 اللاعب: **${params.playerName}** (\`${params.position.toUpperCase()}\` • **${params.overallRating} OVR**)
• 🛫 قادماً من: **${params.fromClubName}**
• 💰 قيمة الصفقة: **${feeFormatted}**
• 📋 نوع العقد: **${params.transferType || "عقد نهائي (Permanent)"}**
• ⭐ الفحص الطبي: تم بنجاح واللاعب جاهز للمشاركة الرسمية!

#HereWeGo #${params.toClubName.replace(/\s+/g, "")} #PMBTransfers #سوق_الانتقالات`;

      const createdPost = await prisma.post.create({
        data: {
          content: postContent,
          tag: "TRANSFER",
          userId: mediaBotId,
          clubId: params.buyerClubId,
        },
      });

      // Ultras comment celebrating the transfer
      const buyerUltrasBotId = await this.getOrCreateBotUser(buyerUltras.leaderUsername);
      await prisma.postComment.create({
        data: {
          postId: createdPost.id,
          userId: buyerUltrasBotId,
          clubId: params.buyerClubId,
          content: `${buyerUltras.bannerEmoji} صفقة قوية بزاف! هادا هو اللاعب اللي كان ناقصنا فالفرقة.. نتمناو يعطي الإضافة فالتيران ويقدم كل ما عندو! 👏🔥`,
        },
      });
    } catch (err) {
      console.error("[UltrasSocialService] Failed to publish transfer announcement:", err);
    }
  }

  /**
   * 4. 📊 CALCULATE ULTRAS MORALE & CONFIDENCE METER (0 - 100%)
   */
  public static async calculateUltrasMorale(clubId: string) {
    try {
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: {
          homeMatches: {
            where: { status: "COMPLETED" },
            orderBy: { playedAt: "desc" },
            take: 5,
          },
          awayMatches: {
            where: { status: "COMPLETED" },
            orderBy: { playedAt: "desc" },
            take: 5,
          },
        },
      });

      if (!club) {
        return {
          moraleScore: 75,
          status: "SATISFIED",
          statusArabic: "راضي ومساند 🟢",
          description: "جمهور النادي مساند وراضي على الاستقرار العام.",
          ultrasGroup: getClubUltras("Club"),
        };
      }

      const ultras = getClubUltras(club.name);

      // Merge and sort last 5 matches
      const allMatches = [...club.homeMatches, ...club.awayMatches]
        .sort((a, b) => (b.playedAt?.getTime() ?? 0) - (a.playedAt?.getTime() ?? 0))
        .slice(0, 5);

      if (allMatches.length === 0) {
        return {
          moraleScore: 80,
          status: "SATISFIED",
          statusArabic: "متحمس لبداية الموسم 🟢",
          description: `جماهير ${ultras.groupName} متحمسة ومستعدة لتشجيع الفريق مع انطلاق الموسم!`,
          ultrasGroup: ultras,
        };
      }

      let points = 0;
      let winCount = 0;
      let lossCount = 0;

      for (const m of allMatches) {
        const isHome = m.homeClubId === club.id;
        const myScore = isHome ? m.homeGoals ?? 0 : m.awayGoals ?? 0;
        const oppScore = isHome ? m.awayGoals ?? 0 : m.homeGoals ?? 0;

        if (myScore > oppScore) {
          points += 3;
          winCount++;
        } else if (myScore === oppScore) {
          points += 1;
        } else {
          lossCount++;
        }
      }

      const maxPoints = allMatches.length * 3;
      const basePercentage = Math.round((points / maxPoints) * 100);

      // Calculate Morale Score (Range: 15% to 98%)
      let score = Math.max(15, Math.min(98, basePercentage));

      if (winCount >= 3) score = Math.min(98, score + 10);
      if (lossCount >= 3) score = Math.max(15, score - 15);

      let status: "ECSTATIC" | "SATISFIED" | "SKEPTICAL" | "CRISIS" = "SATISFIED";
      let statusArabic = "راضي ومساند 🟢";
      let description = "الكورفا مساندة للفريق والنتائج مقبولة.";

      if (score >= 85) {
        status = "ECSTATIC";
        statusArabic = "نشوة وانتشاء جماهيري خيالي 🔥";
        description = `الكورفا فقمة الحماس وكتآمن بالتتويج باللقب! ${ultras.chants[0]}`;
      } else if (score >= 60) {
        status = "SATISFIED";
        statusArabic = "رضا وثقة فالمدرب 🟢";
        description = "مساندة مستمرة وثقة فالمشروع التكتيكي ديال الفريق.";
      } else if (score >= 35) {
        status = "SKEPTICAL";
        statusArabic = "قلق ومطالبة بتحسين الأداء 🟠";
        description = "الكورفا غير راضية على تذبذب النتائج وتطالب بانتفاضة سريعة.";
      } else {
        status = "CRISIS";
        statusArabic = "غضب عارم وأزمة ثقة 🔴";
        description = "غليان فالمدرجات ومطالب عاجلة بتصحيح المسار والقتالية فالتيران!";
      }

      return {
        moraleScore: score,
        status,
        statusArabic,
        description,
        ultrasGroup: ultras,
      };
    } catch (err) {
      console.error("[UltrasSocialService] Failed to calculate ultras morale:", err);
      return {
        moraleScore: 70,
        status: "SATISFIED",
        statusArabic: "راضي ومساند 🟢",
        description: "الكورفا ورا الفريق فكل الظروف.",
        ultrasGroup: getClubUltras("Club"),
      };
    }
  }

  /**
   * 5. 🤖 AUTOMATIC AI ULTRAS REPLY TO MANAGER POSTS
   * Analyzes manager post content and generates realistic Ultras reaction comments in Moroccan Darija.
   */
  public static async respondToManagerPost(postId: string) {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          user: true,
          club: true,
        },
      });

      if (!post) return;

      const clubName = post.club?.name || "PMB Club";
      const ultras = getClubUltras(clubName);
      const ultrasBotId = await this.getOrCreateBotUser(ultras.leaderUsername);
      const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

      let commentText = "";

      // 1. Try Gemini AI Generation
      if (geminiApiKey) {
        try {
          const prompt = `You are the authentic Moroccan Ultras Fan Group ("${ultras.groupName}" ${ultras.bannerEmoji}) of "${clubName}".
One of your chants is: "${ultras.chants[0]}".
The manager of your club just posted this on the social feed:
"${post.content}"
Tag: ${post.tag}

Task: Write 1 short, authentic, passionate reply comment (15 to 30 words) from the Ultras to the manager.
Language: Moroccan Football Darija / Arabic (الدارجة المغربية).
Tone & Rules:
- If manager is confident or announcing a match: Encourage passionately with ultras chants and fire emojis!
- If manager is celebrating a win: Celebrate the 3 points and demand consistency!
- If manager is making excuses or lost a game: Demand fighting spirit, focus on the pitch, and no excuses.
- If it's a new transfer: Welcome the player and demand sweat for the shirt.
- Return ONLY the exact reply text without quotes or preamble.`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.75, maxOutputTokens: 256 },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const generated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (generated && generated.trim()) {
              commentText = generated.trim();
            }
          }
        } catch (geminiErr) {
          console.warn("[UltrasSocialService] Gemini post reply failed, using heuristic template:", geminiErr);
        }
      }

      // 2. Heuristic Semantic Fallback (if Gemini unavailable)
      if (!commentText) {
        const lower = post.content.toLowerCase();
        if (post.tag === "VICTORY" || /فوز|ربح|3 نقاط|مبروك|انتصار|win|victory/i.test(lower)) {
          commentText = `${ultras.bannerEmoji} ${ultras.chants[0]} برافو يا كوتش! هادي هي الروح والقتالية اللي بغينا نشوفو دائماً.. مكملين حتى للقب! 🔥👑`;
        } else if (post.tag === "TRANSFER" || /صفقة|تعاقد|ميركاتو|لاعب جديد|signing|transfer/i.test(lower)) {
          commentText = `${ultras.bannerEmoji} مرحباً بيه فقلعة النادي! كنتسناو منو يعطي كاع ما عندو ويعرق على التوني.. بالتوفيق! ⚽👏`;
        } else if (/حكم|تحكيم|ظلم|referee|penalty|var/i.test(lower)) {
          commentText = `${ultras.bannerEmoji} الحكم دار أخطاء ولكن حتى حنا خاصنا نركزو فالتيران ونصلحو الأخطاء التكتيكية بلا مانبقاو فكثرة الأعذار يا كوتش! 👊`;
        } else if (/خسارة|اعتذار|هزيمة|نعتذر|sorry|defeat|loss/i.test(lower)) {
          commentText = `${ultras.bannerEmoji} المقابلة سالات وكنتسناو ردة فعل رجولية فالماتش الجاي! القميص عندو هيبة والمدرج ماكيرحمش فالاستهتار! ⚠️`;
        } else if (post.tag === "BANTER" || /ديربي|قمة|كلاسيكو|derby|clash/i.test(lower)) {
          commentText = `${ultras.bannerEmoji} الكورفا واجدة وحاضرين بالآلاف للديبلاسمون! جيبوها يا رجال والعاصمة كلها وراكم! 💚🖤🔥`;
        } else {
          commentText = `${ultras.bannerEmoji} ${ultras.chants[0]} حنا فظهر الفرقة وفظهرك يا كوتش.. التركيز على الملعب و3 نقاط! 👏`;
        }
      }

      // Create Ultras Comment
      await prisma.postComment.create({
        data: {
          postId: post.id,
          userId: ultrasBotId,
          clubId: null, // Null so it displays as Ultras fan group
          content: commentText,
        },
      });

      // 3. If post is BANTER, simulate rival Ultras counter-banter!
      if (post.tag === "BANTER" || /رجاء|وداد|جيش|raja|wydad|far/i.test(post.content)) {
        let rivalClubName = "Raja Casablanca";
        if (clubName.toLowerCase().includes("raja")) rivalClubName = "Wydad AC";
        else if (clubName.toLowerCase().includes("wydad")) rivalClubName = "FAR Rabat";
        else if (clubName.toLowerCase().includes("far")) rivalClubName = "Raja Casablanca";

        const rivalUltras = getClubUltras(rivalClubName);
        const rivalUltrasBotId = await this.getOrCreateBotUser(rivalUltras.leaderUsername);

        await prisma.postComment.create({
          data: {
            postId: post.id,
            userId: rivalUltrasBotId,
            clubId: null,
            content: `${rivalUltras.bannerEmoji} هاد الهضرة كاملة غانشوفوها فالتيران الأحد الجاي.. الميدان هو اللي كيحكم بيناتنا! 😉⚽`,
          },
        });
      }
    } catch (err) {
      console.error("[UltrasSocialService] Failed to respond to manager post:", err);
    }
  }
}
