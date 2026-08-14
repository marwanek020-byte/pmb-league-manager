import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect(session.user.role === "ADMINISTRATOR" ? "/admin/dashboard" : "/manager/dashboard");
  }

  return (
    <main className="pmb-login flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="pmb-card p-8">
          <h1 className="mb-1 text-xl font-bold text-white">Sign in to your account</h1>
          <p className="mb-6 text-sm text-gray-400">
            Enter your credentials to access the league manager.
          </p>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          PMB League Manager &middot; Administrator &amp; Club Manager access only
        </p>
      </div>
    </main>
  );
}
