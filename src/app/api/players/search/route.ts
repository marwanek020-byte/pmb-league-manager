import { NextResponse } from "next/server";
import { Prisma, PlayerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializePlayer } from "@/lib/serialize-player";

function isPlayerStatus(value: string): value is PlayerStatus {
  return ["AVAILABLE", "REGISTERED"].includes(value);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const statusParam = url.searchParams.get("status")?.trim();
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "15")));

  const where: Prisma.PlayerWhereInput = {};
  if (statusParam && isPlayerStatus(statusParam)) {
    where.status = statusParam;
  }

  if (q) {
    const queryInt = Number.isInteger(Number(q)) ? Number(q) : undefined;
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { position: { contains: q, mode: "insensitive" } },
      { realClub: { contains: q, mode: "insensitive" } },
      { nationality: { contains: q, mode: "insensitive" } },
      { id: { contains: q, mode: "insensitive" } },
      { pmbClub: { name: { contains: q, mode: "insensitive" } } },
    ];

    if (queryInt != null && !Number.isNaN(queryInt)) {
      where.OR.push({ playerId: queryInt });
    }
  }

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      include: { pmbClub: { select: { name: true } } },
      orderBy: { fullName: "asc" },
      take: pageSize,
    }),
    prisma.player.count({ where }),
  ]);

  return NextResponse.json({ players: players.map(serializePlayer), total });
}
