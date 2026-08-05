import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Defense in depth: middleware already blocks this route for the wrong
  // role, but every layout/page re-checks the session directly so no page
  // ever renders manager data without a verified Club Manager session.
  if (!session) redirect("/login");
  if (session.user.role !== "CLUB_MANAGER") redirect("/unauthorized");

  return (
    <div className="min-h-screen">
      <Navbar homeHref="/manager/dashboard" rightLabel={`${session.user.clubName ?? "Club"} Manager`} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
