import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/welcome");
  }

  if (session.user.role === "ADMINISTRATOR") {
    redirect("/admin/dashboard");
  }

  redirect("/manager/dashboard");
}
