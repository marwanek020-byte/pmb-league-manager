import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-2xl font-bold text-white">Access denied</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-400">
          You don&apos;t have permission to view this page. If you believe this is a
          mistake, contact your administrator.
        </p>
      </div>
      <Link href="/" className="pmb-btn-primary">
        Return to dashboard
      </Link>
    </main>
  );
}
