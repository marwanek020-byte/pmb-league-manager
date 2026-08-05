import Link from "next/link";
import { ReactNode } from "react";

export function DashboardCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="pmb-card group flex flex-col gap-4 p-6 transition hover:border-pmb-gold/60 hover:shadow-gold"
    >
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-pmb-gold/40 bg-pmb-gold/10 text-pmb-gold">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-white group-hover:text-pmb-gold">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      </div>
    </Link>
  );
}
