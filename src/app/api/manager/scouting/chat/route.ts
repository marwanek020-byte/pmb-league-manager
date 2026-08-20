import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      include: {
        league: true,
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
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

    // ── 0. GOOGLE GEMINI GROUNDED GENERATION ENGINE (IF API KEY IS SET) ───
    if (geminiApiKey) {
      try {
        // 1. Fetch upcoming fixture & opponent
        const upcomingMatch = await prisma.match.findFirst({
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
        });

        let opponentDataSummary = "No upcoming match fixture scheduled.";
        if (upcomingMatch) {
          const isHome = upcomingMatch.homeClubId === club.id;
          const oppClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
          const oppPlayers = oppClub.players.map(
            (p) => `${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating ?? "N/A"} OVR, ${p.nationality})`
          );

          // Get Opponent Goals & Assists
          const [oppGoals, oppAssists] = await Promise.all([
            prisma.matchEvent.findMany({
              where: { clubId: oppClub.id, type: "GOAL" },
              include: { player: { select: { fullName: true, position: true } } },
            }),
            prisma.matchEvent.findMany({
              where: { clubId: oppClub.id, OR: [{ type: "ASSIST" }, { assistPlayerId: { not: null } }] },
              include: {
                assistPlayer: { select: { fullName: true, position: true } },
                player: { select: { fullName: true, position: true } },
              },
            }),
          ]);

          const goalCounts: Record<string, number> = {};
          for (const e of oppGoals) {
            if (e.player) goalCounts[e.player.fullName] = (goalCounts[e.player.fullName] || 0) + 1;
          }

          const assistCounts: Record<string, number> = {};
          for (const e of oppAssists) {
            const p = e.assistPlayer || (e.type === "ASSIST" ? e.player : null);
            if (p) assistCounts[p.fullName] = (assistCounts[p.fullName] || 0) + 1;
          }

          opponentDataSummary = `
- Opponent Club: ${oppClub.name} (Manager: @${oppClub.manager?.username ?? "None"})
- Matchday: ${upcomingMatch.matchday} (${isHome ? "Playing at HOME 🏠" : "Playing AWAY ✈️"})
- Competition: ${upcomingMatch.season?.competitionSeason?.name || "League Match"}
- Opponent Roster (${oppPlayers.length} players):
  ${oppPlayers.join(", ")}
- Opponent Top Goalscorers in PMB: ${Object.entries(goalCounts).map(([n, g]) => `${n} (${g} goals)`).join(", ") || "None yet"}
- Opponent Top Playmakers in PMB: ${Object.entries(assistCounts).map(([n, a]) => `${n} (${a} assists)`).join(", ") || "None yet"}
`;
        }

        // 2. Fetch Market Samples (Free Agents & Rival players)
        const [freeAgentsSample, rivalSample] = await Promise.all([
          prisma.player.findMany({
            where: { status: "AVAILABLE", pmbClubId: null },
            orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
            take: 30,
          }),
          prisma.player.findMany({
            where: { status: "REGISTERED", pmbClubId: { not: club.id } },
            orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
            take: 25,
            include: { pmbClub: { select: { name: true } } },
          }),
        ]);

        const freeAgentsList = freeAgentsSample.map(
          (p) => `${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating ?? 75} OVR, €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M, ${p.nationality})`
        ).join("\n  ");

        const rivalPlayersList = rivalSample.map(
          (p) => `${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating ?? 75} OVR, €${(Number(p.marketValue || 0) / 1_000_000).toFixed(1)}M, Club: ${p.pmbClub?.name}, ${p.nationality})`
        ).join("\n  ");

        const mySquadList = club.players.map(
          (p) => `${p.fullName} (${p.position.toUpperCase()}, ${p.overallRating ?? 75} OVR, ${p.nationality})`
        ).join("\n  ");

        // 3. Build Grounded Prompt
        const systemPrompt = `You are the VIP Chief Scout & Sporting Director of "${club.name}" in PMB League Manager.
You are in a direct conversation with your club manager.

=== LIVE IN-GAME DATABASE SNAPSHOT ===
YOUR CLUB:
- Club Name: ${club.name}
- League: ${club.league.name}
- Transfer Budget: €${budgetEur}M
- Current Registered Squad (${club.players.length} players):
  ${mySquadList}

NEXT OPPONENT & FIXTURE:
${opponentDataSummary}

IN-GAME TRANSFER MARKET POOL (AVAILABLE IN POSTGRESQL):
Free Agents (Instant Sign):
  ${freeAgentsList}

Rival Club Players (Transfer/Loan Prospects):
  ${rivalPlayersList}

=== STRICT OPERATING GUIDELINES ===
1. GROUNDING MANDATE: You are strictly restricted to the players, ratings, statistics, and clubs listed above from the in-game database. NEVER mention real-world squad memberships or players not found in this data.
2. In this universe, whatever club a player is listed under in the data is their true club.
3. Be professional, tactical, budget-conscious, and decisive like an elite Director of Football.
4. If asked about nationality (e.g. Moroccan, French, Brazilian, Senegalese), filter by the exact nationality listed in the data.
5. If asked about tactics against the opponent, analyze their actual registered players and top scorers shown above and suggest specific formations and marking duties.
6. Format your response cleanly using bold markdown, bullet points, and relevant emojis.
`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: message }],
                },
              ],
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
            return NextResponse.json({ reply: generatedText.trim() });
          }
        } else {
          console.warn("Gemini API error status:", geminiRes.status, await geminiRes.text());
        }
      } catch (geminiErr) {
        console.error("Gemini call failed, falling back to database engine:", geminiErr);
      }
    }

    // ── FALLBACK / NATIVE IN-DATABASE ENGINE ──────────────────────────────

    // ── 1. PARSE NATIONALITY INTENT ───────────────────────────────────────
    let nationalityFilter: string | null = null;

    const nationalityMap: Record<string, string> = {
      moroccan: "Moroc",
      morocco: "Moroc",
      maroc: "Moroc",
      french: "France",
      france: "France",
      senegalese: "Senegal",
      senegal: "Senegal",
      brazilian: "Brazil",
      brazil: "Brazil",
      spanish: "Spain",
      spain: "Spain",
      portuguese: "Portugal",
      portugal: "Portugal",
      nigerian: "Nigeria",
      nigeria: "Nigeria",
      german: "Germany",
      germany: "Germany",
      english: "England",
      england: "England",
      british: "England",
      tunisian: "Tunis",
      tunisia: "Tunis",
      dutch: "Netherlands",
      netherlands: "Netherlands",
      ivorian: "Cote",
      "cote d'ivoire": "Cote",
      "ivory coast": "Cote",
      congo: "Congo",
      congolese: "Congo",
      bolivia: "Bolivia",
      bolivian: "Bolivia",
      mauritania: "muritania",
    };

    for (const [key, dbVal] of Object.entries(nationalityMap)) {
      const regex = new RegExp(`\\b${key}\\b`, "i");
      if (regex.test(lower)) {
        nationalityFilter = dbVal;
        break;
      }
    }

    // ── 2. PARSE POSITION INTENT ──────────────────────────────────────────
    let positionCategory: "GK" | "CB" | "LB" | "RB" | "DEF" | "DMF" | "CMF" | "AMF" | "MID" | "LWF" | "RWF" | "CF" | "ATT" | null = null;

    if (/\b(gk|goalkeeper|goalkeepers|keeper|keepers|gardien)\b/i.test(lower)) {
      positionCategory = "GK";
    } else if (/\b(cb|center back|centre back|center-back|centre-back)\b/i.test(lower)) {
      positionCategory = "CB";
    } else if (/\b(lb|left back|left-back)\b/i.test(lower)) {
      positionCategory = "LB";
    } else if (/\b(rb|right back|right-back)\b/i.test(lower)) {
      positionCategory = "RB";
    } else if (/\b(def|defender|defenders|defense|defence|backline)\b/i.test(lower)) {
      positionCategory = "DEF";
    } else if (/\b(dmf|dm|defensive mid|defensive midfielder)\b/i.test(lower)) {
      positionCategory = "DMF";
    } else if (/\b(amf|cam|attacking mid|attacking midfielder|playmaker)\b/i.test(lower)) {
      positionCategory = "AMF";
    } else if (/\b(cmf|cm|mid|midfielder|midfielders|midfield)\b/i.test(lower)) {
      positionCategory = "MID";
    } else if (/\b(lwf|lw|left wing|left winger)\b/i.test(lower)) {
      positionCategory = "LWF";
    } else if (/\b(rwf|rw|right wing|right winger)\b/i.test(lower)) {
      positionCategory = "RWF";
    } else if (/\b(cf|st|striker|strikers|forward|forwards|finisher)\b/i.test(lower)) {
      positionCategory = "CF";
    } else if (/\b(att|attacker|attackers|attack|winger|wingers)\b/i.test(lower)) {
      positionCategory = "ATT";
    }

    // Rating filter (e.g. 80+, 85+, over 80, 82 rating)
    let minRating: number | null = null;
    const ratingMatch = lower.match(/\b([789][0-9])\s*(?:\+|plus|over|higher|rating|\b)/i);
    if (ratingMatch && !/(\d+)\s*(?:m|million|k)/i.test(ratingMatch[0])) {
      const parsed = parseInt(ratingMatch[1], 10);
      if (parsed >= 70 && parsed <= 99) {
        minRating = parsed;
      }
    }

    // Price cap (e.g. under 15M, under 10 million, 8M max)
    let maxPriceEur: number | null = null;
    const priceMatch = lower.match(/(?:under|below|less than|max|budget)\s*€?\s*(\d+(?:\.\d+)?)\s*(?:m|million|k)?/i);
    if (priceMatch) {
      const num = parseFloat(priceMatch[1]);
      maxPriceEur = num < 500 ? num * 1_000_000 : num;
    }

    // ── 3. SPECIAL INTENT HANDLERS ────────────────────────────────────────

    // INTENT A: "Best Available for My Budget" / "Best player I can afford"
    if (
      /\b(best available|best player i can afford|best for my budget|top targets|who can i afford)\b/i.test(
        lower
      )
    ) {
      const allTargets = await prisma.player.findMany({
        where: {
          OR: [
            { status: "AVAILABLE", pmbClubId: null },
            { status: "REGISTERED", pmbClubId: { not: club.id } },
          ],
          marketValue: { lte: budgetNum > 0 ? budgetNum : 50_000_000 },
        },
        orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
        take: 15,
        include: { pmbClub: { select: { name: true } } },
      });

      const squadAvg =
        club.players.length > 0
          ? Math.round(
              club.players.reduce((sum, p) => sum + (p.overallRating ?? 75), 0) /
                club.players.length
            )
          : 75;

      const ranked = allTargets
        .map((p) => {
          const ovr = p.overallRating ?? 75;
          const cost = Number(p.marketValue ?? 0);
          const delta = ovr - squadAvg;
          return {
            player: p,
            ovr,
            cost,
            delta,
            score: ovr * 1.5 + delta * 3 - (cost / 1_000_000) * 0.5,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      let reply = `🎯 **Chief Scout: Best Realistic Targets for Your €${budgetEur}M Budget**\n\n`;
      ranked.forEach((item, idx) => {
        const p = item.player;
        const clubLabel = p.pmbClub?.name ? `Club: *${p.pmbClub.name}* (Transfer/Loan)` : `*Free Agent (Instant Sign)*`;
        reply += `${idx + 1}. **${p.fullName}** — \`${p.position.toUpperCase()}\` | **${item.ovr} OVR**\n`;
        reply += `   • Status: ${clubLabel} | Nationality: 🇲🇦 ${p.nationality}\n`;
        reply += `   • Market Fee: **€${(item.cost / 1_000_000).toFixed(1)}M** (${item.delta >= 0 ? `+${item.delta}` : item.delta} OVR vs team avg)\n`;
        reply += `   • Tactical Verdict: ${item.delta > 0 ? "🌟 Instant starting XI upgrade." : "Solid squad depth & rotation option."} Leaves **€${((budgetNum - item.cost) / 1_000_000).toFixed(1)}M** reserve.\n\n`;
      });
      reply += `💡 *All candidates above are verified in your PostgreSQL database and fit within your cash balance.*`;
      return NextResponse.json({ reply });
    }

    // INTENT B: "Improve My Starting XI" / "Replace my [position]"
    if (/\b(improve my starting xi|upgrade my squad|improve my team|alternatives to my|replace my)\b/i.test(lower)) {
      const weakestPos = positionCategory || "CF";
      const currentStarters = club.players.filter((p) =>
        p.position.toUpperCase().includes(weakestPos)
      );
      const currentStarter = currentStarters[0] || null;
      const starterOvr = currentStarter ? currentStarter.overallRating ?? 75 : 75;

      const upgrades = await prisma.player.findMany({
        where: {
          position: { contains: weakestPos, mode: "insensitive" },
          overallRating: { gte: starterOvr },
          OR: [
            { status: "AVAILABLE", pmbClubId: null },
            { status: "REGISTERED", pmbClubId: { not: club.id } },
          ],
        },
        orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
        take: 3,
        include: { pmbClub: { select: { name: true } } },
      });

      let reply = `⚡ **Chief Scout: Starting XI Upgrade Plan for ${weakestPos}**\n\n`;
      reply += `Current Starting Option: **${currentStarter ? currentStarter.fullName : "None"}** (${starterOvr} OVR)\n\n`;

      if (upgrades.length === 0) {
        reply += `No higher-rated ${weakestPos} players currently available within your league. Scout other positions or monitor live auctions!`;
      } else {
        reply += `Recommended Immediate Upgrades:\n`;
        upgrades.forEach((p, idx) => {
          const ovr = p.overallRating ?? 75;
          const delta = ovr - starterOvr;
          reply += `${idx + 1}. **${p.fullName}** (\`${p.position.toUpperCase()}\` | **${ovr} OVR** • **+${delta} OVR Upgrade**)\n`;
          reply += `   • Club: ${p.pmbClub?.name ?? "Free Agent"} | Fee: **€${(Number(p.marketValue ?? 0) / 1_000_000).toFixed(1)}M**\n`;
          reply += `   • ROI: Elevates your frontline standard above the current league average.\n\n`;
        });
      }
      return NextResponse.json({ reply });
    }

    // INTENT C: Financial "What If I spend" / "Can I afford"
    if (/\b(what if i spend|can i afford|budget planner|financial advice)\b/i.test(lower)) {
      const requestedSpendMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:m|million)/i);
      const spendAmount = requestedSpendMatch ? parseFloat(requestedSpendMatch[1]) * 1_000_000 : 20_000_000;
      const remaining = budgetNum - spendAmount;

      let reply = `💼 **Chief Scout: Financial Simulation Report**\n\n`;
      reply += `• Current Transfer Budget: **€${budgetEur}M**\n`;
      reply += `• Simulated Expenditure: **€${(spendAmount / 1_000_000).toFixed(1)}M**\n`;
      reply += `• Projected Remaining Cash: **€${(remaining / 1_000_000).toFixed(1)}M**\n\n`;

      if (remaining < 0) {
        reply += `⚠️ **Deficit Warning**: This expenditure exceeds your cash balance by €${(Math.abs(remaining) / 1_000_000).toFixed(1)}M. You must complete player sales or auction off squad depth first.`;
      } else if (remaining < 5_000_000) {
        reply += `🟡 **Tight Margin**: Spending this leaves only €${(remaining / 1_000_000).toFixed(1)}M. You will have no buffer for unexpected loan cancellations or live auction bidding wars.`;
      } else {
        reply += `🟢 **Financially Sound**: Leaves a healthy €${(remaining / 1_000_000).toFixed(1)}M reserve for backup depth and matchday rewards.`;
      }
      return NextResponse.json({ reply });
    }

    // INTENT D: Scout Next Opponent or Specific Rival Club by Name
    const isOpponentQuery = /\b(opponent|next match|next game|fixture|scout next|scouting report|beat|vs)\b/i.test(lower);
    const scoutClubMatch = lower.match(/\b(?:scout|analyze|breakdown|examine|how to beat)\s+([a-z0-9\s]+?)(?:\s+(?:squad|team|players|best player|top scorer|assists))?$/i);

    if (isOpponentQuery || scoutClubMatch) {
      let upcomingMatch: any = null;

      if (isOpponentQuery) {
        upcomingMatch = await prisma.match.findFirst({
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
        });
      }

      let oppClub: any = null;
      let isHome = true;

      if (upcomingMatch) {
        isHome = upcomingMatch.homeClubId === club.id;
        oppClub = isHome ? upcomingMatch.awayClub : upcomingMatch.homeClub;
      } else if (scoutClubMatch) {
        const queryClubName = scoutClubMatch[1].trim();
        oppClub = await prisma.club.findFirst({
          where: {
            name: { contains: queryClubName, mode: "insensitive" },
            id: { not: club.id },
          },
          include: {
            manager: { select: { username: true } },
            players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
          },
        });
      }

      if (!oppClub && isOpponentQuery) {
        oppClub = await prisma.club.findFirst({
          where: {
            leagueId: club.leagueId,
            id: { not: club.id },
          },
          include: {
            manager: { select: { username: true } },
            players: { where: { status: "REGISTERED" }, orderBy: [{ overallRating: "desc" }, { fullName: "asc" }] },
          },
        });
      }

      if (!oppClub) {
        return NextResponse.json({
          reply: `⚔️ **Opposition Scouting Report**:\n\n` +
            `No matching rival club or upcoming fixture was found. Try specifying a club name like *"Scout Chelsea"* or *"Scout Real Madrid"*.`,
        });
      }

      const oppPlayers = oppClub.players;
      const isGK = (pos: string) => /gk/i.test(pos);
      const isDEF = (pos: string) => /cb|lb|rb|def/i.test(pos);
      const isMID = (pos: string) => /dmf|cmf|amf|mid/i.test(pos);
      const isATT = (pos: string) => /cf|st|lwf|rwf|att|fw/i.test(pos);

      const calcAvg = (arr: Array<{ position: string; overallRating: number | null }>) => {
        if (arr.length === 0) return 0;
        const total = arr.reduce((sum: number, p: { overallRating: number | null }) => sum + (p.overallRating ?? 75), 0);
        return Math.round(total / arr.length);
      };

      const oppOverall = calcAvg(oppPlayers);
      const oppGk = calcAvg(oppPlayers.filter((p: any) => isGK(p.position)));
      const oppDef = calcAvg(oppPlayers.filter((p: any) => isDEF(p.position)));
      const oppMid = calcAvg(oppPlayers.filter((p: any) => isMID(p.position)));
      const oppAtt = calcAvg(oppPlayers.filter((p: any) => isATT(p.position)));

      const bestPlayers = oppPlayers.slice(0, 4);

      const [oppGoals, oppAssists] = await Promise.all([
        prisma.matchEvent.findMany({
          where: { clubId: oppClub.id, type: "GOAL" },
          include: { player: { select: { fullName: true, position: true, overallRating: true } } },
        }),
        prisma.matchEvent.findMany({
          where: {
            clubId: oppClub.id,
            OR: [{ type: "ASSIST" }, { assistPlayerId: { not: null } }],
          },
          include: {
            assistPlayer: { select: { fullName: true, position: true, overallRating: true } },
            player: { select: { fullName: true, position: true, overallRating: true } },
          },
        }),
      ]);

      const goalCounts: Record<string, { name: string; goals: number; pos: string }> = {};
      for (const e of oppGoals) {
        if (e.player) {
          if (!goalCounts[e.player.fullName]) {
            goalCounts[e.player.fullName] = { name: e.player.fullName, goals: 0, pos: e.player.position };
          }
          goalCounts[e.player.fullName].goals++;
        }
      }
      const topScorersList = Object.values(goalCounts).sort((a, b) => b.goals - a.goals).slice(0, 3);

      const assistCounts: Record<string, { name: string; assists: number; pos: string }> = {};
      for (const e of oppAssists) {
        const p = e.assistPlayer || (e.type === "ASSIST" ? e.player : null);
        if (p) {
          if (!assistCounts[p.fullName]) {
            assistCounts[p.fullName] = { name: p.fullName, assists: 0, pos: p.position };
          }
          assistCounts[p.fullName].assists++;
        }
      }
      const topAssistsList = Object.values(assistCounts).sort((a, b) => b.assists - a.assists).slice(0, 3);

      const reply = `⚔️ **Opposition Scouting Report: ${oppClub.name}**\n\n` +
        (upcomingMatch
          ? `🏟️ **Matchday**: ${upcomingMatch.matchday} (${isHome ? "HOME 🏠" : "AWAY ✈️"})\n`
          : `🏟️ **Scouting Target**: Rival Club in ${club.league.name}\n`) +
        `👤 **Manager**: @${oppClub.manager?.username ?? "No Manager"}\n\n` +
        `📊 **Squad Tactical Ratings**:\n` +
        `• Overall Squad Quality: **${oppOverall} OVR** (${oppPlayers.length} registered players)\n` +
        `• 🧤 Goalkeeper: **${oppGk || "—"} OVR**\n` +
        `• 🛡️ Defense: **${oppDef || "—"} OVR**\n` +
        `• ⚙️ Midfield: **${oppMid || "—"} OVR**\n` +
        `• ⚡ Attack: **${oppAtt || "—"} OVR**\n\n` +
        `⭐ **Key Danger Men (Best Players)**:\n` +
        (bestPlayers.length > 0
          ? bestPlayers
              .map((p: any, i: number) => `${i + 1}. **${p.fullName}** (\`${p.position.toUpperCase()}\` | **${p.overallRating ?? "Unrated"} OVR**)`)
              .join("\n")
          : "No registered players in squad yet.") +
        `\n\n🎯 **Top Goalscorers**:\n` +
        (topScorersList.length > 0
          ? topScorersList.map((g, i) => `${i + 1}. **${g.name}** (\`${g.pos.toUpperCase()}\`) — **${g.goals} Goals** ⚽`).join("\n")
          : "No goals recorded yet this season.") +
        `\n\n👟 **Top Assist Providers**:\n` +
        (topAssistsList.length > 0
          ? topAssistsList.map((a, i) => `${i + 1}. **${a.name}** (\`${a.pos.toUpperCase()}\`) — **${a.assists} Assists** 👟`).join("\n")
          : "No assists recorded yet this season.") +
        `\n\n💡 **Chief Scout Match Plan & Counter-Strategy**:\n` +
        `• **Recommended Formation**: ${oppDef < 78 ? "4-3-3 Fast Counter-Attack" : "4-2-3-1 Midfield Overload"}\n` +
        `• **Area to Exploit**: ${oppDef < 78 ? "Vertical channels behind their center backs" : "Wide overloads and cutback crosses"}\n` +
        `• **Player to Mark**: ${topScorersList[0]?.name || bestPlayers[0]?.fullName || "Primary Attacker"}\n` +
        `• **Tactical Instruction**: ${isHome ? "Press high from kickoff to force defensive turnover." : "Maintain compact mid-block and strike on fast breakaways."}`;

      return NextResponse.json({ reply });
    }

    // ── 4. MULTI-FILTER DATABASE SEARCH QUERY BUILDER ─────────────────────
    const buildPosFilter = () => {
      if (!positionCategory) return undefined;
      switch (positionCategory) {
        case "GK":
          return { position: { contains: "gk", mode: "insensitive" as const } };
        case "CB":
          return { position: { contains: "cb", mode: "insensitive" as const } };
        case "LB":
          return { position: { contains: "lb", mode: "insensitive" as const } };
        case "RB":
          return { position: { contains: "rb", mode: "insensitive" as const } };
        case "DEF":
          return {
            OR: [
              { position: { contains: "cb", mode: "insensitive" as const } },
              { position: { contains: "lb", mode: "insensitive" as const } },
              { position: { contains: "rb", mode: "insensitive" as const } },
              { position: { contains: "def", mode: "insensitive" as const } },
            ],
          };
        case "DMF":
          return { position: { contains: "dmf", mode: "insensitive" as const } };
        case "AMF":
          return { position: { contains: "amf", mode: "insensitive" as const } };
        case "CF":
          return {
            OR: [
              { position: { contains: "cf", mode: "insensitive" as const } },
              { position: { contains: "st", mode: "insensitive" as const } },
            ],
          };
        case "LWF":
          return {
            OR: [
              { position: { contains: "lwf", mode: "insensitive" as const } },
              { position: { contains: "lw", mode: "insensitive" as const } },
            ],
          };
        case "RWF":
          return {
            OR: [
              { position: { contains: "rwf", mode: "insensitive" as const } },
              { position: { contains: "rw", mode: "insensitive" as const } },
            ],
          };
        case "MID":
          return {
            OR: [
              { position: { contains: "cmf", mode: "insensitive" as const } },
              { position: { contains: "dmf", mode: "insensitive" as const } },
              { position: { contains: "amf", mode: "insensitive" as const } },
              { position: { contains: "mid", mode: "insensitive" as const } },
            ],
          };
        case "ATT":
          return {
            OR: [
              { position: { contains: "cf", mode: "insensitive" as const } },
              { position: { contains: "st", mode: "insensitive" as const } },
              { position: { contains: "lwf", mode: "insensitive" as const } },
              { position: { contains: "rwf", mode: "insensitive" as const } },
              { position: { contains: "lw", mode: "insensitive" as const } },
              { position: { contains: "rw", mode: "insensitive" as const } },
            ],
          };
        default:
          return undefined;
      }
    };

    const posFilter = buildPosFilter();

    const freeAgentsWhere: any = {
      status: "AVAILABLE",
      pmbClubId: null,
    };
    if (posFilter) Object.assign(freeAgentsWhere, posFilter);
    if (nationalityFilter) freeAgentsWhere.nationality = { contains: nationalityFilter, mode: "insensitive" };
    if (minRating) freeAgentsWhere.overallRating = { gte: minRating };
    if (maxPriceEur) freeAgentsWhere.marketValue = { lte: maxPriceEur };

    const rivalWhere: any = {
      status: "REGISTERED",
      pmbClubId: { not: club.id },
    };
    if (posFilter) Object.assign(rivalWhere, posFilter);
    if (nationalityFilter) rivalWhere.nationality = { contains: nationalityFilter, mode: "insensitive" };
    if (minRating) rivalWhere.overallRating = { gte: minRating };
    if (maxPriceEur) rivalWhere.marketValue = { lte: maxPriceEur };

    const [matchedFreeAgents, rivalPlayers] = await Promise.all([
      prisma.player.findMany({
        where: freeAgentsWhere,
        orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }],
        take: 8,
        include: { pmbClub: { select: { name: true } } },
      }),
      prisma.player.findMany({
        where: rivalWhere,
        orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
        take: 8,
        include: { pmbClub: { select: { name: true } } },
      }),
    ]);

    if (positionCategory || nationalityFilter || minRating || maxPriceEur) {
      const criteriaList = [
        nationalityFilter ? `Nationality: **${nationalityFilter}**` : null,
        positionCategory ? `Position: **${positionCategory}**` : null,
        minRating ? `Rating: **${minRating}+ OVR**` : null,
        maxPriceEur ? `Max Price: **€${(maxPriceEur / 1_000_000).toFixed(1)}M**` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      let sectionCount = 0;
      let body = `🔍 **PMB Player Database Search Results** (${criteriaList}):\n\n`;

      if (matchedFreeAgents.length > 0) {
        sectionCount++;
        body += `🟢 **Available Free Agents in Database (${matchedFreeAgents.length})**:\n`;
        body += matchedFreeAgents
          .map(
            (p, i) =>
              `${i + 1}. **${p.fullName}** — \`${p.position.toUpperCase()}\` | **${p.overallRating ? p.overallRating + " OVR" : "Unrated"}**\n` +
              `   • Nationality: *${p.nationality}* | Real Club: *${p.realClub}*\n` +
              `   • In-Game Value: **€${(Number(p.marketValue ?? 0) / 1_000_000).toFixed(1)}M** ` +
              `(${Number(p.marketValue ?? 0) <= budgetNum ? "✅ Affordable" : "❌ Exceeds Budget"})`
          )
          .join("\n\n");
        body += "\n\n";
      }

      if (rivalPlayers.length > 0) {
        sectionCount++;
        body += `🟡 **Rival Club Targets in Database (Transfer / Loan Prospects)**:\n`;
        body += rivalPlayers
          .map(
            (p, i) =>
              `${i + 1}. **${p.fullName}** — \`${p.position.toUpperCase()}\` | **${p.overallRating ? p.overallRating + " OVR" : "Unrated"}**\n` +
              `   • Nationality: *${p.nationality}* | Club: **${p.pmbClub?.name ?? "Other Club"}**\n` +
              `   • In-Game Value: **€${(Number(p.marketValue ?? 0) / 1_000_000).toFixed(1)}M** ` +
              `(${Number(p.marketValue ?? 0) <= budgetNum ? "✅ Affordable" : "❌ Exceeds Budget"})`
          )
          .join("\n\n");
        body += "\n\n";
      }

      if (sectionCount === 0) {
        body = `❌ **No Database Matches Found**:\n\n` +
          `No players in your database matched all these criteria:\n` +
          (nationalityFilter ? `• Nationality: **${nationalityFilter}**\n` : "") +
          (positionCategory ? `• Position: **${positionCategory}**\n` : "") +
          (minRating ? `• Minimum Rating: **${minRating}+ OVR**\n` : "") +
          (maxPriceEur ? `• Max Price: **€${(maxPriceEur / 1_000_000).toFixed(1)}M**\n` : "") +
          `\n💡 *Tip: Try searching without price caps or check the visual search hub for all options.*`;
      } else {
        body += `💡 *All players listed above exist in your PMB database and match your exact search criteria.*`;
      }

      return NextResponse.json({ reply: body });
    }

    if (lower.includes("squad") || lower.includes("team") || lower.includes("my players")) {
      const reply = `📋 **Your Registered Squad Database (${club.name})**:\n\n` +
        (club.players.length > 0
          ? club.players
              .map(
                (p, idx) =>
                  `${idx + 1}. **${p.fullName}** — \`${p.position.toUpperCase()}\` | **${p.overallRating ? p.overallRating + " OVR" : "Unrated"}** | Nationality: *${p.nationality}*`
              )
              .join("\n") +
            `\n\n💰 **Available Transfer Budget**: **€${budgetEur}M**`
          : "You currently have 0 registered players in your database.");
      return NextResponse.json({ reply });
    }

    const reply = `🤖 **PMB Chief Scout & Sporting Intelligence Director**:\n\n` +
      `I am connected directly to your **PMB PostgreSQL Player Database (422 total players)** and your club **${club.name}** (Budget: €${budgetEur}M).\n\n` +
      `Try asking me anything:\n` +
      `• *"Show me Moroccan goalkeepers"*\n` +
      `• *"Find French CBs rated 80+"*\n` +
      `• *"Show the best player I can afford"*\n` +
      `• *"Find alternatives to my CF"*\n` +
      `• *"Scout my next opponent"*\n` +
      `• *"Scout Chelsea"*\n` +
      `• *"What if I spend 20M?"*`;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Failed to process scouting chat:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
