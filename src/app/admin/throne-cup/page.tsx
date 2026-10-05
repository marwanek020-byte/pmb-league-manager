import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ThroneCupBracket } from "@/components/competition/ThroneCupBracket";
import { isAnyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminThroneCupPage() {
  const session = await auth();
  if (!session || !isAnyAdmin(session.user)) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      <ThroneCupBracket isAdmin={true} />
    </div>
  );
}
