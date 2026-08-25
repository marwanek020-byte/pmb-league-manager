import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ThroneCupBracket } from "@/components/competition/ThroneCupBracket";

export const dynamic = "force-dynamic";

export default async function AdminThroneCupPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMINISTRATOR") {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      <ThroneCupBracket isAdmin={true} />
    </div>
  );
}
