export function TransferWindowBanner({ isOpen }: { isOpen: boolean }) {
  return (
    <div
      className={`pmb-card flex flex-col gap-1 border p-4 sm:flex-row sm:items-center sm:justify-between ${
        isOpen ? "border-green-500/30" : "border-red-500/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOpen ? "bg-green-400" : "bg-red-400"}`}
          aria-hidden
        />
        <p className="font-semibold text-white">
          Transfer window is currently{" "}
          <span className={isOpen ? "text-green-400" : "text-red-400"}>
            {isOpen ? "open" : "closed"}
          </span>
        </p>
      </div>
      <p className="text-sm text-gray-400">
        {isOpen
          ? "You can request new transfers for your club."
          : "New transfer requests are disabled until the Administrator opens the window. You can still respond to existing requests."}
      </p>
    </div>
  );
}
