import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { isOpen?: boolean } | null;

  if (typeof body?.isOpen !== "boolean") {
    return NextResponse.json({ error: "isOpen must be a boolean" }, { status: 400 });
  }

  const window = await prisma.transferWindow.upsert({
    where: { id: "singleton" },
    update: { isOpen: body.isOpen },
    create: { id: "singleton", isOpen: body.isOpen },
  });

  // This only flips a status flag shown on the dashboard - it does not
  // unlock any transfer functionality, which is a future phase feature.
  return NextResponse.json(window);
}
