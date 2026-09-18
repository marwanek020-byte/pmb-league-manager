"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}

export const eur = (value: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

export function useMedia(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/**
 * Null on the server and first client render to avoid hydration mismatch.
 * Pass an offset calculated from a server-time synchronization response.
 */
export function useNow(serverOffsetMs = 0) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now() + serverOffsetMs);
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [serverOffsetMs]);

  return now;
}

export function countdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${days ? `${days}d ` : ""}${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string | null;
}

export function ClubBadge({
  club,
  className,
}: {
  club: Club;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl",
        "border border-pmb-gold/30 bg-pmb-void shadow-gold",
        className
      )}
    >
      {club.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={club.logoUrl}
          alt={club.name}
          width={64}
          height={64}
          className="h-4/5 w-4/5 object-contain"
        />
      ) : (
        <span aria-hidden="true" className="pmb-heading text-pmb-gold-light text-base">
          {club.shortName || club.name.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
}

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  busy?: boolean;
  children: ReactNode;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  busy = false,
  children,
}: ResponsiveDialogProps) {
  const desktop = useMedia("(min-width: 768px)");

  const changeOpen = (next: boolean) => {
    if (!busy) onOpenChange(next);
  };

  const close = (
    <button
      type="button"
      aria-label="Close dialog"
      disabled={busy}
      className="pmb-icon-button"
      onClick={() => changeOpen(false)}
    >
      <X size={18} aria-hidden="true" />
    </button>
  );

  if (!desktop) {
    return (
      <Drawer.Root
        open={open}
        onOpenChange={changeOpen}
        dismissible={!busy}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/75" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[92dvh]
              flex-col rounded-t-3xl border border-white/10
              bg-pmb-base shadow-glass outline-none"
          >
            <div
              aria-hidden="true"
              className="mx-auto my-3 h-1.5 w-12 rounded-full bg-white/25"
            />
            <header className="flex items-start justify-between gap-4 px-5 pb-4">
              <div>
                <Drawer.Title className="pmb-heading text-lg text-white">
                  {title}
                </Drawer.Title>
                <Drawer.Description className="mt-1 text-sm text-pmb-text-secondary">
                  {description}
                </Drawer.Description>
              </div>
              {close}
            </header>
            <div className="safe-bottom overflow-y-auto overscroll-contain px-5">
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
          className="pmb-card fixed left-1/2 top-1/2 z-[70]
            max-h-[90dvh] w-[min(94vw,850px)] -translate-x-1/2
            -translate-y-1/2 overflow-y-auto bg-pmb-base p-6 text-white"
        >
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="pmb-heading text-xl text-white">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pmb-text-secondary">
                {description}
              </Dialog.Description>
            </div>
            {close}
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
