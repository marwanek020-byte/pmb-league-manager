import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;
    const body = await req.json();
    const { reaction } = body;

    const validReactions = ["GOAL", "FIRE", "TROPHY", "CLAP", "POPCORN"];
    if (!validReactions.includes(reaction)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, content: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user already reacted with this exact reaction
    const existing = await prisma.postReaction.findUnique({
      where: {
        postId_userId_reaction: {
          postId,
          userId: session.user.id,
          reaction,
        },
      },
    });

    if (existing) {
      // Toggle off (remove reaction)
      await prisma.postReaction.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ action: "removed", reaction });
    } else {
      // Add reaction
      const newReaction = await prisma.postReaction.create({
        data: {
          postId,
          userId: session.user.id,
          reaction,
        },
      });

      // Create notification for post owner if not reacting to own post
      if (post.userId !== session.user.id) {
        const actorClub = session.user.clubId
          ? await prisma.club.findUnique({ where: { id: session.user.clubId }, select: { name: true } })
          : null;
        const actorName = actorClub?.name || `@${session.user.username}`;
        const reactionEmoji =
          reaction === "GOAL"
            ? "⚽ Golazo"
            : reaction === "FIRE"
            ? "🔥 Fire"
            : reaction === "TROPHY"
            ? "🏆 Champion"
            : reaction === "CLAP"
            ? "👏 Respect"
            : "🍿 Drama";

        const snippet = post.content.length > 40 ? post.content.slice(0, 40) + "..." : post.content;

        await prisma.notification.create({
          data: {
            userId: post.userId,
            type: "POST_REACTION",
            message: `${actorName} reacted ${reactionEmoji} to your post: "${snippet}"`,
          },
        });
      }

      return NextResponse.json({ action: "added", reaction: newReaction });
    }
  } catch (error) {
    console.error("Error toggling post reaction:", error);
    return NextResponse.json({ error: "Failed to react to post" }, { status: 500 });
  }
}
