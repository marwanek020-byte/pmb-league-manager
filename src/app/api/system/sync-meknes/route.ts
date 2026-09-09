import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. COD Meknes
    const meknes = await prisma.club.findFirst({
      where: { name: { contains: "Meknes", mode: "insensitive" } },
    });
    let meknesUpdated = 0;
    if (meknes) {
      const res = await prisma.player.updateMany({
        where: { pmbClubId: meknes.id },
        data: { nationality: "Morocco" },
      });
      meknesUpdated = res.count;
      try {
        revalidatePath(`/admin/clubs/${meknes.id}`);
      } catch {}
    }

    // 2. FUS Rabat: update any 'Mar', 'M', 'moroc', etc. to 'Morocco'
    const fus = await prisma.club.findFirst({
      where: { name: { contains: "FUS Rabat", mode: "insensitive" } },
    });
    let fusUpdated = 0;
    if (fus) {
      const res = await prisma.player.updateMany({
        where: {
          pmbClubId: fus.id,
          OR: [
            { nationality: { equals: "Mar", mode: "insensitive" } },
            { nationality: { equals: "M", mode: "insensitive" } },
            { nationality: { equals: "moroc", mode: "insensitive" } },
            { nationality: { equals: "maroc", mode: "insensitive" } },
            { nationality: { equals: "marroco", mode: "insensitive" } },
            { nationality: { equals: "moroco", mode: "insensitive" } },
            { nationality: { equals: "morocco", mode: "insensitive" } },
          ],
        },
        data: { nationality: "Morocco" },
      });
      fusUpdated = res.count;
      try {
        revalidatePath(`/admin/clubs/${fus.id}`);
      } catch {}
    }

    try {
      revalidatePath("/admin/clubs/[clubId]", "page");
      revalidatePath("/admin/dashboard");
      revalidatePath("/api/players/search");
    } catch {}

    const fusPlayers = fus
      ? await prisma.player.findMany({
          where: { pmbClubId: fus.id },
          select: { id: true, fullName: true, nationality: true },
          orderBy: { fullName: "asc" },
        })
      : [];

    return NextResponse.json({
      success: true,
      meknesUpdated,
      fusUpdated,
      fusPlayerCount: fusPlayers.length,
      fusPlayers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
