import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UltrasCurvaRoom } from "@/components/ultras/UltrasCurvaRoom";
import { UltrasSocialService } from "@/lib/services/ultras-social-service";

export default async function ManagerUltrasPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.clubId) {
    redirect("/manager/dashboard");
  }

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    select: {
      id: true,
      name: true,
      logo: true,
    },
  });

  if (!club) {
    redirect("/manager/dashboard");
  }

  const moraleData = await UltrasSocialService.calculateUltrasMorale(club.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-pmb-gold animate-ping" />
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-pmb-gold">
              The Virage · Supporter Companion
            </p>
          </div>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            AI Ultras Curva Hub
          </h1>
        </div>
      </div>

      <UltrasCurvaRoom
        clubName={club.name}
        clubLogo={club.logo}
        managerUsername={session.user.username}
        initialMorale={moraleData.moraleScore}
      />
    </div>
  );
}
