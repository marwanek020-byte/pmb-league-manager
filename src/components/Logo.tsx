export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = {
    sm: { box: "h-8 w-8", text: "text-sm" },
    md: { box: "h-11 w-11", text: "text-lg" },
    lg: { box: "h-16 w-16", text: "text-2xl" },
  }[size];

  return (
    <div className="flex items-center gap-3">
      <img
        src="/branding/pmb-lion.jpg"
        alt="PMB Logo"
        className={`${dims.box} rounded-xl object-contain shadow-gold border border-pmb-gold/30 bg-black`}
      />
      <div className="leading-tight">
        <p className="text-base font-bold tracking-wide text-white">
          PMB <span className="text-pmb-gold">League Manager</span>
        </p>
      </div>
    </div>
  );
}
