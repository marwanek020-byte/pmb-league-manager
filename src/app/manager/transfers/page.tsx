export default function ManagerTransfersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transfer Window</h1>
        <p className="mt-1 text-sm text-gray-400">
          Transfer activity for your club will appear here once enabled.
        </p>
      </div>

      <div className="pmb-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="pmb-badge border-red-500/30 bg-red-500/10 text-red-400">
          Status: Closed
        </span>
        <p className="text-gray-400">Transfers are currently closed.</p>
      </div>
    </div>
  );
}
