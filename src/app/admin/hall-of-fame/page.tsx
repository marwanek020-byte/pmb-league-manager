import { HallOfFameManager } from "@/components/admin/HallOfFameManager";

export const dynamic = "force-dynamic";

export default function HallOfFamePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hall of Fame
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Historical achievements of clubs across finished seasons.
        </p>
      </div>

      <HallOfFameManager />
    </div>
  );
}