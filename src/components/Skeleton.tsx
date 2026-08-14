export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-pmb-border/60 ${className}`} aria-hidden />;
}
