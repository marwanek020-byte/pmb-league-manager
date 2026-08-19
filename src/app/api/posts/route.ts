import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PostTag } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, username: true, role: true } },
            club: { select: { id: true, name: true, logo: true } },
          },
        },
        reactions: {
          select: {
            id: true,
            reaction: true,
            userId: true,
          },
        },
      },
    });

    return NextResponse.json({ posts, currentUserId: session.user.id });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, tag, mediaUrl } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Post content cannot be empty" }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "Post content cannot exceed 2000 characters" }, { status: 400 });
    }

    // Determine post tag
    const validTags: PostTag[] = ["STATEMENT", "TRANSFER", "BANTER", "VICTORY", "GENERAL"];
    const postTag: PostTag = validTags.includes(tag) ? tag : "GENERAL";

    const newPost = await prisma.post.create({
      data: {
        content: content.trim(),
        tag: postTag,
        mediaUrl: mediaUrl || null,
        userId: session.user.id,
        clubId: session.user.clubId || null,
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
        club: { select: { id: true, name: true, logo: true } },
        comments: true,
        reactions: true,
      },
    });

    return NextResponse.json({ post: newPost }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
