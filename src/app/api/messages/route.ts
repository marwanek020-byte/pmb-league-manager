import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("withUserId");

    if (!withUserId) {
      return NextResponse.json({ error: "Missing withUserId" }, { status: 400 });
    }

    // Mark messages from other user as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: withUserId,
        receiverId: session.user.id,
        read: false,
      },
      data: { read: true },
    });

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: withUserId },
          { senderId: withUserId, receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({ messages, currentUserId: session.user.id });
  } catch (error) {
    console.error("Error fetching direct messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, content } = body;

    if (!receiverId || !content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Receiver ID and message content required" }, { status: 400 });
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: content.trim(),
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending direct message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
