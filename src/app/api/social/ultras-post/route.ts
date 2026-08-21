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

    const { type = "DERBY_CALL" } = await req.json();

    const club = await prisma.club.findUnique({
      where: { id: session.user.clubId },
      include: { league: true },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const ultras = getClubUltras(club.name);

    // Get or create Ultras Bot User
    let ultrasUser = await prisma.user.findUnique({
      where: { username: ultras.leaderUsername },
    });

    if (!ultrasUser) {
      ultrasUser = await prisma.user.create({
        data: {
          username: ultras.leaderUsername,
          password: "AI_BOT_INTERNAL_SECURE_PASSWORD",
          role: "CLUB_MANAGER",
          clubId: club.id,
        },
      });
    }

    let postContent = "";
    let tag: "STATEMENT" | "BANTER" | "VICTORY" = "STATEMENT";

    switch (type) {
      case "DERBY_CALL":
        postContent = `🚨 **بلاغ رسمي صادر عن ${ultras.groupName}** 📢\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `إلى كافة الجماهير الوفية لنادي **${club.name}**:\n\n` +
          `الموعد يقترب وقمة الأسبوع على الأبواب! نلتقي جميعاً فالمدرج لتقديم درس فالتشجيع والحضارة.\n` +
          `• ارتداء قميص النادي بالكامل ${ultras.bannerEmoji}\n` +
          `• الحضور المبكر قبل بداية اللقاء\n` +
          `• التشجيع المتواصل طيلة 90 دقيقة بلا توقف!\n\n` +
          `${ultras.chants[0]}\n\n` +
          `#الكورفا #بلاغ_رسمي #${club.name.replace(/\s+/g, "")}`;
        tag = "STATEMENT";
        break;

      case "TIFO_CELEBRATION":
        postContent = `🎆 **كراكاج وتيفو خيالي فالمدرجات!** 🔥\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `لوحة فنية جديدة رسماتها ${ultras.groupName} اليوم فالمدرج لتأكيد الزعامة والمكانة التاريخية لنادي **${club.name}**!\n\n` +
          `برافو لكل الأعضاء والجماهير اللي سهرات على هاد الإنجاز.. المدرج دائماً صوت وفخر النادي! ${ultras.bannerEmoji}\n\n` +
          `#ألتراس #تيفو #كراكاج #${club.name.replace(/\s+/g, "")}`;
        tag = "VICTORY";
        break;

      case "WARNING":
        postContent = `⚠️ **رسالة شديدة اللهجة من الكورفا إلى اللاعبين والإدارة** 🚨\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `الوضع الحالي والنتائج المتذبذبة غير مقبولة بالمرة! قميص **${club.name}** عندو تاريخ وهيبة خاص اللي يعرق عليه فالتيران.\n\n` +
          `الفرصة ما زالت قائمة للتعويض، لكن لن نقبل بأي تهاون أو استهتار فالمباريات القادمة. القتالية أولاً وأخيراً! ${ultras.bannerEmoji}\n\n` +
          `#تحذير #القتالية_أولاً #${club.name.replace(/\s+/g, "")}`;
        tag = "BANTER";
        break;

      default:
        postContent = `📢 **رسالة من ${ultras.groupName}**\n\n` +
          `معاً خلف ${club.name} فكل الأوقات! ${ultras.chants[0]} ${ultras.bannerEmoji}`;
        tag = "STATEMENT";
    }

    const post = await prisma.post.create({
      data: {
        content: postContent,
        tag,
        userId: ultrasUser.id,
        clubId: club.id,
      },
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("Failed to publish ultras post:", error);
    return NextResponse.json({ error: "Failed to publish ultras post" }, { status: 500 });
  }
}
