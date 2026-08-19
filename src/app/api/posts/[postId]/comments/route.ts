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
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, content: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const newComment = await prisma.postComment.create({
      data: {
        postId,
        userId: session.user.id,
        clubId: session.user.clubId || null,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
        club: { select: { id: true, name: true, logo: true } },
      },
    });

    // Create notification for post owner if not commenting on own post
    if (post.userId !== session.user.id) {
      const actorClub = session.user.clubId
        ? await prisma.club.findUnique({ where: { id: session.user.clubId }, select: { name: true } })
        : null;
      const actorName = actorClub?.name || `@${session.user.username}`;
      const commentSnippet =
        content.trim().length > 45 ? content.trim().slice(0, 45) + "..." : content.trim();

      await prisma.notification.create({
        data: {
          userId: post.userId,
          type: "POST_COMMENT",
          message: `${actorName} replied: "${commentSnippet}"`,
        },
      });
    }

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
