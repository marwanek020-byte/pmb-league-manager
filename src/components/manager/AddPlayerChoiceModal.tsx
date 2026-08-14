"use client";

export function AddPlayerChoiceModal({
  onClose,
  onExisting,
  onNew,
}: {
  onClose: () => void;
  onExisting: () => void;
  onNew: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pmb-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add player</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-gray-500 hover:text-white"
          >
            &times;
          </button>
        </div>

        <p className="mb-6 text-sm text-gray-300">
          Choose whether to add an existing player from the database or create a new player record.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onExisting}
            className="pmb-btn-primary w-full"
          >
            Add existing player
          </button>
          <button
            type="button"
            onClick={onNew}
            className="pmb-btn-secondary w-full"
          >
            Create new player
          </button>
        </div>
      </div>
    </div>
  );
}
