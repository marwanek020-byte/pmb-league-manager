"use client";

interface AppAboutUsHubProps {
  clubName?: string;
  clubLogo?: string | null;
  budget?: number;
  onBack: () => void;
}

export function AppAboutUsHub({
  clubName = "FAR Rabat",
  clubLogo = null,
  budget = 0,
  onBack,
}: AppAboutUsHubProps) {
  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#070709] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-montserrat select-none">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e9c349]/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      {/* ─── APP HEADER ─── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:scale-105 hover:border-[#e9c349] hover:text-[#e9c349] active:scale-95 cursor-pointer"
          >
            <span>‹</span>
            <span>EXTRAS</span>
          </button>

          <div>
            <h1 className="font-montserrat text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>ABOUT US</span>
              <span className="w-2 h-2 rounded-full bg-[#e9c349] shadow-[0_0_8px_#e9c349]" />
            </h1>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">
              PLATFORM OVERVIEW & OFFICIAL REGULATIONS
            </span>
          </div>
        </div>

        {/* Live Budget Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-[#e9c349]/80 bg-black/90 px-4 py-2 shadow-[0_0_20px_rgba(233,195,73,0.35)]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-xs">
            €
          </div>
          <span className="font-montserrat text-sm sm:text-base font-black tracking-wider text-[#e9c349]">
            {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(budget)}
          </span>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 py-8 space-y-8">
        
        {/* HERO BRAND CARD */}
        <div className="relative overflow-hidden rounded-3xl border border-[#e9c349]/40 bg-gradient-to-b from-[#16161c] via-[#0c0c10] to-[#070709] p-8 sm:p-10 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(233,195,73,0.12)] text-center">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-gradient-to-br from-[#f5d475]/20 to-black border border-[#e9c349]/50 mb-4 shadow-[0_0_25px_rgba(233,195,73,0.3)]">
            <svg viewBox="0 0 100 100" className="w-16 h-16">
              <defs>
                <linearGradient id="aboutGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f5d475" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
              </defs>
              <polygon points="50,5 92,24 92,68 50,95 8,68 8,24" fill="none" stroke="url(#aboutGold)" strokeWidth="4" />
              <polygon points="50,15 82,30 82,64 50,85 18,64 18,30" fill="url(#aboutGold)" opacity="0.2" />
              {/* Star */}
              <polygon points="50,28 54,40 67,40 56,48 60,60 50,52 40,60 44,48 33,40 46,40" fill="url(#aboutGold)" />
            </svg>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wider text-white">
            PMB LEAGUE <span className="bg-gradient-to-r from-[#f5d475] via-[#d4af37] to-[#b8860b] bg-clip-text text-transparent">MANAGER</span>
          </h2>
          <p className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-widest text-[#e9c349]">
            The Premier Moroccan Botola eFootball Simulation Platform
          </p>
          <p className="mt-4 text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Engineered exclusively for managers across the Kingdom and worldwide, PMB League Manager blends high-stakes financial realism, live transfer markets, authentic Curva atmosphere, and competitive eFootball league battles into one unified experience.
          </p>
        </div>

        {/* 5 CORE PILLARS */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-[.25em] text-[#e9c349] mb-4 flex items-center gap-2">
            <span>⚡</span>
            <span>CORE PLATFORM SUITE</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: "⇄",
                title: "Real-Time Mercato",
                desc: "Live transfer window with buy, sell, loan, and player swap negotiations between rival managers with instant budget debit/credit.",
              },
              {
                icon: "🔨",
                title: "Live Bidding Auctions",
                desc: "Real-time competitive auctions featuring 3D eFootball cards, live rival threats radar, anti-sniping protection, and gavel sound effects.",
              },
              {
                icon: "🤝",
                title: "Free Agent Market",
                desc: "Sign released players for 0 € fee with the strict official 1-chance rule and interactive 3D contract boardroom negotiation sequence.",
              },
              {
                icon: "📣",
                title: "Global Dugout Lounge",
                desc: "Manager social hub for official statements, transfer rumors, matchday banter, reactions, comments, and direct 1-on-1 private messaging.",
              },
              {
                icon: "🔥",
                title: "Curva Ultras Companion",
                desc: "AI-driven Capo chat in authentic Moroccan Darija, live supporter morale tracking, chant jukebox, Tifo choreography lab, and derby debriefs.",
              },
              {
                icon: "💰",
                title: "Club Operating Treasury",
                desc: "Comprehensive financial ledger tracking inflows, outflows, match prize money, player sales, sponsor video boosts, and balance history.",
              },
            ].map((pillar, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#101014]/90 p-5 shadow-lg hover:border-[#e9c349]/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-[#f5d475] to-[#b8860b] text-black font-black text-sm">
                    {pillar.icon}
                  </span>
                  <h4 className="font-bold text-sm text-white">{pillar.title}</h4>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* OFFICIAL REGULATIONS & FAIR PLAY */}
        <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#101014] to-[#070709] p-6 sm:p-8 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[.25em] text-[#e9c349] flex items-center gap-2">
            <span>⚖️</span>
            <span>OFFICIAL BOTOLA REGULATIONS & FAIR PLAY</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <h5 className="font-bold text-white mb-1">🇲🇦 Foreign Player Quotas</h5>
              <p className="text-gray-400 leading-relaxed">
                Clubs are restricted to a maximum of 4 foreign (non-Moroccan) players registered in the active senior squad at any time.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <h5 className="font-bold text-white mb-1">⏱️ One-Chance Free Agent Rule</h5>
              <p className="text-gray-400 leading-relaxed">
                If a Free Agent negotiation breaks down due to failed salary demands, that player will refuse all subsequent offers from your club for the season.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <h5 className="font-bold text-white mb-1">🛡️ Financial Fair Play (FFP)</h5>
              <p className="text-gray-400 leading-relaxed">
                Club treasury balances cannot drop below €0. Transfer bids and auction offers exceeding current available funds are rejected automatically.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <h5 className="font-bold text-white mb-1">📢 Media & Press Conduct</h5>
              <p className="text-gray-400 leading-relaxed">
                Public statements in the Global Dugout impact supporter morale and team confidence ratings. Keep banter competitive yet respectful.
              </p>
            </div>
          </div>
        </div>

        {/* VERSION & CREDITS METADATA */}
        <div className="rounded-2xl border border-[#e9c349]/20 bg-black/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#e9c349]">
              RELEASE SPECIFICATIONS
            </p>
            <h4 className="font-black text-sm text-white mt-0.5">
              PMB League Manager · Pro Botola Gold Edition
            </h4>
            <p className="text-xs text-gray-500 font-mono mt-1">
              Version 2.4.0 (Build 2026.09) · Production Android & Web Runtime
            </p>
          </div>

          <div className="sm:text-right">
            <span className="inline-block rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
              ● System Operational
            </span>
            <p className="text-[10px] text-gray-400 mt-1">
              Engineered by PMB Creative & Tech Guild
            </p>
          </div>
        </div>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-gray-500">
        PMB LEAGUE MANAGER · OFFICIAL MOROCCAN BOTOLA eFOOTBALL ECOSYSTEM
      </footer>
    </div>
  );
}
