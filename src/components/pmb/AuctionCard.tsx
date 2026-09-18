"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Clock3,
  Gavel,
  LoaderCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { cn, countdown, eur, useNow } from "./shared";

export interface Auction {
  id: string;
  version: number;
  player: {
    name: string;
    position: string;
    overall: number;
    nationality: string;
    flag: string;
    portraitUrl?: string | null;
  };
  endsAt: string;
  status: "open" | "closed" | "settled";
  currentBidEur: number;
  minimumIncrementEur: number;
  highestBidderName: string | null;
  isUserLeading: boolean;
}

export interface BidCommand {
  auctionId: string;
  expectedVersion: number;
  amountEur: number;
  mode: "direct" | "maximum";
  idempotencyKey: string;
}

interface AuctionCardProps {
  auction: Auction;
  availableBudgetEur: number;
  connected: boolean;
  serverOffsetMs?: number;
  hapticsEnabled?: boolean;
  outbidNotice?: { id: string; bidderName: string };
  onBid: (command: BidCommand) => Promise<void>;
}

export default function AuctionCard({
  auction,
  availableBudgetEur,
  connected,
  serverOffsetMs = 0,
  hapticsEnabled = false,
  outbidNotice,
  onBid,
}: AuctionCardProps) {
  const now = useNow(serverOffsetMs);
  const reducedMotion = Boolean(useReducedMotion());
  const customId = useId();
  const [customAmount, setCustomAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const lastHaptic = useRef<string | null>(null);
  const retryCommand = useRef<BidCommand | null>(null);

  const deadline = Date.parse(auction.endsAt);
  const remaining =
    now === null || !Number.isFinite(deadline)
      ? null
      : Math.max(0, deadline - now);

  const closed =
    auction.status !== "open" ||
    !Number.isFinite(deadline) ||
    remaining === 0;

  const urgent = remaining !== null && remaining > 0 && remaining < 60000;
  const amber = remaining !== null && remaining >= 60000 && remaining < 120000;
  const green = remaining !== null && remaining >= 300000;

  const canAct = connected && !closed && !pending && remaining !== null;
  const minimumBid = auction.currentBidEur + auction.minimumIncrementEur;
  const customValue = /^\d+$/.test(customAmount) ? Number(customAmount) : NaN;
  const validCustom =
    Number.isSafeInteger(customValue) &&
    customValue >= minimumBid &&
    customValue <= availableBudgetEur;

  useEffect(() => {
    if (!outbidNotice || lastHaptic.current === outbidNotice.id) return;
    lastHaptic.current = outbidNotice.id;
    if (hapticsEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([60, 40, 60]);
    }
  }, [outbidNotice, hapticsEnabled]);

  async function submit(
    amountEur: number,
    mode: BidCommand["mode"]
  ) {
    if (lock.current || !canAct) return;
    if (
      !Number.isSafeInteger(amountEur) ||
      amountEur < minimumBid ||
      amountEur > availableBudgetEur
    ) {
      setFailed(true);
      setMessage(`Enter an amount between ${eur(minimumBid)} and ${eur(availableBudgetEur)}.`);
      return;
    }

    lock.current = true;
    setPending(true);
    setFailed(false);
    setMessage("");

    const previous = retryCommand.current;
    const sameCommand =
      previous?.auctionId === auction.id &&
      previous.expectedVersion === auction.version &&
      previous.amountEur === amountEur &&
      previous.mode === mode;

    const command: BidCommand = sameCommand
      ? previous!
      : {
          auctionId: auction.id,
          expectedVersion: auction.version,
          amountEur,
          mode,
          idempotencyKey: crypto.randomUUID(),
        };

    retryCommand.current = command;

    try {
      await onBid(command);
      retryCommand.current = null;
      setMessage(
        mode === "maximum"
          ? "Maximum bid registered. Live standings may change."
          : "Bid accepted. Live standings may change."
      );
      if (mode === "maximum") setCustomAmount("");
    } catch {
      setFailed(true);
      setMessage(
        "The bid could not be confirmed. Refresh live state before changing the amount; an unchanged retry reuses its request key."
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <article
      aria-label={`Auction for ${auction.player.name}`}
      className="pmb-card-interactive relative overflow-hidden"
    >
      {/* Player Header Banner */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gold-ambient">
        {auction.player.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={auction.player.portraitUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain object-bottom"
          />
        ) : (
          <div aria-hidden="true" className="grid h-full place-items-center">
            <span className="pmb-heading text-7xl text-white/10">
              {auction.player.position}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-pmb-base via-transparent to-transparent" />

        {/* Rating Badge */}
        <div className="absolute left-4 top-4 rounded-xl border border-pmb-gold/40 bg-pmb-void/90 p-3 text-center shadow-lg">
          <p className="pmb-data text-3xl font-black text-pmb-gold-light">
            {auction.player.overall}
          </p>
          <p className="pmb-heading text-xs text-white">{auction.player.position}</p>
          <span className="sr-only">Overall rating</span>
        </div>

        {/* Nationality Pill */}
        <span className="pmb-pill absolute right-4 top-4 bg-pmb-void/90 text-white">
          <span aria-hidden="true">{auction.player.flag}</span>
          {auction.player.nationality}
        </span>

        {/* Player Name & Countdown */}
        <div className="absolute inset-x-4 bottom-4">
          <h2 className="pmb-heading text-2xl text-white">{auction.player.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "pmb-pill pmb-data bg-pmb-void/90",
                urgent && "pmb-danger animate-urgent",
                amber && "border-pmb-gold/30 text-pmb-gold-light",
                green && "pmb-positive"
              )}
              aria-label={
                closed
                  ? "Auction closed"
                  : remaining === null
                  ? "Synchronizing countdown"
                  : `${countdown(remaining)} remaining`
              }
            >
              <Clock3 size={14} aria-hidden="true" />
              {closed ? "Closed" : remaining === null ? "Syncing…" : countdown(remaining)}
            </span>

            <span className={cn("pmb-pill bg-pmb-void/90", connected ? "pmb-positive" : "text-pmb-text-secondary")}>
              {connected ? "Live connection" : "Reconnecting"}
            </span>
          </div>
        </div>
      </div>

      {/* Bid Actions & Form */}
      <div className="space-y-4 p-5">
        <AnimatePresence mode="wait">
          {outbidNotice && (
            <motion.div
              key={outbidNotice.id}
              initial={reducedMotion ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className="flex gap-2 rounded-xl border border-pmb-red/30 bg-pmb-red/10 p-3 text-sm text-red-300"
            >
              <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
              <span>
                You have been outbid on {auction.player.name} by {outbidNotice.bidderName}.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="pmb-eyebrow">Current bid</p>
            <p className="pmb-data mt-1 text-2xl font-bold text-white">{eur(auction.currentBidEur)}</p>
          </div>
          {auction.isUserLeading && (
            <span className="pmb-pill pmb-positive">
              <ShieldCheck size={14} aria-hidden="true" /> Leading
            </span>
          )}
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-pmb-text-secondary">Highest bidder</dt>
            <dd className="text-right font-semibold text-white">
              {auction.highestBidderName ?? "No bids yet"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-1 text-pmb-text-secondary">
              <Wallet size={14} aria-hidden="true" /> Available budget
            </dt>
            <dd className="pmb-data text-pmb-gold-light">{eur(availableBudgetEur)}</dd>
          </div>
        </dl>

        {/* Quick Bid Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {[500000, 1000000].map((increment) => {
            const amount = auction.currentBidEur + increment;
            return (
              <button
                key={increment}
                type="button"
                disabled={!canAct || amount < minimumBid || amount > availableBudgetEur}
                title={`Place a bid of ${eur(amount)}`}
                onClick={() => submit(amount, "direct")}
                className="pmb-button-primary"
              >
                <Gavel size={15} aria-hidden="true" />
                +{increment === 500000 ? "€500k" : "€1M"}
              </button>
            );
          })}
        </div>

        {/* Custom Maximum Bid Form */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (validCustom) void submit(customValue, "maximum");
          }}
        >
          <label htmlFor={customId} className="mb-2 block text-xs font-semibold text-pmb-text-secondary">
            Custom maximum bid · EUR
          </label>
          <div className="flex gap-2">
            <input
              id={customId}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="pmb-input pmb-data min-w-0"
              placeholder={String(minimumBid)}
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              disabled={!canAct}
            />
            <button
              type="submit"
              disabled={!canAct || !validCustom}
              className="pmb-button-secondary shrink-0"
            >
              Set max
            </button>
          </div>
          <p className="mt-2 text-xs text-pmb-text-secondary">
            Proxy bidding may increase your bid automatically up to this limit.
          </p>
        </form>

        {pending && (
          <p role="status" className="flex items-center gap-2 text-sm text-pmb-gold-light">
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            Submitting bid…
          </p>
        )}

        {message && (
          <p
            role={failed ? "alert" : "status"}
            className={cn("text-sm", failed ? "text-red-300" : "text-emerald-300")}
          >
            {message}
          </p>
        )}
      </div>
    </article>
  );
}
