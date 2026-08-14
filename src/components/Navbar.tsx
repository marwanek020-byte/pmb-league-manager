import Link from "next/link";
import { ReactNode } from "react";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

export function Navbar({
  homeHref,
  rightLabel,
  extra,
}: {
  homeHref: string;
  rightLabel: string;
  /** Optional extra content shown between rightLabel and the sign-out button - e.g. the manager's budget indicator. Admin usage omits this. */
  extra?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-pmb-border bg-pmb-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href={homeHref}>
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-gray-400 sm:inline">{rightLabel}</span>
          {extra}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
