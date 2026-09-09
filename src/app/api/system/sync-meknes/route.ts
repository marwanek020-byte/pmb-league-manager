import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const club = await prisma.club.findFirst({
      where: { name: { contains: "Meknes", mode: "insensitive" } },
    });

    if (!club) {
      return NextResponse.json({ error: "COD Meknes club not found" }, { status: 404 });
    }

    const updatePmb = await prisma.player.updateMany({
      where: { pmbClubId: club.id },
      data: { nationality: "Morocco" },
    });

    const updateReal = await prisma.player.updateMany({
      where: {
        OR: [
          { realClub: { contains: "Meknes", mode: "insensitive" } },
          { realClub: { contains: "CODM", mode: "insensitive" } },
        ],
      },
      data: { nationality: "Morocco" },
    });

    try {
      revalidatePath(`/admin/clubs/${club.id}`);
      revalidatePath("/admin/clubs/[clubId]", "page");
      revalidatePath("/admin/dashboard");
      revalidatePath("/api/players/search");
    } catch {}

    const players = await prisma.player.findMany({
      where: { pmbClubId: club.id },
      select: { id: true, fullName: true, nationality: true },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({
      success: true,
      clubName: club.name,
      clubId: club.id,
      updatedPmbCount: updatePmb.count,
      updatedRealCount: updateReal.count,
      totalPlayers: players.length,
      players,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
