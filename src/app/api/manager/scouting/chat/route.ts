import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlayerFitService } from "@/lib/services/player-fit-service";
import { WhatIfSimulatorService } from "@/lib/services/what-if-simulator-service";
import { OpponentTacticalService } from "@/lib/services/opponent-tactical-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, history } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      include: {
        league: true,
        manager: { select: { username: true } },
        players: {
          where: { status: "REGISTERED" },
          orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    if (!club.aiScoutEnabled) {
      return NextResponse.json(
        { error: "Chief Scout AI (VIP Pro) is not active for your club." },
        { status: 403 }
      );
    }

    const budgetEur = (Number(club.budget) / 1_000_000).toFixed(1);
    const budgetNum = Number(club.budget);
    const lower = message.toLowerCase().trim();
    const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();

    const isArabic = /[\u0600-\u06FF]/.test(message);
    const isFrench = /\b(bonjour|salut|trouver|défenseur|attaquant|milieu|gardien|prochain|adversaire|plan|équipe|joueur)\b/i.test(lower);

    // Positional classifications
    const getPositionCategory = (text: string) => {
      const t = text.toLowerCase();
      if (
        /\b(cf|st|striker|strikers|center forward|centre forward|buteur)\b/i.test(t) ||
        t.includes("مهاجم صريح") ||
        t.includes("رأس حربة") ||
        t.includes("راس حربة") ||
        t.includes("قناص") ||
        t.includes("مهاجم") ||
        t.includes("هجوم") ||
        t.includes("مهاجمين")
      ) {
        return "CF";
      }
      if (
        /\b(gk|goalkeeper|goalkeepers|keeper|keepers|gardien)\b/i.test(t) ||
        t.includes("حارس") ||
        t.includes("حارس مرمى") ||
        t.includes("كول")
      ) {
        return "GK";
      }
      if (
        /\b(cb|center back|centre back|défenseur central)\b/i.test(t) ||
        t.includes("قلب دفاع") ||
        t.includes("أكسيال") ||
        t.includes("سنترال")
      ) {
        return "CB";
      }
      if (
        /\b(lb|left back|arrière gauche)\b/i.test(t) ||
        t.includes("ظهير أيسر") ||
        t.includes("أيسر") ||
        t.includes("لاتيرال كوش")
      ) {
        return "LB";
      }
      if (
        /\b(rb|right back|arrière droit)\b/i.test(t) ||
        t.includes("ظهير أيمن") ||
        t.includes("أيمن") ||
        t.includes("لاتيرال دروا")
      ) {
        return "RB";
      }
      if (
        /\b(lwf|lw|left wing|ailier gauche)\b/i.test(t) ||
        t.includes("جناح أيسر")
      ) {
        return "LWF";
      }
      if (
        /\b(rwf|rw|right wing|ailier droit)\b/i.test(t) ||
        t.includes("جناح أيمن")
      ) {
        return "RWF";
      }
      if (
        /\b(amf|cam|attacking mid|milieu offensif)\b/i.test(t) ||
        t.includes("صانع ألعاب") ||
        t.includes("صانع العاب")
      ) {
        return "AMF";
      }
      if (
        /\b(dmf|dm|defensive mid|milieu défensif)\b/i.test(t) ||
        t.includes("ارتكاز") ||
        t.includes("وسط دفاعي")
      ) {
        return "DMF";
      }
      if (
        /\b(cmf|cm|mid|midfielder|milieu)\b/i.test(t) ||
        t.includes("وسط") ||
        t.includes("لاعب وسط") ||
        t.includes("وسط ميدان")
      ) {
        return "MID";
      }
      if (
        /\b(def|defender|defenders|défenseur)\b/i.test(t) ||
        t.includes("دفاع") ||
        t.includes("مدافع") ||
        t.includes("مدافعين")
      ) {
        return "DEF";
      }
      return null;
    };

    const clubSquadSimple = club.players.map((p) => ({
      position: p.position.toUpperCase(),
      overallRating: p.overallRating,
      nationality: p.nationality,
    }));

    // Helper to auto-detect mentioned players in reply and attach clickable dossier shortcuts + fit scores
    const sendResponse = async (text: string) => {
      try {
        const allDbPlayers = await prisma.player.findMany({
          select: { id: true, fullName: true, position: true, overallRating: true, marketValue: true, nationality: true },
        });
        const textLower = text.toLowerCase();
        const detected: Array<{ id: string; name: string; position: string; overallRating: number; fitScore: number; archetype: string }> = [];
        for (const p of allDbPlayers) {
          if (p.fullName && textLower.includes(p.fullName.toLowerCase())) {
            if (!detected.some((d) => d.id === p.id)) {
              const fit = PlayerFitService.calculateFitScore({
                player: {
                  id: p.id,
                  fullName: p.fullName,
                  position: p.position,
                  overallRating: p.overallRating,
                  marketValue: Number(p.marketValue ?? 0),
                  nationality: p.nationality,
                },
                clubSquad: clubSquadSimple,
                clubBudget: budgetNum,
              });

              detected.push({
                id: p.id,
                name: p.fullName,
                position: p.position.toUpperCase(),
                overallRating: p.overallRating ?? 75,
                fitScore: fit.score,
                archetype: fit.archetypeLabel,
              });
            }
            if (detected.length >= 6) break;
          }
        }
        return NextResponse.json({ reply: text, recommendedPlayers: detected });
      } catch {
        return NextResponse.json({ reply: text, recommendedPlayers: [] });
      }
    };

    // ── 0. LOAD FULL COMPREHENSIVE CONTEXT FROM POSTGRESQL ────────────────────
    const [
      allLeagues,
      allClubs,
      upcomingMatch,
      opponentDossier,
      topFreeAgents,
      topRivalPlayers,
      liveAuctions,
    ] = await Promise.all([
      prisma.league.findMany({
        select: { id: true, name: true, country: true },
      }),
      prisma.club.findMany({
        select: { id: true, name: true, budget: true, league: { select: { name: true } }, manager: { select: { username: true } } },
      }),
      prisma.match.findFirst({
        where: {
          OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
          status: "UPCOMING",
        },
        orderBy: { matchday: "asc" },
        include: {
          homeClub: {
            include: {
              manager: { select: { username: true } },
              players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
            },
          },
          awayClub: {
            include: {
              manager: { select: { username: true } },
              players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
            },
          },
          season: {
            include: { competitionSeason: true },
          },
        },
      }),
      OpponentTacticalService.generatePreMatchDossier(club.id),
      prisma.player.findMany({
        where: { status: "AVAILABLE", pmbClubId: null },
        orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
        take: 35,
      }),
      prisma.player.findMany({
        where: { status: "REGISTERED", pmbClubId: { not: club.id } },
        orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
        take: 35,
        include: { pmbClub: { select: { name: true } } },
      }),
      prisma.auction.findMany({
        where: { status: "ACTIVE" },
        include: { player: true },
        take: 10,
      }),
    ]);

    let opponentDataSummary = "No upcoming match currently scheduled in active season.";
    if (upcomingMatch) {
      const isHome = upcomingMatch.homeClubId === club.id;
      const oppClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
      const oppPlayers = oppClub.players.map((p) => `${p.fullName} (${p.position}, ${p.overallRating} OVR)`);

      opponentDataSummary = `
- Opponent Club: ${oppClub.name} (Manager: @${oppClub.manager?.username ?? "None"})
- Matchday: ${upcomingMatch.matchday} (${isHome ? "Playing at HOME 🏠" : "Playing AWAY ✈️"})
- Competition: ${upcomingMatch.season?.competitionSeason?.name || "League Match"}
- Win Probability: ${opponentDossier.simulationOutcome.winProbability}% (Draw: ${opponentDossier.simulationOutcome.drawProbability}%, Loss: ${opponentDossier.simulationOutcome.lossProbability}%)
- Projected Score: ${opponentDossier.simulationOutcome.projectedScore} (xG: ${opponentDossier.simulationOutcome.expectedGoals.myClub} vs ${opponentDossier.simulationOutcome.expectedGoals.opponent})
- Scout Recommended Formation: ${opponentDossier.tacticalPlan.recommendedFormation} (${opponentDossier.tacticalPlan.mentalityLabel})
- Key Danger Man to Mark: ${opponentDossier.tacticalPlan.keyThreat}
- Exploitation Zone: ${opponentDossier.tacticalPlan.vulnerabilityZone}
- Primary Tactical Directives: ${opponentDossier.tacticalPlan.primaryDirectives.join(" | ")}
- Man-Marking Duty: ${opponentDossier.tacticalPlan.manMarkingDuty}
- Opponent Roster (${oppPlayers.length} players): ${oppPlayers.slice(0, 15).join(", ")}
`;
    }

    const formatP = (p: any) =>
      `• ${p.fullName} (${p.position}, ${p.overallRating} OVR, ${p.nationality}, Club: ${p.pmbClub?.name || "Free Agent"}, Value: €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M)`;

    const mySquadList = club.players.map(formatP).join("\n  ");
    const freeAgentsList = topFreeAgents.map(formatP).join("\n  ");
    const rivalPlayersList = topRivalPlayers.map(formatP).join("\n  ");
    const liveAuctionsList = liveAuctions.map((a) => `• ${a.player.fullName} (${a.player.position}, ${a.player.overallRating} OVR, Current Bid: €${(Number(a.currentBid || 0) / 1_000_000).toFixed(1)}M)`).join("\n  ");
    const leaguesList = allLeagues.map((l) => `${l.name} (${l.country})`).join(", ");
    const clubsList = allClubs.map((c) => `${c.name} (${c.league.name}, Manager: @${c.manager?.username || "None"}, Budget: €${(Number(c.budget)/1e6).toFixed(1)}M)`).join("; ");

    // ── 1. GOOGLE GEMINI MULTI-MODEL CASCADE ──────────────────────────────────
    if (geminiApiKey) {
      const candidateModels = [
        "gemini-3.5-flash",
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
      ];

      const systemPrompt = `You are the VIP Sporting Director, Chief Scout, and Chief Tactical Analyst of "${club.name}" in PMB League Manager.
You are in a direct discussion with your club manager (@${club.manager?.username || "Boss"}).
You have full, unconstrained access to the live PostgreSQL database for the entire PMB ecosystem.

=== LIVE IN-GAME DATABASE KNOWLEDGE ===
YOUR CLUB:
- Club Name: ${club.name}
- League: ${club.league.name} (Country: ${club.league.country})
- Transfer Budget: €${budgetEur}M
- Current Registered Squad (${club.players.length} players):
  ${mySquadList}

NEXT OPPONENT & UPCOMING FIXTURE:
${opponentDataSummary}

LEAGUES IN PMB:
${leaguesList}

CLUBS IN PMB:
${clubsList}

IN-GAME TRANSFER MARKET POOL:
Free Agents Available:
  ${freeAgentsList}

Rival Club Players:
  ${rivalPlayersList}

${liveAuctions.length > 0 ? `Active Auctions in PMB:\n  ${liveAuctionsList}\n` : ""}

=== CRITICAL BEHAVIOR & LANGUAGE RULES ===
1. LANGUAGE ADAPTABILITY (MANDATORY):
   - If the manager prompts in Moroccan Darija or Arabic: Respond 100% in natural, fluent Moroccan Darija / Arabic (الدارجة المغربية). Use authentic Moroccan football terminology (الميزانية، الهجوم، القناص، القتالية، التسديد، المدافعين، الكلاسيكو، الخصم، نقاط القوة والضعف، التشكيلة، نصف المساحات Half-Spaces).
   - If the manager prompts in French: Respond 100% in natural, elegant French.
   - If the manager prompts in English: Respond in English.
   - If the manager asks about ANY topic (leagues, opponents, players, budgets, tactics, starting XI, transfers, rules, what-if scenarios): Answer with full analytical depth and authority. Never give generic refusal responses.
2. OUTPUT STRUCTURE:
   - When giving match plans, tactical analyses, or scout recommendations, structure your response using clear section headers:
     - 🎯 MATCH PLAN / خطة المباراة
     - ⚔️ OPPONENT ANALYSIS / تحليل الخصم
     - ⭐ KEY DANGER MEN / أخطر اللاعبين
     - 🧠 TACTICAL RECOMMENDATION / التوصيات التكتيكية
     - 📋 RECOMMENDED XI / التشكيلة المقترحة
     - 🔥 KEY INSTRUCTIONS / التعليمات الأساسية
     - 💎 TRANSFER RECOMMENDATIONS / توصيات الانتقالات
3. NO RAW ASTERISKS:
   - Avoid awkward markdown clutter like raw asterisks around quotes. Write clean, readable text.
4. GROUNDED DATA:
   - Always reference exact real players, clubs, ratings, and budgets from the database provided above.
`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-6)) {
          if (h.content && typeof h.content === "string" && h.content.trim()) {
            contents.push({
              role: h.role === "user" ? "user" : "model",
              parts: [{ text: h.content.trim() }],
            });
          }
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      for (const modelName of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: systemPrompt }],
                },
                contents,
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 4096,
                },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (generatedText && generatedText.trim()) {
              return await sendResponse(generatedText.trim());
            }
          }
        } catch (modelErr) {
          console.warn(`[Chief Scout] Gemini model ${modelName} failed, attempting next model in cascade...`);
        }
      }
    }

    // ── 2. FULL SEMANTIC IN-DATABASE ENGINE (FALLBACK) ────────────────────────
    // If Gemini APIs are unavailable, seamlessly generate full structured responses

    const isGK = (pos: string) => /gk/i.test(pos);
    const isDEF = (pos: string) => /cb|lb|rb|def/i.test(pos);
    const isMID = (pos: string) => /dmf|cmf|amf|mid/i.test(pos);
    const isATT = (pos: string) => /cf|st|lwf|rwf|att|fw/i.test(pos);

    const calcAvg = (arr: Array<{ overallRating: number | null }>) => {
      if (arr.length === 0) return 0;
      const total = arr.reduce((sum, p) => sum + (p.overallRating ?? 75), 0);
      return Math.round(total / arr.length);
    };

    const mySquad = club.players;
    const myGks = mySquad.filter((p) => isGK(p.position));
    const myDefs = mySquad.filter((p) => isDEF(p.position));
    const myMids = mySquad.filter((p) => isMID(p.position));
    const myAtts = mySquad.filter((p) => isATT(p.position));

    const squadOvr = calcAvg(mySquad);
    const gkOvr = calcAvg(myGks);
    const defOvr = calcAvg(myDefs);
    const midOvr = calcAvg(myMids);
    const attOvr = calcAvg(myAtts);

    // ── MATCH PLAN / OPPONENT QUERY (Arabic + English + French) ──────────────
    if (
      /خطة|ماتش|خصم|مباراة|مواجهة|الرجاء|الوداد|الجيش|تكتيك|تشكيلة|match|opponent|fixture|plan|tactical|lineup|starting xi/i.test(lower)
    ) {
      if (isArabic) {
        let reply = `🎯 خطة المباراة والتحليل التكتيكي الشامل\n\n`;
        if (upcomingMatch) {
          const isHome = upcomingMatch.homeClubId === club.id;
          const oppClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
          reply += `مواجهة الجولة ${upcomingMatch.matchday}: ${club.name} ضد ${oppClub.name} (${isHome ? "داخل الميدان 🏠" : "خارج الميدان ✈️"})\n\n`;
          reply += `⚔️ تحليل الخصم: نقاط القوة والضعف\n`;
          reply += `• نقاط القوة: هجمات مرتدة سريعة وضغط عالي في أول 20 دقيقة.\n`;
          reply += `• نقطة الضعف: ${opponentDossier.tacticalPlan.vulnerabilityZone || "المساحات النصفية خلف لاعبي الارتكاز"}.\n\n`;
          reply += `⭐ أخطر اللاعبين في صفوف الخصم\n`;
          reply += `• ${opponentDossier.tacticalPlan.keyThreat || "المهاجم الأساسي"}: مراقبة لصيقة وتضييق مساحات التسديد.\n\n`;
          reply += `🧠 التوصيات التكتيكية والخطة المقترحة\n`;
          reply += `• التشكيلة الموصى بها: ${opponentDossier.tacticalPlan.recommendedFormation} (${opponentDossier.tacticalPlan.mentalityLabel})\n`;
          reply += `• نسبة الفوز المتوقعة: ${opponentDossier.simulationOutcome.winProbability}%\n`;
          reply += `• واجب الرقابة: ${opponentDossier.tacticalPlan.manMarkingDuty}\n\n`;
          reply += `📋 التشكيلة الأساسية المقترحة\n`;
          mySquad.slice(0, 11).forEach((p, i) => {
            reply += `• ${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating} OVR)\n`;
          });
          reply += `\n🔥 التعليمات الأساسية\n`;
          reply += `• تدوير الكرة بهدوء واستغلال ثغرات الخصم.\n• الحذر من الكرات الثابتة والمرتدات السريعة.`;
        } else {
          reply += `لا توجد مباراة رسمية مجدولة حالياً في الدوري.\n\nالخطة العامة الموصى بها لتشكيلة ${club.name} هي **4-3-3 Balanced** للاستفادة القصوى من جودة لاعبيك.`;
        }
        return await sendResponse(reply);
      } else {
        let reply = `🎯 **MATCH PLAN & TACTICAL DOSSIER**\n\n`;
        if (upcomingMatch) {
          const isHome = upcomingMatch.homeClubId === club.id;
          const oppClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
          reply += `Matchday ${upcomingMatch.matchday}: **${club.name}** vs **${oppClub.name}** (${isHome ? "HOME 🏠" : "AWAY ✈️"})\n\n`;
          reply += `⚔️ **OPPONENT ANALYSIS**\n`;
          reply += `• Vulnerability Zone: ${opponentDossier.tacticalPlan.vulnerabilityZone}\n`;
          reply += `• Key Threat to Mark: **${opponentDossier.tacticalPlan.keyThreat}**\n\n`;
          reply += `🧠 **TACTICAL RECOMMENDATION**\n`;
          reply += `• Recommended Formation: \`${opponentDossier.tacticalPlan.recommendedFormation}\` (${opponentDossier.tacticalPlan.mentalityLabel})\n`;
          reply += `• Win Probability: **${opponentDossier.simulationOutcome.winProbability}%** (Projected: ${opponentDossier.simulationOutcome.projectedScore})\n\n`;
          reply += `📋 **RECOMMENDED STARTING XI**\n`;
          mySquad.slice(0, 11).forEach((p) => {
            reply += `• **${p.fullName}** (\`${p.position.toUpperCase()}\`, ${p.overallRating} OVR)\n`;
          });
        } else {
          reply += `No upcoming fixture currently scheduled. General recommended tactical setup for ${club.name} is **4-3-3 Control**.`;
        }
        return await sendResponse(reply);
      }
    }

    // ── POSITIONAL TRANSFER SEARCH ───────────────────────────────────────────
    const requestedPos = getPositionCategory(lower);
    if (requestedPos || /مهاجم|حارس|مدافع|وسط|جناح|striker|keeper|defender|midfielder|target|sign|buy/i.test(lower)) {
      const pos = requestedPos || "CF";
      const candidates = await prisma.player.findMany({
        where: {
          position: { contains: pos, mode: "insensitive" },
          status: "AVAILABLE",
          pmbClubId: null,
        },
        orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
        take: 4,
      });

      if (isArabic) {
        let reply = `💎 توصيات الانتقالات: أفضل اللاعبين المتاحين في مركز ${pos}\n\n`;
        candidates.forEach((p, idx) => {
          reply += `${idx + 1}. **${p.fullName}** (${p.position.toUpperCase()}, ${p.overallRating} OVR)\n`;
          reply += `   • القيمة السوقية: €${(Number(p.marketValue || 0)/1e6).toFixed(1)}M | الجنسية: 🇲🇦 ${p.nationality}\n`;
          reply += `   • تقييم الكشاف: إضافة قوية ومباشرة لتشكيلتك.\n\n`;
        });
        return await sendResponse(reply);
      } else {
        let reply = `💎 **TRANSFER RECOMMENDATIONS: TOP ${pos} TARGETS**\n\n`;
        candidates.forEach((p, idx) => {
          reply += `${idx + 1}. **${p.fullName}** — \`${p.position.toUpperCase()}\` | **${p.overallRating} OVR**\n`;
          reply += `   • Market Value: **€${(Number(p.marketValue || 0)/1e6).toFixed(1)}M** | Nationality: 🇲🇦 ${p.nationality}\n`;
          reply += `   • Chief Scout Verdict: High-impact addition within your €${budgetEur}M treasury.\n\n`;
        });
        return await sendResponse(reply);
      }
    }

    // ── GENERAL SQUAD BREAKDOWN ──────────────────────────────────────────────
    if (isArabic) {
      let reply = `📋 تقرير المدير الرياضي والكشاف الذكي (${club.name})\n\n`;
      reply += `• حجم التشكيلة: ${mySquad.length} لاعباً مسجلاً\n`;
      reply += `• الميزانية المتاحة: €${budgetEur}M\n`;
      reply += `• متوسط تقييم التشكيلة: ${squadOvr} OVR (حراسة: ${gkOvr} | دفاع: ${defOvr} | وسط: ${midOvr} | هجوم: ${attOvr})\n\n`;
      reply += `⭐ أبرز نجوم الفريق:\n`;
      mySquad.slice(0, 4).forEach((p, i) => {
        reply += `${i + 1}. **${p.fullName}** (${p.position.toUpperCase()}, ${p.overallRating} OVR)\n`;
      });
      reply += `\n💡 يمكنك سؤالي عن خطة أي مباراة، استكشاف صفقات بالاسم أو المركز، أو تحليل أندية الدوري!`;
      return await sendResponse(reply);
    } else {
      let reply = `📋 **CHIEF SCOUT SQUAD AUDIT (${club.name})**\n\n`;
      reply += `• Squad Size: ${mySquad.length} Registered Players\n`;
      reply += `• Available Budget: **€${budgetEur}M**\n`;
      reply += `• Overall Squad Rating: **${squadOvr} OVR** (GK: ${gkOvr} | DEF: ${defOvr} | MID: ${midOvr} | ATT: ${attOvr})\n\n`;
      reply += `⭐ **Key Squad Anchors**:\n`;
      mySquad.slice(0, 4).forEach((p, i) => {
        reply += `${i + 1}. **${p.fullName}** (\`${p.position.toUpperCase()}\`, **${p.overallRating} OVR**)\n`;
      });
      reply += `\n💡 Ask me anything about upcoming match plans, transfer targets by position/budget, or rival team analysis!`;
      return await sendResponse(reply);
    }
  } catch (error: any) {
    console.error("[Chief Scout Chat Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process scouting message" },
      { status: 500 }
    );
  }
}
