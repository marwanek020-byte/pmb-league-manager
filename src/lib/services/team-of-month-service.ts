import { prisma } from "@/lib/prisma";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";

export interface ClubMonthlyStats {
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  managerId: string | null;
  managerName: string;
  matchesPlayed: number;
  wins: number;
  awayWins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  bigMarginWins: number;
  winStreak: number;
  isUndefeated: boolean;
  aiScore: number;
  breakdown: {
    resultScore: number;
    attackScore: number;
    defenseScore: number;
    bonusScore: number;
  };
  summaryText: string;
}

export class TeamOfTheMonthService {
  /**
   * Calculates the 60% AI Performance Score for all clubs across a 4-round window.
   */
  public static async calculateMonthlyPerformance(
    startRound = 1,
    endRound = 4
  ): Promise<ClubMonthlyStats[]> {
    const matches = await prisma.match.findMany({
      where: {
        matchday: { gte: startRound, lte: endRound },
        status: "COMPLETED",
      },
      include: {
        homeClub: { include: { manager: true } },
        awayClub: { include: { manager: true } },
        league: true,
      },
      orderBy: { playedAt: "asc" },
    });

    if (matches.length === 0) return [];

    const statsMap = new Map<string, ClubMonthlyStats>();

    const getOrInitStats = (club: any): ClubMonthlyStats => {
      if (!statsMap.has(club.id)) {
        statsMap.set(club.id, {
          clubId: club.id,
          clubName: club.name,
          clubLogo: club.logo,
          managerId: club.manager?.id || null,
          managerName: club.manager?.username || `@${club.name.toLowerCase().replace(/\s+/g, "_")}`,
          matchesPlayed: 0,
          wins: 0,
          awayWins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          cleanSheets: 0,
          bigMarginWins: 0,
          winStreak: 0,
          isUndefeated: true,
          aiScore: 0,
          breakdown: {
            resultScore: 0,
            attackScore: 0,
            defenseScore: 0,
            bonusScore: 0,
          },
          summaryText: "",
        });
      }
      return statsMap.get(club.id)!;
    };

    // Process all match outcomes
    for (const match of matches) {
      const homeStats = getOrInitStats(match.homeClub);
      const awayStats = getOrInitStats(match.awayClub);

      const hG = match.homeGoals ?? 0;
      const aG = match.awayGoals ?? 0;

      // Home Club
      homeStats.matchesPlayed++;
      homeStats.goalsFor += hG;
      homeStats.goalsAgainst += aG;
      if (aG === 0) homeStats.cleanSheets++;

      // Away Club
      awayStats.matchesPlayed++;
      awayStats.goalsFor += aG;
      awayStats.goalsAgainst += hG;
      if (hG === 0) awayStats.cleanSheets++;

      if (hG > aG) {
        homeStats.wins++;
        homeStats.winStreak++;
        if (hG - aG >= 3) homeStats.bigMarginWins++;
        awayStats.losses++;
        awayStats.isUndefeated = false;
        awayStats.winStreak = 0;
      } else if (aG > hG) {
        awayStats.wins++;
        awayStats.awayWins++;
        awayStats.winStreak++;
        if (aG - hG >= 3) awayStats.bigMarginWins++;
        homeStats.losses++;
        homeStats.isUndefeated = false;
        homeStats.winStreak = 0;
      } else {
        homeStats.draws++;
        awayStats.draws++;
      }
    }

    // Compute AI Performance Score (0 - 100 Points)
    const rankedList: ClubMonthlyStats[] = [];

    for (const stats of Array.from(statsMap.values())) {
      if (stats.matchesPlayed === 0) continue;

      stats.goalDifference = stats.goalsFor - stats.goalsAgainst;

      // 1. Result Points (Max 40 pts)
      // Home Win = 10, Away Win = 13 (so +3 extra), Draw = 4
      const rawResult = stats.wins * 10 + stats.awayWins * 3 + stats.draws * 4;
      const resultScore = Math.min(40, Math.max(0, rawResult));

      // 2. Attack Power (Max 25 pts)
      // Goals * 2.5 + Big margin wins * 3
      const rawAttack = stats.goalsFor * 2.5 + stats.bigMarginWins * 3;
      const attackScore = Math.min(25, Math.max(0, rawAttack));

      // 3. Defensive Solidity (Max 20 pts)
      // Clean sheet = +5, Goal conceded = -1.5
      const rawDefense = stats.cleanSheets * 5 - stats.goalsAgainst * 1.5;
      const defenseScore = Math.min(20, Math.max(0, rawDefense));

      // 4. Streak & Form Bonus (Max 15 pts)
      let bonusScore = 0;
      if (stats.isUndefeated && stats.matchesPlayed >= 2) bonusScore += 7;
      if (stats.winStreak >= 3) bonusScore += 8;

      // Total Score
      const totalScore = Math.min(100, Math.round(resultScore + attackScore + defenseScore + bonusScore));

      stats.aiScore = totalScore;
      stats.breakdown = {
        resultScore: Math.round(resultScore),
        attackScore: Math.round(attackScore),
        defenseScore: Math.round(defenseScore),
        bonusScore: Math.round(bonusScore),
      };

      stats.summaryText = `🤖 AI Score: ${totalScore}/100 • ${stats.wins}W ${stats.draws}D ${stats.losses}L • ${stats.goalsFor} Goals • ${stats.cleanSheets} Clean Sheets`;

      rankedList.push(stats);
    }

    // Sort by AI Score descending
    return rankedList.sort((a, b) => b.aiScore - a.aiScore);
  }

  /**
   * Retrieves or automatically generates the official Global Manager of the Month Poll.
   * Only activates if at least 4 rounds (or 16 completed matches) exist.
   */
  public static async getOrGenerateMonthlyPoll(userId?: string) {
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"

    // 1. Check existing active poll
    let poll = await (prisma as any).managerPoll.findFirst({
      where: { month: currentMonth, isActive: true },
      include: {
        options: { orderBy: { voteCount: "desc" } },
        votes: userId ? { where: { userId } } : false,
      },
    });

    if (poll) {
      return this.formatPollResponse(poll, userId);
    }

    // 2. Scan completed matches
    const completedMatches = await prisma.match.findMany({
      where: { status: "COMPLETED" },
      select: { matchday: true },
    });

    const maxRound = completedMatches.reduce((max, m) => Math.max(max, m.matchday || 0), 0);

    // Require at least 4 matchdays completed across the league
    if (maxRound < 4 && completedMatches.length < 16) {
      return null;
    }

    // Determine 4-round window (e.g. 1-4, 5-8, etc.)
    const windowStart = Math.floor((maxRound - 1) / 4) * 4 + 1;
    const windowEnd = windowStart + 3;

    const rankedClubs = await this.calculateMonthlyPerformance(windowStart, windowEnd);
    if (rankedClubs.length < 2) return null;

    // Pick top 4 standout clubs
    const topCandidates = rankedClubs.slice(0, 4);

    const monthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

    poll = await (prisma as any).managerPoll.create({
      data: {
        title: `🏆 Global Manager of the Month — ${monthName}`,
        description: `Official 60% AI Performance + 40% Manager Community Vote. The winning tactician claims €1,000,000 & Golden MOTM honors!`,
        month: currentMonth,
        options: {
          create: topCandidates.map((c) => ({
            managerId: c.managerId || c.clubId,
            managerName: c.managerName,
            clubName: c.clubName,
            clubLogo: c.clubLogo,
            statement: c.summaryText,
          })),
        },
      },
      include: {
        options: { orderBy: { voteCount: "desc" } },
        votes: userId ? { where: { userId } } : false,
      },
    });

    return this.formatPollResponse(poll, userId);
  }

  /**
   * Resolves the monthly poll using the 60% AI + 40% Vote Formula and awards the €1,000,000 prize!
   */
  public static async resolveAndAwardWinner(pollId: string) {
    const poll = await (prisma as any).managerPoll.findUnique({
      where: { id: pollId },
      include: { options: true, votes: true },
    });

    if (!poll || !poll.isActive) return null;

    const totalVotes = poll.options.reduce((sum: number, o: any) => sum + o.voteCount, 0);

    // Calculate AI scores for the window
    const rankedClubs = await this.calculateMonthlyPerformance(1, 4);
    const clubScoreMap = new Map<string, number>();
    rankedClubs.forEach((c) => clubScoreMap.set(c.clubName.toLowerCase(), c.aiScore));

    let winningOption: any = null;
    let highestFinalScore = -1;

    const candidateResults = poll.options.map((opt: any) => {
      const aiScore = clubScoreMap.get(opt.clubName.toLowerCase()) || 75;
      const votePercent = totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 25;

      // 60% AI + 40% Vote
      const finalScore = Number((aiScore * 0.6 + votePercent * 0.4).toFixed(1));

      if (finalScore > highestFinalScore) {
        highestFinalScore = finalScore;
        winningOption = opt;
      }

      return {
        ...opt,
        aiScore,
        votePercent: Math.round(votePercent),
        finalScore,
      };
    });

    if (!winningOption) return null;

    // 1. Award €1,000,000 Prize to Winning Club Treasury
    const winningClub = await prisma.club.findFirst({
      where: {
        OR: [
          { name: { equals: winningOption.clubName, mode: "insensitive" } },
          { manager: { username: winningOption.managerName } },
        ],
      },
      include: { manager: true },
    });

    if (winningClub) {
      await prisma.club.update({
        where: { id: winningClub.id },
        data: { budget: { increment: 1_000_000 } },
      });

      await (prisma as any).clubBudgetTransaction.create({
        data: {
          clubId: winningClub.id,
          amount: 1_000_000,
          type: "BONUS",
          description: `🏆 Official PMB Global Manager of the Month Award (${poll.month})`,
        },
      });

      // 2. Publish Breaking Social Announcement
      const mediaBotId = await (UltrasSocialService as any).getOrCreateBotUser("pmb_sports_media", "ADMINISTRATOR");
      const postContent = `🏆 **رسمياً: تتويج مدرب الشهر في الدوري | GLOBAL MANAGER OF THE MONTH** 👑
━━━━━━━━━━━━━━━━━━━━
✍️ تعلن رابطة **PMB League** عن تتويج المدرب **${winningOption.managerName}** (${winningOption.clubName}) بجائزة مدرب الشهر بعد تفوقه في التقييم التكتيكي للذكاء الاصطناعي (60%) وتصويت الجماهير (40%)!

📊 **تفاصيل النتيجة النهائية**:
• 🤖 تقييم الأداء التكتيكي (AI): **${highestFinalScore} pts**
• 💰 المكافأة المالية: **€1,000,000** أُضيفت لخزينة النادي
• 🎖️ وسام التميز الذهبي الرسمي المعتمد

تهانينا لنادي **${winningOption.clubName}** وللمدرب المتألق! 🔥👏

#ManagerOfTheMonth #${winningOption.clubName.replace(/\s+/g, "")} #PMBAwards #مدرب_الشهر`;

      await prisma.post.create({
        data: {
          content: postContent,
          tag: "VICTORY",
          userId: mediaBotId,
          clubId: winningClub.id,
        },
      });
    }

    // 3. Mark Poll as Completed
    await (prisma as any).managerPoll.update({
      where: { id: pollId },
      data: { isActive: false },
    });

    return {
      winner: winningOption,
      highestFinalScore,
      candidateResults,
    };
  }

  private static formatPollResponse(poll: any, userId?: string) {
    const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + opt.voteCount, 0);
    const userVotedOptionId = poll.votes && poll.votes.length > 0 ? poll.votes[0].optionId : null;

    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      month: poll.month,
      totalVotes,
      userVotedOptionId,
      hasVoted: Boolean(userVotedOptionId),
      options: poll.options.map((opt: any) => ({
        id: opt.id,
        managerId: opt.managerId,
        managerName: opt.managerName,
        clubName: opt.clubName,
        clubLogo: opt.clubLogo,
        statement: opt.statement,
        voteCount: opt.voteCount,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
      })),
    };
  }
}
