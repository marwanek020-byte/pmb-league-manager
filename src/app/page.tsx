import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Auth check on HomePage error:", error);
  }

  if (!session) {
    redirect("/welcome");
  }

  if (session.user.role === "ADMINISTRATOR") {
    redirect("/admin/dashboard");
  }

  redirect("/manager/dashboard");
}
