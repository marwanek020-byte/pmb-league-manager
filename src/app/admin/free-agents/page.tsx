import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FreeAgentMarketClient } from "@/components/manager/transfers/FreeAgentMarketClient";
import { isAnyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminFreeAgentsPage() {
  const session = await auth();

  if (!session || !isAnyAdmin(session.user)) {
    redirect("/unauthorized");
  }

  return <FreeAgentMarketClient />;
}
