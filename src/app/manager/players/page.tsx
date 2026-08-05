export default function PlayerListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Player List</h1>
        <p className="mt-1 text-sm text-gray-400">
          All players registered to your club will appear here.
        </p>
      </div>

      <div className="pmb-card flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-gray-400">No registered players.</p>
        {/* Player registration is a future phase feature - this button is
           intentionally inert for now. */}
        <button type="button" className="pmb-btn-primary">
          Add Player
        </button>
      </div>
    </div>
  );
}
