import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClubBadge } from "@/components/ClubBadge";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMINISTRATOR") {
    redirect("/admin/dashboard");
  }

  if (session.user.role !== "CLUB_MANAGER") {
    redirect("/unauthorized");
  }

  let club = null;
  try {
    club = session.user.clubId
      ? await prisma.club.findUnique({
          where: {
            id: session.user.clubId,
          },
          include: {
            league: true,
            powerRating: true,
            players: { where: { status: "REGISTERED" }, select: { id: true } },
          },
        })
      : null;
  } catch (err) {
    console.error("Database query failed for club:", err);
  }

  if (!club) {
    redirect("/unauthorized");
  }

  // ── Budget display (EUR to match the competition rewards) ─────────────
  const rawBudget = Number(club.budget ?? 0);
  const budgetDisplay = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(isNaN(rawBudget) ? 0 : rawBudget);

  const powerRating = club.powerRating?.rating ?? 1000;
  const titles = club.powerRating?.titles ?? 0;
  const squadSize = club.players?.length ?? 0;

  // ── Next match + season info ──────────────────────────────────────────
  const activeSeason = club.leagueId
    ? await prisma.season.findFirst({
        where: { leagueId: club.leagueId, status: "ACTIVE" },
        include: { competitionSeason: true },
        orderBy: { createdAt: "desc" },
      }).catch(() => null)
    : null;

  const season = activeSeason ?? (club.leagueId
    ? await prisma.season.findFirst({
        where: { leagueId: club.leagueId },
        include: { competitionSeason: true },
        orderBy: { createdAt: "desc" },
      }).catch(() => null)
    : null);

  const seasonName = season?.competitionSeason?.name ?? season?.name ?? null;

  // Find the next upcoming match for this club
  let nextMatch: {
    matchday: number;
    homeClub: { id: string; name: string; logo: string | null };
    awayClub: { id: string; name: string; logo: string | null };
    status: string;
  } | null = null;

  // Find the last completed match for this club
  let lastMatch: {
    matchday: number;
    homeClub: { id: string; name: string; logo: string | null };
    awayClub: { id: string; name: string; logo: string | null };
    homeGoals: number | null;
    awayGoals: number | null;
    status: string;
  } | null = null;

  if (season?.id) {
    const upcomingMatch = await prisma.match.findFirst({
      where: {
        seasonId: season.id,
        status: "UPCOMING",
        OR: [
          { homeClubId: club.id },
          { awayClubId: club.id },
        ],
      },
      orderBy: { matchday: "asc" },
      include: {
        homeClub: { select: { id: true, name: true, logo: true } },
        awayClub: { select: { id: true, name: true, logo: true } },
      },
    }).catch(() => null);

    if (upcomingMatch) {
      nextMatch = upcomingMatch;
    }

    const completedMatch = await prisma.match.findFirst({
      where: {
        seasonId: season.id,
        status: "COMPLETED",
        OR: [
          { homeClubId: club.id },
          { awayClubId: club.id },
        ],
      },
      orderBy: { matchday: "desc" },
      include: {
        homeClub: { select: { id: true, name: true, logo: true } },
        awayClub: { select: { id: true, name: true, logo: true } },
      },
    }).catch(() => null);

    if (completedMatch) {
      lastMatch = completedMatch;
    }
  }

  const headlineMatch = nextMatch ?? lastMatch;
  const isUpcoming = headlineMatch?.status === "UPCOMING";

  // ── Quick Access cards ────────────────────────────────────────────────
  const quickCards = [
    {
      href: "/manager/social",
      title: "Dugout Social",
      sub: "Manager discussions & chat",
      img: "/dashboard/login-stadium.jpg",
    },
    {
      href: "/manager/players",
      title: "Players",
      sub: "Manage squad",
      img: "/dashboard/card-players.jpg",
    },
    {
      href: "/manager/transfers",
      title: "Transfers",
      sub: "Transfer market",
      img: "/dashboard/card-transfers.jpg",
    },
    {
      href: "/manager/club",
      title: "Club",
      sub: "Club information",
      img: "/dashboard/card-club.jpg",
    },
    {
      href: "/manager/competition",
      title: "Competition",
      sub: "Fixtures & results",
      img: "/dashboard/card-competition.jpg",
    },
  ];

  const liveAuction = await prisma.auction.findFirst({
    where: { status: "ACTIVE" },
    include: { player: true, currentWinnerClub: { select: { name: true } } },
    orderBy: { expiresAt: "asc" },
  }).catch(() => null);

  return (
    <div className="space-y-8 pb-16 sm:pb-8">
    {/* ─── WELCOME HEADER ──────────────────────────────────────────── */}
    <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
          Welcome back, Manager
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="pmb-badge text-[10px]">{club.name}</span>
          {seasonName && (
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              {seasonName}
            </span>
          )}
        </div>
      </div>

      {/* Action Header Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* AI Scout Quick Button */}
        <Link
          href="/manager/scouting"
          className="flex items-center gap-2.5 rounded-2xl border border-pmb-gold/50 bg-gradient-to-r from-pmb-charcoal to-black p-3 transition hover:border-pmb-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.35)]"
        >
          <span className="text-base">🤖</span>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="block text-[9px] font-black uppercase tracking-widest text-pmb-gold">
                Chief Scout AI
              </span>
              {club.aiScoutEnabled ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <span className="text-[9px] text-gray-500">🔒</span>
              )}
            </div>
            <span className="text-xs font-bold text-white">
              {club.aiScoutEnabled ? "Tactical Audit & Scout →" : "VIP Scout Preview →"}
            </span>
          </div>
        </Link>

        {/* Dugout Quick Button */}
        <Link
          href="/manager/social"
          className="flex items-center gap-2 rounded-2xl border border-pmb-gold/40 bg-gradient-to-r from-pmb-gold/20 via-black to-black p-3 transition hover:border-pmb-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          <span className="text-base">💬</span>
          <div className="text-left">
            <span className="block text-[9px] font-black uppercase tracking-widest text-pmb-gold">
              The Dugout
            </span>
            <span className="text-xs font-bold text-white">Social Hub & Chat →</span>
          </div>
        </Link>

        {/* Live Auction Quick Jump */}
        <Link
          href="/manager/auctions"
          className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-950/40 to-black p-3 transition hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]"
        >
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <div className="text-left">
            <span className="block text-[9px] font-black uppercase tracking-widest text-red-400">
              Live Auctions
            </span>
            <span className="text-xs font-bold text-white">
              {liveAuction ? "Active Bidding War →" : "Auction Arena →"}
            </span>
          </div>
        </Link>
      </div>
    </section>

    {/* ─── MAIN BENTO GRID ─────────────────────────────────────────── */}
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
      {/* ── LEFT: Club Hero ──────────────────────────────────────── */}
      <div className="manager-hero pmb-card relative flex min-h-[240px] flex-col justify-center overflow-hidden p-6 sm:p-8">
        {/* Background grid pattern */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none" 
          style={{
            backgroundImage: `radial-gradient(circle, var(--club-primary) 1.5px, transparent 1.5px)`,
            backgroundSize: "24px 24px"
          }} 
        />

        <div className="relative z-10 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6">
          {/* Left Content */}
          <div className="flex-1 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[.3em] text-pmb-gold">
              Private Club Headquarters
            </p>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              {club.name}
            </h2>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center rounded-lg border border-white/15 bg-black/50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                {club.league?.name ?? "PMB League"}
              </span>
              <span className="inline-flex items-center rounded-lg border border-white/15 bg-black/50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                Squad Rating: {powerRating}
              </span>
            </div>
          </div>

          {/* Right Badge Framed Box */}
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-black/60 p-4 shadow-2xl backdrop-blur-md self-start sm:self-center">
            <ClubBadge name={club.name} logo={club.logo} size="lg" />
          </div>
        </div>
      </div>

      {/* ── RIGHT: Match + Budget stacked ─────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Next Match / Last Result card */}
        <div className="pmb-card relative flex flex-col overflow-hidden p-5">
          {headlineMatch ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-pmb-gold">
                  Matchday {(headlineMatch.matchday ?? 1).toString().padStart(2, "0")}
                </p>
                <span
                  className={[
                    "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                    isUpcoming
                      ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-emerald-500/15 text-emerald-400",
                  ].join(" ")}
                >
                  {isUpcoming ? "Upcoming" : "Full Time"}
                </span>
              </div>

              {/* VS layout */}
              <div className="mt-4 flex items-center justify-between gap-3">
                {/* Home */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <ClubBadge
                    name={headlineMatch.homeClub?.name ?? "Home Club"}
                    logo={headlineMatch.homeClub?.logo ?? null}
                    size="md"
                  />
                  <span className="max-w-[90px] truncate text-[10px] font-bold uppercase tracking-wider text-white">
                    {headlineMatch.homeClub?.name ?? "Home Club"}
                  </span>
                </div>

                {/* Score / VS */}
                <div className="text-center">
                  {!isUpcoming && lastMatch ? (
                    <span className="text-2xl font-black text-white">
                      {lastMatch.homeGoals ?? 0} — {lastMatch.awayGoals ?? 0}
                    </span>
                  ) : (
                    <span className="text-xl font-black text-gray-400">VS</span>
                  )}
                </div>

                {/* Away */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <ClubBadge
                    name={headlineMatch.awayClub?.name ?? "Away Club"}
                    logo={headlineMatch.awayClub?.logo ?? null}
                    size="md"
                  />
                  <span className="max-w-[90px] truncate text-[10px] font-bold uppercase tracking-wider text-white">
                    {headlineMatch.awayClub?.name ?? "Away Club"}
                  </span>
                </div>
              </div>

              {/* League name footer */}
              <p className="mt-4 text-center text-[9px] font-bold uppercase tracking-[.2em] text-gray-600">
                {club.league?.name ?? "PMB League"}
              </p>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <span className="text-3xl">⚽</span>
              <p className="mt-2 text-xs text-gray-500">No matches scheduled yet</p>
            </div>
          )}
        </div>

        {/* Budget card */}
        <Link
          href="/manager/budget"
          className="group relative overflow-hidden rounded-xl border border-pmb-gold/30 bg-gradient-to-br from-[#1a1708] to-[#12100a] p-5 transition hover:border-pmb-gold/50 hover:shadow-gold"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-pmb-gold">
                Available Budget
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {budgetDisplay}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Current season operating budget
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-pmb-gold/20 bg-pmb-gold/10 text-pmb-gold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </section>

    {/* ─── STAT CARDS ROW ──────────────────────────────────────────── */}
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="pmb-card p-5">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Club Power</p>
          <span className="text-pmb-gold">⭐</span>
        </div>
        <p className="mt-2 text-2xl font-black text-white">{powerRating}</p>
      </div>

      <div className="pmb-card p-5">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Titles Won</p>
          <span className="text-pmb-gold">🏆</span>
        </div>
        <p className="mt-2 text-2xl font-black text-pmb-gold">{titles}</p>
      </div>

      <div className="pmb-card p-5">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Squad Size</p>
          <span className="text-pmb-gold">👥</span>
        </div>
        <p className="mt-2 text-2xl font-black text-white">{squadSize}</p>
      </div>

      <div className="pmb-card p-5">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">League</p>
          <span className="text-pmb-gold">🏟️</span>
        </div>
        <p className="mt-2 truncate text-lg font-black text-white">{club.league?.name ?? "PMB League"}</p>
      </div>
    </section>

    {/* ─── QUICK ACCESS ────────────────────────────────────────────── */}
    <section>
      <h2 className="mb-4 text-xl font-bold text-white">Quick Access</h2>

      {/* Desktop: image cards in 4-col grid */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {quickCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-xl border border-pmb-border transition hover:border-pmb-gold/40 hover:shadow-gold"
          >
            {/* Background image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${card.img})` }}
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

            <div className="relative z-10 p-5">
              <h3 className="text-lg font-bold text-white group-hover:text-pmb-gold transition-colors">
                {card.title}
              </h3>
              <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile: list cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {quickCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="pmb-card group flex items-center justify-between p-4 transition hover:border-pmb-gold/40"
          >
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-pmb-gold transition-colors">
                {card.title}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">{card.sub}</p>
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-gray-600 transition group-hover:text-pmb-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  </div>
  );
}
