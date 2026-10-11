import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAnyAdmin } from "@/lib/admin-auth";
import { SponsorDraftRoom } from "@/components/sponsors/SponsorDraftRoom";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sponsor Draft Room | PMB League Manager",
  description: "Official Season 2 Botola Pro Sponsor Draft and Corporate Partnership Control",
};

export default async function AdminSponsorsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!isAnyAdmin(session.user)) {
    redirect("/unauthorized");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SponsorDraftRoom />
    </div>
  );
}
