import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect(session.user.role === "ADMINISTRATOR" ? "/admin/dashboard" : "/manager/dashboard");
  }

  return (
    <main className="relative min-h-screen w-full bg-[#08080a] text-white flex overflow-hidden">
      {/* ─── DESKTOP LEFT CINEMATIC HERO (Hidden on mobile) ─────────── */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 overflow-hidden bg-black select-none border-r border-white/10">
        {/* Stadium Photography Background */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('/dashboard/login-stadium.jpg')`,
          }}
        />

        {/* Ambient Dark Gradient Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black" />

        {/* Top-Left: PMB Gold Lion Crest */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-pmb-gold/40 bg-black/60 p-1.5 shadow-[0_0_25px_rgba(212,175,55,0.3)] backdrop-blur-md">
            <img
              src="/branding/pmb-lion.jpg"
              alt="PMB Lion Emblem"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.3em] text-white">
              PMB LEAGUE
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-pmb-gold">
              Professional Suite
            </p>
          </div>
        </div>

        {/* Bottom-Left: Bold Luxury Tagline */}
        <div className="relative z-10 max-w-lg">
          <div className="space-y-1">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white sm:text-5xl lg:text-6xl leading-[0.95]">
              MANAGE.
            </h2>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white sm:text-5xl lg:text-6xl leading-[0.95]">
              COMPETE.
            </h2>
            <h2 className="text-4xl font-black uppercase tracking-tighter bg-gradient-to-r from-[#e5b326] via-[#fcd34d] to-[#dfab1d] bg-clip-text text-transparent sm:text-5xl lg:text-6xl leading-[0.95] drop-shadow-[0_4px_25px_rgba(229,179,38,0.4)]">
              DOMINATE.
            </h2>
          </div>

          <p className="mt-5 text-sm font-medium text-gray-300 leading-relaxed max-w-md">
            The definitive platform for PMB football league management, player transfers, live auctions, and championship glory.
          </p>
        </div>
      </div>

      {/* ─── RIGHT / MOBILE LOGIN CONTAINER ─────────────────────────── */}
      <div className="relative flex min-h-screen w-full lg:w-1/2 xl:w-[45%] flex-col justify-between px-6 py-10 sm:px-12 lg:px-16 overflow-y-auto">
        {/* Mobile-only background blur */}
        <div
          className="absolute inset-0 bg-cover bg-center lg:hidden opacity-30 blur-sm scale-110"
          style={{
            backgroundImage: `url('/dashboard/login-stadium.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-black/80 lg:hidden" />

        {/* Top Header */}
        <div className="relative z-10 flex justify-center lg:justify-start">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
            <img
              src="/branding/pmb-lion.jpg"
              alt="PMB"
              className="h-5 w-5 rounded-full object-cover shadow-sm"
            />
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-pmb-gold">
              PMB LEAGUE MANAGER
            </span>
          </div>
        </div>

        {/* Center Login Box */}
        <div className="relative z-10 mx-auto w-full max-w-sm my-auto py-8">
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              Welcome Back
            </h1>
            <p className="mt-2 text-xs font-medium text-gray-400">
              Sign in to access your club dashboard and competition controls.
            </p>
          </div>

          {/* Form */}
          <div className="rounded-3xl border border-white/10 bg-[#0d0d10]/90 p-6 sm:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <LoginForm />
          </div>

          {/* Portal Switchers / Access Badges */}
          <div className="mt-8 flex items-center justify-center gap-6 text-[11px] font-bold text-gray-400">
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-default">
              <span>🛡️</span> Administrator Access
            </span>
            <span className="text-gray-600">·</span>
            <span className="flex items-center gap-1.5 hover:text-white transition cursor-default">
              <span>⚽</span> Club Manager Portal
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
            © 2026 PMB PROFESSIONAL FOOTBALL LEAGUE. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </main>
  );
}
