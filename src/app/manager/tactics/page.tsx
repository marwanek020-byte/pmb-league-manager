import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializePlayer, PlayerDTO } from "@/lib/serialize-player";
import { FormationBoard } from "@/components/manager/FormationBoard";
import { FormationKey } from "@/lib/formations";
import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerTacticsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLUB_MANAGER" || !session.user.clubId) {
    redirect("/unauthorized");
  }

  const clubId = session.user.clubId;

  // Fetch club with registered squad and existing lineup
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      league: { select: { name: true } },
      players: {
        where: { status: "REGISTERED" },
        orderBy: [{ overallRating: "desc" }, { fullName: "asc" }],
      },
      lineup: {
        include: {
          starters: true,
          substitutes: { orderBy: { order: "asc" } },
          setPieces: true,
        },
      },
    },
  });

  if (!club) {
    redirect("/unauthorized");
  }

  const serializedSquad: PlayerDTO[] = club.players.map(serializePlayer);

  // Map initial starters slotKey -> playerId & slotKey -> slotRole
  const initialStarters: Record<string, string> = {};
  const initialSlotRoles: Record<string, string> = {};
  if (club.lineup?.starters) {
    club.lineup.starters.forEach((s) => {
      initialStarters[s.slotKey] = s.playerId;
      if (s.slotRole) {
        initialSlotRoles[s.slotKey] = s.slotRole;
      }
    });
  }

  // Initial substitutes array
  const initialSubstitutes: string[] = club.lineup?.substitutes
    ? club.lineup.substitutes.map((s) => s.playerId)
    : [];

  // Captain & Vice Captain
  const captainPiece = club.lineup?.setPieces.find((sp) => sp.type === "CAPTAIN");
  const viceCaptainPiece = club.lineup?.setPieces.find((sp) => sp.type === "VICE_CAPTAIN");

  const initialFormation = (club.lineup?.formation as FormationKey) || "F433";

  return (
    <div className="space-y-6">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <Link
              href="/manager/dashboard"
              className="flex items-center gap-1 hover:text-pmb-gold transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white">Tactics & Lineup</span>
          </div>

          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            Tactical Formation & Lineup
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            Set your team&apos;s flexible tactical formation, starting XI, position roles, and bench.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/manager/players"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-pmb-gold/50 hover:text-white"
          >
            Manage Squad →
          </Link>
        </div>
      </div>

      {/* ── FORMATION BOARD ─────────────────────────────────────────── */}
      <FormationBoard
        clubId={club.id}
        clubName={club.name}
        squad={serializedSquad}
        initialFormation={initialFormation}
        initialStarters={initialStarters}
        initialSlotRoles={initialSlotRoles}
        initialSubstitutes={initialSubstitutes}
        initialCaptainId={captainPiece?.playerId || null}
        initialViceCaptainId={viceCaptainPiece?.playerId || null}
      />
    </div>
  );
}
