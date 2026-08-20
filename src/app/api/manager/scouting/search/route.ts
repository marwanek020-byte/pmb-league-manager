import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user.clubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || "";
    const position = searchParams.get("position")?.trim() || "";
    const nationality = searchParams.get("nationality")?.trim() || "";
    const minRating = searchParams.get("minRating") ? parseInt(searchParams.get("minRating")!, 10) : null;
    const maxRating = searchParams.get("maxRating") ? parseInt(searchParams.get("maxRating")!, 10) : null;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : null;
    const status = searchParams.get("status")?.trim() || "ALL"; // "ALL" | "AVAILABLE" | "REGISTERED"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "16", 10)));

    const where: any = {};

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { realClub: { contains: q, mode: "insensitive" } },
      ];
    }

    if (position && position !== "ALL") {
      switch (position.toUpperCase()) {
        case "GK":
          where.position = { contains: "gk", mode: "insensitive" };
          break;
        case "CB":
          where.position = { contains: "cb", mode: "insensitive" };
          break;
        case "LB":
          where.position = { contains: "lb", mode: "insensitive" };
          break;
        case "RB":
          where.position = { contains: "rb", mode: "insensitive" };
          break;
        case "DMF":
          where.position = { contains: "dmf", mode: "insensitive" };
          break;
        case "CMF":
          where.position = { contains: "cmf", mode: "insensitive" };
          break;
        case "AMF":
          where.position = { contains: "amf", mode: "insensitive" };
          break;
        case "LWF":
          where.OR = [
            { position: { contains: "lwf", mode: "insensitive" } },
            { position: { contains: "lw", mode: "insensitive" } },
          ];
          break;
        case "RWF":
          where.OR = [
            { position: { contains: "rwf", mode: "insensitive" } },
            { position: { contains: "rw", mode: "insensitive" } },
          ];
          break;
        case "CF":
          where.OR = [
            { position: { contains: "cf", mode: "insensitive" } },
            { position: { contains: "st", mode: "insensitive" } },
          ];
          break;
        case "DEF":
          where.OR = [
            { position: { contains: "cb", mode: "insensitive" } },
            { position: { contains: "lb", mode: "insensitive" } },
            { position: { contains: "rb", mode: "insensitive" } },
          ];
          break;
        case "MID":
          where.OR = [
            { position: { contains: "cmf", mode: "insensitive" } },
            { position: { contains: "dmf", mode: "insensitive" } },
            { position: { contains: "amf", mode: "insensitive" } },
          ];
          break;
        case "ATT":
          where.OR = [
            { position: { contains: "cf", mode: "insensitive" } },
            { position: { contains: "st", mode: "insensitive" } },
            { position: { contains: "lwf", mode: "insensitive" } },
            { position: { contains: "rwf", mode: "insensitive" } },
          ];
          break;
        default:
          where.position = { contains: position, mode: "insensitive" };
          break;
      }
    }

    if (nationality && nationality !== "ALL") {
      where.nationality = { contains: nationality, mode: "insensitive" };
    }

    if (minRating !== null || maxRating !== null) {
      where.overallRating = {};
      if (minRating !== null) where.overallRating.gte = minRating;
      if (maxRating !== null) where.overallRating.lte = maxRating;
    }

    if (maxPrice !== null) {
      where.marketValue = { lte: maxPrice };
    }

    if (status === "AVAILABLE") {
      where.status = "AVAILABLE";
      where.pmbClubId = null;
    } else if (status === "REGISTERED") {
      where.status = "REGISTERED";
    }

    const [players, total, distinctNationalities] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy: [{ overallRating: "desc" }, { marketValue: "asc" }, { fullName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          pmbClub: { select: { id: true, name: true, logo: true } },
          auctions: {
            where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
            take: 1,
            select: { id: true, currentBid: true, minIncrement: true, expiresAt: true },
          },
        },
      }),
      prisma.player.count({ where }),
      prisma.player.groupBy({
        by: ["nationality"],
        _count: { nationality: true },
        orderBy: { _count: { nationality: "desc" } },
      }),
    ]);

    const formattedNationalities = distinctNationalities
      .map((item) => ({
        name: item.nationality.trim(),
        count: item._count.nationality,
      }))
      .filter((n) => n.name.length > 1);

    return NextResponse.json({
      players: players.map((p) => ({
        id: p.id,
        playerId: p.playerId,
        fullName: p.fullName,
        position: p.position.toUpperCase(),
        nationality: p.nationality,
        overallRating: p.overallRating ?? 75,
        marketValue: Number(p.marketValue ?? 0),
        realClub: p.realClub,
        photo: p.photo,
        status: p.status,
        currentClub: p.pmbClub
          ? { id: p.pmbClub.id, name: p.pmbClub.name, logo: p.pmbClub.logo }
          : null,
        activeAuction: p.auctions[0]
          ? {
              id: p.auctions[0].id,
              currentBid: Number(p.auctions[0].currentBid),
              minIncrement: Number(p.auctions[0].minIncrement),
              expiresAt: p.auctions[0].expiresAt.toISOString(),
            }
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      nationalities: formattedNationalities,
    });
  } catch (error) {
    console.error("Failed to execute advanced player search:", error);
    return NextResponse.json(
      { error: "Failed to execute advanced player search" },
      { status: 500 }
    );
  }
}
