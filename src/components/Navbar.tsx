import Link from "next/link";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

export function Navbar({
  homeHref,
  rightLabel,
}: {
  homeHref: string;
  rightLabel: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-pmb-border bg-pmb-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href={homeHref}>
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-gray-400 sm:inline">{rightLabel}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
