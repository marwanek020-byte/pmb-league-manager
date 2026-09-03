import { prisma } from "@/lib/prisma";
import { getClubUltras, findMentionedClubsInText, UltrasGroup } from "@/lib/services/ultras-registry";
import { UltrasMentalityEngine } from "@/lib/services/ultras-mentality-engine";

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

      let homeState: "ECSTASY" | "CURVA_FURY" | "UNCONDITIONAL_LOYALTY" = "UNCONDITIONAL_LOYALTY";
      let awayState: "ECSTASY" | "CURVA_FURY" | "UNCONDITIONAL_LOYALTY" = "UNCONDITIONAL_LOYALTY";

      if (homeScore > awayScore) {
        homeState = "ECSTASY";
        awayState = "CURVA_FURY";
      } else if (awayScore > homeScore) {
        awayState = "ECSTASY";
        homeState = "CURVA_FURY";
      } else {
        homeState = "UNCONDITIONAL_LOYALTY";
        awayState = "UNCONDITIONAL_LOYALTY";
      }

      const homeComment = UltrasMentalityEngine.generateOfflineCapoResponse({
        ultras: homeUltras,
        clubName: match.homeClub.name,
        emotionalState: homeState,
        userPrompt: `Match Result: ${match.homeClub.name} ${homeScore} - ${awayScore} ${match.awayClub.name}`,
        language: homeUltras.preferredLanguage || "AR",
        mentionedOpponent: match.awayClub.name,
      });

      const awayComment = UltrasMentalityEngine.generateOfflineCapoResponse({
        ultras: awayUltras,
        clubName: match.awayClub.name,
        emotionalState: awayState,
        userPrompt: `Match Result: ${match.homeClub.name} ${homeScore} - ${awayScore} ${match.awayClub.name}`,
        language: awayUltras.preferredLanguage || "AR",
        mentionedOpponent: match.homeClub.name,
      });

      commentsToCreate.push({
        userId: homeUltrasBotId,
        clubId: match.homeClub.id,
        content: homeComment,
      });

      commentsToCreate.push({
        userId: awayUltrasBotId,
        clubId: match.awayClub.id,
        content: awayComment,
      });

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
    homeUltras: UltrasGroup,
    awayUltras: UltrasGroup,
    homeScore: number,
    awayScore: number
  ) {
    try {
      const homeUltrasBotId = await this.getOrCreateBotUser(homeUltras.leaderUsername);
      const awayUltrasBotId = await this.getOrCreateBotUser(awayUltras.leaderUsername);

      // A. Message to Home Manager
      if (match.homeClub.manager) {
        const homeState = homeScore > awayScore ? "ECSTASY" : homeScore < awayScore ? "CURVA_FURY" : "UNCONDITIONAL_LOYALTY";
        const homeMsg = UltrasMentalityEngine.generateOfflineCapoResponse({
          ultras: homeUltras,
          clubName: match.homeClub.name,
          emotionalState: homeState,
          userPrompt: `Post-match direct message to manager @${match.homeClub.manager.username} after ${homeScore}-${awayScore} against ${match.awayClub.name}`,
          language: homeUltras.preferredLanguage || "AR",
          mentionedOpponent: match.awayClub.name,
        });

        await prisma.directMessage.create({
          data: {
            senderId: homeUltrasBotId,
            receiverId: match.homeClub.manager.id,
            content: `📢 [${homeUltras.officialGroupTitle || homeUltras.groupName}]\n\n${homeMsg}`,
          },
        });
      }

      // B. Message to Away Manager
      if (match.awayClub.manager) {
        const awayState = awayScore > homeScore ? "ECSTASY" : awayScore < homeScore ? "CURVA_FURY" : "UNCONDITIONAL_LOYALTY";
        const awayMsg = UltrasMentalityEngine.generateOfflineCapoResponse({
          ultras: awayUltras,
          clubName: match.awayClub.name,
          emotionalState: awayState,
          userPrompt: `Post-match direct message to manager @${match.awayClub.manager.username} after ${homeScore}-${awayScore} away at ${match.homeClub.name}`,
          language: awayUltras.preferredLanguage || "AR",
          mentionedOpponent: match.homeClub.name,
        });

        await prisma.directMessage.create({
          data: {
            senderId: awayUltrasBotId,
            receiverId: match.awayClub.manager.id,
            content: `📢 [${awayUltras.officialGroupTitle || awayUltras.groupName}]\n\n${awayMsg}`,
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
    buyerClubId?: string;
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
          clubId: params.buyerClubId || null,
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
   * Intelligently reads and analyzes manager publications:
   * - Detects post topic, language, and mentioned clubs/opponents.
   * - Uses multi-model Gemini cascade ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-pro").
   * - Triggers authentic, culturally adaptive commentary from the author's Ultras.
   * - Triggers genuine counter-banter from mentioned opponents (e.g. West Ham Ultras in English with Hammers culture, NOT Raja Casablanca!).
   * - Provides rich, varied, context-aware NLP offline templates when Gemini is offline.
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
      const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();

      // Detect post language
      const isArabic = /[\u0600-\u06FF]/.test(post.content);
      const isFrench = /\b(bonjour|nous|victoire|match|adversaire|joueur|equipe|arbitre|tactique|choc|mercato|entraineur)\b/i.test(post.content);
      const postLang: "AR" | "FR" | "EN" = isArabic ? "AR" : isFrench ? "FR" : "EN";

      // Detect any mentioned rival or opponent clubs in text
      const mentionedClubs = findMentionedClubsInText(post.content, clubName);
      const opponentNames = mentionedClubs.map((c) => c.clubName).join(", ");

      let primaryCommentText = "";

      // 1. Try Gemini Multi-Model Cascade for Author Club Ultras
      if (geminiApiKey) {
        const candidateModels = [
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-2.5-flash",
          "gemini-1.5-pro",
        ];

        const systemInstruction = `You are the authentic Ultras Fan Group leader of "${clubName}" named "${ultras.groupName}" (${ultras.bannerEmoji}).
Official Group: "${ultras.officialGroupTitle}".
Anthem/Chant: "${ultras.chants[0]}".
Preferred Tone: ${ultras.tone}.

CRITICAL BEHAVIOR RULES:
- Read and deeply analyze the manager's publication below.
- Do NOT repeat generic cliches or always say "we want 3 points".
- Directly respond to what the manager actually wrote (specific opponent, tactical formation, player signings, referee controversy, injury update, victory celebration, or clash).
- Match the club's authentic football culture:
  * Moroccan clubs (FAR Rabat, Raja, Wydad, MAS, etc.): Write in authentic Moroccan Football Darija (الدارجة المغربية) with ultras passion.
  * English clubs (West Ham United, Arsenal, Chelsea, Man Utd, etc.): Write in authentic British football fan English with club chants and slang (e.g. Hammers: "Irons", "blowing bubbles", "East London").
  * French clubs (PSG, etc.): Write in passionate French.
  * Spanish clubs (Real Madrid, Barcelona): Write in Spanish or English matching the post.
- Keep the comment punchy, realistic, and between 15 and 35 words.
- Return ONLY the exact comment text with relevant emojis, no quotes or preamble.`;

        const userPrompt = `Manager Publication Content:
"${post.content}"
Tag: ${post.tag}
${opponentNames ? `Mentioned Opponent/Club: ${opponentNames}` : ""}
Language of publication: ${postLang}`;

        for (const modelName of candidateModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: systemInstruction }] },
                  contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                  generationConfig: { temperature: 0.8, maxOutputTokens: 256 },
                }),
              }
            );

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const generated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (generated && generated.trim()) {
                primaryCommentText = generated.trim();
                break;
              }
            }
          } catch (geminiErr) {
            console.warn(`[UltrasSocialService] Model ${modelName} failed, trying next model in cascade...`);
          }
        }
      }

      // 2. Intelligent Offline Semantic NLP Fallback for Author Club Ultras
      if (!primaryCommentText) {
        primaryCommentText = this.generateSemanticFallbackComment(ultras, post.content, post.tag, mentionedClubs, postLang);
      }

      // 1. Author's Ultras evaluates & generates comment
      await prisma.postComment.create({
        data: {
          postId: post.id,
          userId: ultrasBotId,
          clubId: null,
          content: primaryCommentText,
        },
      });

      // 2. All mentioned clubs' Ultras read, analyze, and reply to defend their colors!
      const repliedBotUsernames = new Set<string>([ultras.leaderUsername]);

      for (const oppUltras of mentionedClubs) {
        if (repliedBotUsernames.has(oppUltras.leaderUsername)) continue;
        repliedBotUsernames.add(oppUltras.leaderUsername);

        const oppBotId = await this.getOrCreateBotUser(oppUltras.leaderUsername);
        let oppCommentText = "";

        if (geminiApiKey) {
          const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
          const oppPrompt = `You are "${oppUltras.groupName}" (${oppUltras.bannerEmoji}), the authentic Ultras of "${oppUltras.clubName}".
Anthem/Chant: "${oppUltras.chants[0]}".
The manager of "${clubName}" just published this social post mentioning/clashing your team:
"${post.content}"

Task: Write a sharp, proud, witty counter-banter comment (15 to 30 words) defending "${oppUltras.clubName}".
Language: ${oppUltras.preferredLanguage === "EN" ? "English (British fan slang)" : oppUltras.preferredLanguage === "FR" ? "French" : "Moroccan Darija / Arabic"}.
Return ONLY the exact reply text without quotes.`;

          for (const modelName of candidateModels) {
            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: oppPrompt }] }],
                    generationConfig: { temperature: 0.85, maxOutputTokens: 256 },
                  }),
                }
              );

              if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.trim()) {
                  oppCommentText = text.trim();
                  break;
                }
              }
            } catch {
              // Ignore and fallback
            }
          }
        }

        if (!oppCommentText) {
          oppCommentText = this.generateOpponentFallbackComment(oppUltras, clubName, post.content);
        }

        await prisma.postComment.create({
          data: {
            postId: post.id,
            userId: oppBotId,
            clubId: null,
            content: oppCommentText,
          },
        });
      }

      // 3. Autonomous League Provocation Analysis (If post is a massive title race boast / league-wide challenge)
      const isLeagueBrag = /champions|champion|easy league|nobody can beat us|نربحو كولشي|البطولة ساهلة|3 نقاط ساهلة|ما كاين تا فرقة|zero competition/i.test(post.content);
      if (isLeagueBrag && mentionedClubs.length === 0) {
        // Top rivals read and challenge the boast
        const rivalsToChallenge = (ultras.rivals || ["raja casablanca", "wydad ac"]).slice(0, 2);
        for (const rivalKey of rivalsToChallenge) {
          const rivalUltras = getClubUltras(rivalKey);
          if (repliedBotUsernames.has(rivalUltras.leaderUsername)) continue;
          repliedBotUsernames.add(rivalUltras.leaderUsername);

          const rivalBotId = await this.getOrCreateBotUser(rivalUltras.leaderUsername);
          let boastClapback = `${rivalUltras.bannerEmoji} مازال ما شفتو والو يا كوتش! البطولة كتحسم فالميدان وفالدورات الأخيرة ماشي بالهضرة فالسوشيال ميديا! ⚔️🔥`;
          if (rivalUltras.preferredLanguage === "EN") {
            boastClapback = `${rivalUltras.bannerEmoji} Don't get ahead of yourself gaffer! The season is a marathon, we'll see who is standing at the end! 🫧⚒️`;
          }

          await prisma.postComment.create({
            data: {
              postId: post.id,
              userId: rivalBotId,
              clubId: null,
              content: boastClapback,
            },
          });
        }
      }
    } catch (err) {
      console.error("[UltrasSocialService] Failed to respond to manager post:", err);
    }
  }

  /**
   * 3.6 💬 RESPOND TO USER COMMENTS IN THREAD (Ultras monitor and reply to clashing comments)
   */
  public static async respondToCommentThread(postId: string, commentId: string) {
    try {
      const comment = await prisma.postComment.findUnique({
        where: { id: commentId },
        include: {
          user: true,
          club: true,
          post: { include: { club: true } },
        },
      });

      if (!comment || comment.user.username.includes("_ultras") || comment.user.username === "pmb_sports_media") {
        return;
      }

      const commentText = comment.content.trim();
      const authorClubName = comment.club?.name || comment.post?.club?.name || "Club";
      const mentionedClubs = findMentionedClubsInText(commentText, authorClubName);

      for (const targetUltras of mentionedClubs) {
        const botId = await this.getOrCreateBotUser(targetUltras.leaderUsername);
        const replyText = this.generateOpponentFallbackComment(targetUltras, authorClubName, commentText);

        await prisma.postComment.create({
          data: {
            postId,
            userId: botId,
            clubId: null,
            content: replyText,
          },
        });
      }
    } catch (err) {
      console.error("[UltrasSocialService] Failed to respond to comment thread:", err);
    }
  }

  /**
   * Helper to generate context-aware offline comments with rich variations
   */
  private static generateSemanticFallbackComment(
    ultras: UltrasGroup,
    content: string,
    tag: string,
    mentionedClubs: UltrasGroup[],
    lang: "AR" | "FR" | "EN"
  ): string {
    const lower = content.toLowerCase();
    const chant = ultras.chants[0] || "";
    const emoji = ultras.bannerEmoji || "🔥";
    const oppName = mentionedClubs.length > 0 ? mentionedClubs[0].clubName : "";
    const oppLower = oppName.toLowerCase();

    // 0. PRAISE / FRIENDSHIP / RESPECT / BROTHERHOOD ("s7abna", "3chran", "respect", "allies", "khoutna", "merci", "chokran")
    const isPraiseOrFriendship =
      /s7abna|3chran|3chrana|khoutna|respect|friends|brothers|respect to|great club|allies|alliance|chokran|merci|thanks|top club|famille|amis|respectueux|respect aux|تحية|احترام|اخوتنا|خوتنا|صحابنا|عشرانا|عشران|رجال|كل الاحترام|برافو|bravo|حب|أخوة|اخوة/i.test(lower);

    if (oppName && isPraiseOrFriendship) {
      if (oppLower.includes("west ham")) {
        return `${emoji} 🤝 تحية خاصة لـ The Iron Army ولجمهور ويستهام الخوت والعشران! الاحترام متبادل بين ولاد العاصمة ولندن.. ألتراس حقيقيين وثقافة فيراج أصيلة! ⚒️🍷💚🖤`;
      }
      if (oppLower.includes("paris") || oppLower.includes("psg")) {
        return `${emoji} 🤝 الاحترام متبادل مع جماهير باريس الحقيقية والـ CUP! الروح الرياضية وثقافة الألتراس كتجمع الرجال فكل مكان! 🔵🔴💚🖤`;
      }
      return `${emoji} 🤝 الاحترام متبادل والرجال كيعرفو بعضياتهم! تحية خاصة لجمهور ${oppName} العريق.. ديما احترام وأخوة بين الجماهير الوفية! 👏🔥`;
    }

    // Check if user is specifically discussing an upcoming scheduled match
    const isExplicitMatchdayFixture =
      /ماتش اليوم|الماتش الجاي|ديبلاسمون|التذاكر|تشكيلة اليوم|next match|upcoming fixture|kickoff|matchday|choc de la journée/i.test(lower);

    // 1. CLASH / BANTER / OPINION / ROAST AGAINST ANY MENTIONED OPPONENT
    if (oppName && !isExplicitMatchdayFixture) {
      if (oppLower.includes("manchester united") || oppLower.includes("man united") || oppLower.includes("man utd")) {
        return `${emoji} هههههه بالصح يا كوتش سالات وقتهم وشحال هادي ما بقاو فرقة! بقاو عايشين غير على أطلال الماضي.. الزعيم الملكي حاضر برجالو وفورمة عالية! 🔥⚔️`;
      }
      if (oppLower.includes("paris") || oppLower.includes("psg")) {
        return `${emoji} هههههه عطيهم يا كوتش! قصف فالتسعين.. باريس غي الفلوس والنفخ فالإعلام وبلا روح! الزعيم الملكي تاريخ ورجال فالميدان وغانوصلو ليهم الميساج! 🔥⚔️`;
      }
      if (oppLower.includes("touarga") || oppLower.includes("uts")) {
        return `${emoji} هههههه بالصح يا كوتش تواركة ما فرقة ما والو غي ضياف فالعاصمة! الزعيم الملكي هو سيد الرباط والتيران غايعطيهم درس! 🔥👊`;
      }
      if (oppLower.includes("raja") || oppLower.includes("rca")) {
        return `${emoji} هههههه عطيهم يا كوتش! ما كاين غير الزعيم والعسكر.. شعب الهضرة غاياكلو قتلة فالتيران! 🔥⚔️`;
      }
      if (oppLower.includes("wydad") || oppLower.includes("wac")) {
        return `${emoji} هههههه قصف فالمستوى يا كوتش! الزعيم الملكي عقدتهم التاريخية والميدان هو اللي كيهضر! 👑🔥`;
      }
      if (oppLower.includes("chelsea")) {
        return `${emoji} هههههه بالصح يا كوتش غي الملايير مضيعة وبلا هوية! الزعيم الملكي عندو رجال كيموتو على التوني! 🔥🦁`;
      }
      if (oppLower.includes("arsenal")) {
        return `${emoji} هههههه قصف فالمستوى! كيوصلو للقمة ويخافو.. ما كاين غير الزعيم والشخصية القوية! 🔥💣`;
      }
      if (oppLower.includes("barcelona") || oppLower.includes("real madrid")) {
        return `${emoji} هههههه عطيهم يا كوتش! الزعيم الملكي ما كيرضى بغير القمة وهادوك غير كيهضرو فالفراغ! 🔥👑`;
      }
      if (oppLower.includes("west ham")) {
        return `${emoji} هههههه عطيهم يا كوتش! ويستهام عندهم تاريخ فإنجلترا ولكن الزعيم الملكي ما كيرحم تا فرقة فالميدان! ⚒️🔥`;
      }
      return `${emoji} هههههه عطيهم يا كوتش! ما كاين غير ${ultras.nickname || ultras.clubName}.. هادوك غير كيهضرو فالفراغ والميدان غايعطيهم درس قاصح! 🔥⚔️`;
    }

    // 2. RESPECTFUL / TACTICAL FIXTURE MENTION
    if (oppName) {
      const oppArabicName =
        oppLower.includes("paris") || oppLower.includes("psg")
          ? "باريس سان جيرمان"
          : oppLower.includes("manchester") || oppLower.includes("man united")
          ? "مانشستر يونايتد"
          : oppLower.includes("touarga")
          ? "اتحاد تواركة"
          : oppLower.includes("raja")
          ? "الرجاء"
          : oppLower.includes("wydad")
          ? "الوداد"
          : oppLower.includes("west ham")
          ? "وست هام"
          : oppName;

      if (lang === "AR" || ultras.preferredLanguage === "AR") {
        const templates = [
          `${emoji} ${chant} مواجهة قوية ضد ${oppArabicName}.. الكورفا واجدة وكنتسناو قتالية وشراسة فالميدان للدفاع على القميص! ⚔️🔥`,
          `${emoji} ماتش كبير كيتسنانا ضد ${oppArabicName}.. التكتيك والتركيز 90 دقيقة هو مفتاح الانتصار! كلنا وراكم! 🛡️⚽`,
          `${emoji} العاصمة والمدرج كامل مشتعل قبل مواجهة ${oppArabicName}.. جيبو الفوز وشرفو الألوان! 💚🖤`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      } else if (lang === "FR" || ultras.preferredLanguage === "FR") {
        return `${emoji} Grand choc face à ${oppName} ! Toute la tribune est prête, on veut un engagement total sur la pelouse ! ⚔️🔥`;
      } else {
        const templates = [
          `${emoji} Massive fixture against ${oppName}! The fans are buzzing, let's take the game to them with high intensity! ⚒️🔥`,
          `${emoji} Big test ahead vs ${oppName}! Stay compact, disciplined, and fight for every single ball! 🛡️⚡`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      }
    }

    // 3. TACTICAL & FORMATION DISCUSSIONS
    if (/خطة|تكتيك|تشكيلة|ضغط|دفاع|هجوم|tactique|formation|lineup|tactics|pressing|system/i.test(lower)) {
      if (lang === "AR" || ultras.preferredLanguage === "AR") {
        const templates = [
          `${emoji} قراءة تكتيكية فالمستوى يا كوتش.. الضغط العالي والتحولات السريعة هما اللي غايصنعو الفارق فالماتش! 🧠⚽`,
          `${emoji} ${chant} الانضباط التكتيكي وحماية الخطوط الخلفية هما الأساس.. حنا فظهرك ونثقو فالخيارات ديالك! 📋🛡️`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      } else {
        return `${emoji} Spot on tactical breakdown, gaffer! Sharp pressing and aggressive transitions will win us this battle! 🧠⚽`;
      }
    }

    // 4. TRANSFERS & NEW SIGNINGS
    if (tag === "TRANSFER" || /صفقة|تعاقد|ميركاتو|لاعب جديد|signing|transfer|recruit|mercato/i.test(lower)) {
      if (lang === "AR" || ultras.preferredLanguage === "AR") {
        const templates = [
          `${emoji} مرحباً بيه فقلعة النادي! القميص عندو هيبة وكنتسناو منو يعرق عليه ويقدم الإضافة الحقيقية فالميدان! 👏🔥`,
          `${emoji} صفقة ممتازة لتعزيز المجموعة.. الخدمة والقتالية فالتيران هي المعيار الوحيد عندنا! بالتوفيق ليه! ⚽⚡`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      } else {
        return `${emoji} Cracking addition to the squad! Welcome to the club, wear the badge with pride and fight for every ball! 👏🔥`;
      }
    }

    // 5. REFEREE & VAR CONTROVERSIES
    if (/حكم|تحكيم|ظلم|var|referee|penalty|card/i.test(lower)) {
      if (lang === "AR" || ultras.preferredLanguage === "AR") {
        return `${emoji} التحكيم دار أخطاء واضحة ولكن قوتنا ديما فالميدان.. مانعطيوش فرصة لأي عذر والرد غايكون بالقتالية والتسجيل فالماتش الجاي! 👊`;
      } else {
        return `${emoji} Ref decisions were shocking, but our focus stays on our own performance! We answer on the pitch with pride! 👊`;
      }
    }

    // 6. LOSS / BOUNCE BACK / APOLOGY
    if (/خسارة|اعتذار|هزيمة|نعتذر|sorry|defeat|loss|bounce back/i.test(lower)) {
      if (lang === "AR" || ultras.preferredLanguage === "AR") {
        return `${emoji} هزيمة قاصحة ولكن الكورفا ماكتتخلاش على الفريق.. كنوعدوكم بالتشجيع وكنتسناو ردة فعل رجولية فالتيران بلا أعذار! ⚠️🛡️`;
      } else {
        return `${emoji} Tough pill to swallow, but true supporters never hide. We want to see a massive reaction next match! ⚠️🛡️`;
      }
    }

    // 7. VICTORY & CELEBRATION
    if (tag === "VICTORY" || /فوز|ربح|3 نقاط|مبروك|انتصار|win|victory|champions/i.test(lower)) {
      if (lang === "AR" || ultras.preferredLanguage === "AR") {
        const templates = [
          `${emoji} ${chant} أداء بطولي وفوز مستحق أسعد كاع الجماهير! الاستمرارية هي مفتاح المنافسة على الألقاب.. برافو للفرقة كاملة! 🔥👑`,
          `${emoji} فرحة مستحقة للرجال.. القتالية والتنظيم فالتيران كانو فالمستوى، مكملين بنفس الروح حتى لآخر جولة! 🏆✨`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      } else {
        return `${emoji} Brilliant performance and well deserved victory! Outstanding character from the lads! Keep this momentum going! 🔥👑`;
      }
    }

    // 8. DERBY & BANTER
    if (tag === "BANTER" || /ديربي|قمة|كلاسيكو|derby|clash|banter/i.test(lower)) {
      if (lang === "AR" || ultras.preferredLanguage === "AR") {
        return `${emoji} ${chant} أجواء الكورفا مشتعلة والمدرج غايكون فالموعد! جيبوها يا رجال والعاصمة كلها وراكم! ⚔️🔥`;
      } else {
        return `${emoji} Derby vibes are electric! The atmosphere is going to be rocking, go out there and fight for the badge! ⚔️🔥`;
      }
    }

    // 9. GENERAL SUPPORT
    if (lang === "AR" || ultras.preferredLanguage === "AR") {
      const templates = [
        `${emoji} ${chant} حنا فظهر الفرقة وفظهرك يا كوتش.. الروح الجماعية والقتالية هي اللي غاتوصلنا لأهدافنا! 👏🛡️`,
        `${emoji} الدعم متواصل من المدرج 90 دقيقة.. كلنا ثقة فالخدمة ديالكم ومساندين حتى لآخر لحظة! ⚽🔥`,
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else {
      return `${emoji} Fully behind the manager and the lads! Hard work and togetherness will take us to the top! 👏🛡️`;
    }
  }

  /**
   * Helper to generate opponent counter-banter or mutual respect comment
   */
  private static generateOpponentFallbackComment(oppUltras: UltrasGroup, hostClubName: string, userContent = ""): string {
    const emoji = oppUltras.bannerEmoji || "⚔️";
    const chant = oppUltras.chants[0] || "";
    const lower = oppUltras.clubName.toLowerCase();
    const contentLower = userContent.toLowerCase();

    // Check if user is showing respect, praise, friendship or brotherhood
    const isPraiseOrFriendship =
      /s7abna|3chran|3chrana|khoutna|respect|friends|brothers|respect to|great club|allies|alliance|chokran|merci|thanks|top club|famille|amis|respectueux|respect aux|تحية|احترام|اخوتنا|خوتنا|صحابنا|عشرانا|عشران|رجال|كل الاحترام|برافو|bravo|حب|أخوة|اخوة/i.test(contentLower);

    if (isPraiseOrFriendship) {
      if (oppUltras.preferredLanguage === "EN" || lower.includes("west ham")) {
        return `${emoji} 🤝 Pure respect from East London to Rabat! Much love to the FAR Rabat Ultras and manager! Proper fans and authentic terrace culture! 🫧⚒️`;
      }
      if (oppUltras.preferredLanguage === "FR" || lower.includes("paris") || lower.includes("psg")) {
        return `${emoji} 🤝 Grand respect entre vrais passionnés de football ! Merci aux supporters de ${hostClubName}, la ferveur ultra c'est aussi le respect mutuel ! 🔵🔴🗼`;
      }
      if (oppUltras.preferredLanguage === "ES" || lower.includes("real madrid") || lower.includes("barcelona")) {
        return `${emoji} 🤝 ¡Mucho respeto y hermandad para la afición de ${hostClubName}! ¡El fútbol une a los verdaderos hinchas! 👑⚪⚡`;
      }
      return `${emoji} 🤝 الاحترام والتقدير متبادل بيناتنا! تحية حارة من جمهورنا لجمهور ${hostClubName} العريق.. ديما خوت وعشران فالتيران وخارج التيران! 👏🔥`;
    }

    // Otherwise: Fierce Opponent Clapbacks
    if (oppUltras.preferredLanguage === "EN") {
      if (lower.includes("manchester united") || lower.includes("man united") || lower.includes("man utd")) {
        return `${emoji} 20 League Titles & 3 European Cups! Keep Manchester United's name out of your mouth until you've won something on the world stage! Old Trafford will always be the Theatre of Dreams! 🔴👹⚡`;
      } else if (lower.includes("chelsea")) {
        return `${emoji} 2x Champions of Europe and World Champions! Come to Stamford Bridge and see what London blue pride really means! 🔵🦁💙`;
      } else if (lower.includes("arsenal")) {
        return `${emoji} The Invincibles history you could only dream of! North London is red and we fear no one! Victoria Concordia Crescit! 🔴💣`;
      } else if (lower.includes("liverpool")) {
        return `${emoji} 6 European Cups at Anfield! You'll Never Walk Alone is more than just a chant, it's royalty! Respect the greatest! 🔴🦅🔥`;
      } else if (lower.includes("manchester city") || lower.includes("man city")) {
        return `${emoji} Treble winners and masters of football! You can talk about history, but right now we rule the world! 💙🦈⚡`;
      } else if (lower.includes("west ham")) {
        return `${emoji} Claret & Blue Army ready for the trip! Bubbles flying high in East London! Bring on the clash against ${hostClubName}! 🫧⚒️`;
      } else {
        return `${emoji} Talking cheap on social media? Bring your squad to our ground and we'll see who rules the pitch! ⚡🔥`;
      }
    } else if (oppUltras.preferredLanguage === "FR" || lower.includes("paris") || lower.includes("psg")) {
      return `${emoji} Vous osez parler du Paris Saint-Germain ? Ici c'est Paris et le Virage Auteuil ne craint personne ! Venez au Parc des Princes si vous avez le courage ! 🔵🔴🗼🔥`;
    } else if (oppUltras.preferredLanguage === "ES" || lower.includes("real madrid") || lower.includes("barcelona")) {
      if (lower.includes("real madrid")) {
        return `${emoji} 15 Copas de Europa! El club más grande de la historia. ¡Lávate la boca antes de hablar del Real Madrid! ¡Hala Madrid y nada más! 👑⚪⚡`;
      } else {
        return `${emoji} ¡Més que un club! 5 Champions y el mejor fútbol del mundo. ¡Visca el Barça y respeto a los colores blaugrana! 🔵🔴💙❤️`;
      }
    } else {
      // Moroccan Darija / Arabic Clubs Counter-Clapbacks
      if (lower.includes("touarga") || lower.includes("uts")) {
        return `${emoji} كتسميونا ماشي فرقة حيت مخلوعين منا فالعاصمة! الميدان هو لي غايحكم ونبينو ليكم شكون كيكور وشكون كيهضر فالفراغ! 👊⚡`;
      } else if (lower.includes("wydad") || lower.includes("wac")) {
        return `${emoji} فاش كتدوي على وداد الأمة وأسياد القارة دير يدك على راسك! الكورفا نورد غاتوريكم حجمكم الحقيقي فالميدان! ⭐🏆❤️🤍`;
      } else if (lower.includes("raja") || lower.includes("rca")) {
        return `${emoji} شكون نتوما باش تدويو على شعب الخضرة؟ 3 عصب إفريقية ونهائي كاس العالم يا لي ماعندكم تاريخ! موعدنا فالماتش نكلوكم! 🦅💚`;
      } else if (lower.includes("far") || lower.includes("rabat")) {
        return `${emoji} الزعيم الملكي كيبقا كابوسكم التاريخي! العاصمة عندها سيد واحد هو الجيش الملكي وما سوقناش فالهضرة الخاوية! 💚🖤🔴🔥`;
      } else if (lower.includes("fes") || lower.includes("mas")) {
        return `${emoji} الماص حضارة وتاريخ العاصمة العلمية! فاش تدوي على النمور الصفر عرق بعدا على التوني ديالك! 🐯💛🖤`;
      } else if (lower.includes("tanger") || lower.includes("irt")) {
        return `${emoji} طنجة العالية وفرسان البوغاز ما كيخافو من تا فرقة! غاتجيو للشمال وغاترجعو خاويين! 🌊💙🤍`;
      } else if (lower.includes("berkane") || lower.includes("rsb")) {
        return `${emoji} ولاد الشرق وفرسان البرتقالي واعرين عليكم فالميدان! الصافرة هي لي غاتوريكم شكون أسياد الكرة! 🧡🖤🍊`;
      } else if (lower.includes("safi") || lower.includes("ocs")) {
        return `${emoji} القرش المسفيوي واجد يغرقكم فالمحيط! دخلوا للميدان وغاتشوفو الشراسة الحقيقية! 🦈💙🔴`;
      } else if (lower.includes("agadir") || lower.includes("husa")) {
        return `${emoji} غزالة سوس برجالها وإمازيغن ورا الفرقة! غانوصلو ليكم الرسالة فالتيران! 🔴⚪ⵣ`;
      } else {
        return `${emoji} ${chant}\nهاد الهضرة كاملة غانشوفوها فالتيران.. الكورفا واجدة والميدان هو اللي كيحكم! ⚽🔥`;
      }
    }
  }
}
