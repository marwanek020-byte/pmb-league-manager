"use client";

import { useEffect, useMemo, useState } from "react";

type Transfer = {
  id: string;
  playerName: string;
  fromClubName: string;
  toClubName: string;
  fee: number | null;
  currency: string;
  completedAt: string | null;
  type: string;
};

type Season = {
  id: string;
  name: string;
  leagueName: string;
  endDate: string | null;
  podium: {
    position: number;
    points: number | null;
    clubName: string;
    clubLogo: string | null;
  }[];
};

type LiveFeedData = {
  transfers: Transfer[];
  seasons: Season[];
  transferWindowOpen: boolean;
};

type FeedItem = {
  id: string;
  type: "transfer" | "season" | "window";
  title: string;
  subtitle: string;
};

function formatFee(
  fee: number | null,
  currency: string,
): string {
  if (fee === null) {
    return "FREE";
  }

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(fee);
  } catch {
    return `${fee.toLocaleString("en-GB")} ${currency}`;
  }
}

export function LiveFeed() {
  const [data, setData] = useState<LiveFeedData | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  async function loadFeed() {
    try {
      const response = await fetch("/api/live-feed", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const nextData: LiveFeedData = await response.json();

      setData(nextData);
    } catch {
      // Keep the current feed if the request fails.
    }
  }

  /*
   * Load immediately when the page opens,
   * then refresh every 30 seconds.
   */
  useEffect(() => {
    loadFeed();

    const interval = window.setInterval(() => {
      loadFeed();
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /*
   * Convert transfers, seasons and transfer-window
   * information into a single feed.
   */
  const items = useMemo<FeedItem[]>(() => {
    if (!data) {
      return [];
    }

    const feed: FeedItem[] = [];

    // Latest completed transfers
    data.transfers.forEach((transfer) => {
      feed.push({
        id: `transfer-${transfer.id}`,
        type: "transfer",
        title: `LATEST TRANSFER · ${transfer.playerName}`,
        subtitle: `${transfer.fromClubName} → ${transfer.toClubName} · ${formatFee(
          transfer.fee,
          transfer.currency,
        )}`,
      });
    });

    // Finished seasons
    data.seasons.forEach((season) => {
      const first = season.podium.find(
        (item) => item.position === 1,
      );

      const second = season.podium.find(
        (item) => item.position === 2,
      );

      const third = season.podium.find(
        (item) => item.position === 3,
      );

      if (!first) {
        return;
      }

      feed.push({
        id: `season-${season.id}`,
        type: "season",
        title: `🏆 ${season.leagueName} · ${season.name} FINISHED`,
        subtitle: [
          `🥇 ${first.clubName}`,
          second ? `🥈 ${second.clubName}` : null,
          third ? `🥉 ${third.clubName}` : null,
        ]
          .filter(Boolean)
          .join("  ·  "),
      });
    });

    // Transfer window status
    feed.push({
      id: "transfer-window",
      type: "window",
      title: data.transferWindowOpen
        ? "TRANSFER WINDOW · OPEN"
        : "TRANSFER WINDOW · CLOSED",
      subtitle: data.transferWindowOpen
        ? "Clubs can make transfer moves"
        : "Transfers are currently unavailable",
    });

    return feed;
  }, [data]);

  /*
   * Automatically move to the next announcement
   * every 5 seconds.
   */
  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex(
        (current) => (current + 1) % items.length,
      );
    }, 5_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [items.length]);

  /*
   * Prevent an invalid index after the feed updates.
   */
  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  if (items.length === 0) {
    return null;
  }

  const item = items[activeIndex];

  return (
    <div className="border-y border-pmb-gold/20 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-11 max-w-6xl items-center overflow-hidden px-4 sm:px-6">
        {/* PMB LIVE indicator */}
        <div className="flex shrink-0 items-center gap-2 pr-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pmb-gold opacity-75" />

            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pmb-gold" />
          </span>

          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pmb-gold">
            PMB LIVE
          </span>
        </div>

        {/* Animated announcement */}
        <div
          key={item.id}
          className="min-w-0 flex-1 animate-[liveFeedIn_500ms_ease-out]"
        >
          <div className="flex min-w-0 items-center gap-3 whitespace-nowrap">
            <span className="truncate text-xs font-bold text-white sm:text-sm">
              {item.title}
            </span>

            <span className="hidden text-xs text-gray-500 sm:inline">
              /
            </span>

            <span className="truncate text-xs text-gray-400 sm:text-sm">
              {item.subtitle}
            </span>
          </div>
        </div>

        {/* Desktop navigation dots */}
        <div className="ml-3 hidden shrink-0 gap-1.5 sm:flex">
          {items
            .slice(0, Math.min(items.length, 5))
            .map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-5 bg-pmb-gold"
                    : "w-1.5 bg-white/20"
                }`}
                aria-label={`Show live feed item ${
                  index + 1
                }`}
              />
            ))}
        </div>
      </div>
    </div>
  );
}