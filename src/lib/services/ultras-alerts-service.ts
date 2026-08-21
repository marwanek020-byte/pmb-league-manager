import { prisma } from "@/lib/prisma";
import { getClubUltras } from "./ultras-registry";
import { UltrasSocialService } from "./ultras-social-service";

export type UltrasAlertType =
  | "MATCHDAY_ALERT"      // 🚨 2h before kickoff
  | "RIVAL_CLASH_ALERT"   // ⚔️ Table rival drops points
  | "MORALE_WARNING"      // 📉 Morale drops below 40%
  | "TRANSFER_REACTION";  // 💣 New signing reaction

export interface ProactiveUltrasAlert {
  id: string;
  type: UltrasAlertType;
  title: string;
  icon: string;
  severity: "URGENT" | "CRITICAL" | "INFO";
  message: string;
  timestamp: string;
  actionHref?: string;
  actionLabel?: string;
}

export class UltrasAlertsService {
  /**
   * Helper to ensure an AI Ultras Bot user exists in the database
   */
  private static async getOrCreateBotUser(username: string): Promise<string> {
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await prisma.user.create({
      data: {
        username,
        password: "AI_BOT_SECURE_PASSWORD",
        role: "ADMINISTRATOR",
      },
      select: { id: true },
    });
    return created.id;
  }

  /**
   * Fetches all active proactive alerts for a club manager
   */
  public static async getProactiveAlertsForClub(clubId: string): Promise<ProactiveUltrasAlert[]> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        manager: true,
        homeMatches: { where: { status: "UPCOMING" }, orderBy: { matchday: "asc" }, include: { awayClub: true } },
        awayMatches: { where: { status: "UPCOMING" }, orderBy: { matchday: "asc" }, include: { homeClub: true } },
      },
    });

    if (!club) return [];

    const ultras = getClubUltras(club.name);
    const alerts: ProactiveUltrasAlert[] = [];

    // 1. Check Matchday Alert
    const nextHome = club.homeMatches[0];
    const nextAway = club.awayMatches[0];
    const nextMatch = nextHome || nextAway;
    if (nextMatch) {
      const isHome = Boolean(nextHome);
      const oppName = isHome ? nextHome?.awayClub.name : nextAway?.homeClub.name;
      alerts.push({
        id: `alert-matchday-${nextMatch.id}`,
        type: "MATCHDAY_ALERT",
        title: `🚨 Matchday Alert: Clash vs ${oppName || "Rival FC"}`,
        icon: "🚨",
        severity: "URGENT",
        message: `Kickoff approaching for Matchday ${nextMatch.matchday}! The Curva is packing the terraces. Set your tactics and get ready for battle!`,
        timestamp: "2h to Kickoff",
        actionHref: "/manager/competition",
        actionLabel: "View Match Dossier",
      });
    }

    // 2. Check Morale Warning
    const morale = await UltrasSocialService.calculateUltrasMorale(club.id);
    if (morale.moraleScore < 40) {
      alerts.push({
        id: `alert-morale-${club.id}`,
        type: "MORALE_WARNING",
        title: `📉 Critical Curva Warning: Morale at ${morale.moraleScore}%`,
        icon: "📉",
        severity: "CRITICAL",
        message: `Curva Morale has dropped below 40%! Supporter patience is wearing thin. An immediate tactical response and 3 points are demanded!`,
        timestamp: "Active Alert",
        actionHref: "/manager/ultras",
        actionLabel: "Emergency Debrief",
      });
    }

    // 3. Rival Clash Alert (Mock live radar)
    const rivalName = ultras.rivals?.[0] || "Title Rival FC";
    alerts.push({
      id: `alert-rival-${club.id}`,
      type: "RIVAL_CLASH_ALERT",
      title: `⚔️ Rival Slip-Up Alert: ${rivalName} Dropped Points!`,
      icon: "⚔️",
      severity: "INFO",
      message: `${rivalName} just dropped 2 crucial points in their away fixture! The door to the summit is wide open for ${club.name}!`,
      timestamp: "Today",
      actionHref: "/manager/ultras",
      actionLabel: "View Standings Pulse",
    });

    // 4. Transfer Reaction Alert
    alerts.push({
      id: `alert-transfer-${club.id}`,
      type: "TRANSFER_REACTION",
      title: `💣 Transfer Window Pulse: Curva Demand Statement Signings`,
      icon: "💣",
      severity: "INFO",
      message: `The Curva expects ambitious squad reinforcements before the window shuts. Ensure new signings fight for the shirt!`,
      timestamp: "Transfer Window",
      actionHref: "/manager/transfers",
      actionLabel: "Scout Transfers",
    });

    return alerts;
  }

  /**
   * Dispatches an actual proactive in-game direct message from the Capo to the manager
   */
  public static async dispatchProactiveAlertDirectMessage(
    clubId: string,
    alertType: UltrasAlertType,
    customNote?: string
  ): Promise<boolean> {
    try {
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: { manager: true },
      });

      if (!club || !club.manager) return false;

      const ultras = getClubUltras(club.name);
      const botUserId = await this.getOrCreateBotUser(ultras.leaderUsername);

      let content = "";
      if (alertType === "MATCHDAY_ALERT") {
        content = `🚨 [${ultras.officialGroupTitle} · MATCHDAY ALERT]\n\n` +
          `سلام كوتش @${club.manager.username} 👑!\n` +
          `باقي ساعتين على انطلاق المقابلة والمدرج راه عامر بالرجال والدخان فالموعد! دخل كولو التيران وما تفرطوش فـ 3 نقاط! ${ultras.bannerEmoji}🔥`;
      } else if (alertType === "RIVAL_CLASH_ALERT") {
        const rival = ultras.rivals?.[0] || "الغريم";
        content = `⚔️ [${ultras.officialGroupTitle} · RIVAL SLIP-UP]\n\n` +
          `كوتش! ${rival} تعثرو وضيعو النقاط فالماتش ديالهم! الفرصة بين يدينا باش نطلعو فالترتيب ونقربو للصدارة! هاد الهدية ما خاصناش نضيعوها! 🏆`;
      } else if (alertType === "MORALE_WARNING") {
        content = `📉 [${ultras.officialGroupTitle} · CRITICAL WARNING ⚠️]\n\n` +
          `كوتش @${club.manager.username}، معنويات الكورفا طاحت تحت 40%! الهزائم المتتالية غير مقبولة تماماً.. خاصك اجتماع طارئ مع اللاعبين وردة فعل فالماتش الجاي بلا أعذار! 😡`;
      } else {
        content = `💣 [${ultras.officialGroupTitle} · TRANSFER DIRECTIVE]\n\n` +
          `الجمهور كيتبع تحركات الميركاتو باهتمام كبير.. أي لاعب جديد يدخل خاصو يعطي الإضافة ويعرق على هاد التوني الغالي! ⚽👊`;
      }

      if (customNote) {
        content += `\n\n📌 Note: ${customNote}`;
      }

      await prisma.directMessage.create({
        data: {
          senderId: botUserId,
          receiverId: club.manager.id,
          content,
        },
      });

      return true;
    } catch (err) {
      console.error("[UltrasAlertsService] Failed to dispatch proactive alert DM:", err);
      return false;
    }
  }
}
