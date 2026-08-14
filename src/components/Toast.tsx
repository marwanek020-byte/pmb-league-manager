"use client";

export type ToastState = { type: "success" | "error"; message: string } | null;

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-gold ${
        toast.type === "success"
          ? "border-green-500/40 bg-green-500/10 text-green-300"
          : "border-red-500/40 bg-red-500/10 text-red-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 text-lg leading-none text-current opacity-60 hover:opacity-100"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
