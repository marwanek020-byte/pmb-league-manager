import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FreeAgentMarketClient } from "@/components/manager/transfers/FreeAgentMarketClient";

export const dynamic = "force-dynamic";

export default async function AdminFreeAgentsPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMINISTRATOR") {
    redirect("/unauthorized");
  }

  return <FreeAgentMarketClient />;
}
