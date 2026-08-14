"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type BudgetAction = "INITIAL" | "ADD" | "DECREASE";

type BudgetTransaction = {
  id: string;
  amount: string;
  balanceAfter: string;
  type: "TRANSFER_IN" | "TRANSFER_OUT" | "ADMIN_ADJUSTMENT";
  description: string | null;
  transferId: string | null;
  playerId: string | null;
  playerName: string | null;
  createdAt: string;
};

type HistoryResponse = {
  transactions: BudgetTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function formatMoney(value: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function ClubBudgetManager({
  clubId,
  initialBudget,
}: {
  clubId: string;
  initialBudget: string;
}) {
  const [budget, setBudget] = useState(initialBudget);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [action, setAction] = useState<BudgetAction>("INITIAL");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/clubs/${clubId}/budget/history?page=1&pageSize=20`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load budget history.");
      }

      setHistory(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load budget history."
      );
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Enter an amount greater than zero.");
      }

      if (!reason.trim()) {
        throw new Error("A reason is required.");
      }

      const response = await fetch(
        `/api/admin/clubs/${clubId}/budget`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            amount: numericAmount,
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Could not update the club budget."
        );
      }

      setBudget(data.budget);
      setAmount("");
      setReason("");

      setSuccess("Club budget updated successfully.");
      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the club budget."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="pmb-card p-6">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Current Budget
        </p>

        <p className="mt-1 text-3xl font-bold text-pmb-gold">
          {formatMoney(budget)}
        </p>
      </div>

      <div className="pmb-card p-6">
        <h2 className="text-lg font-semibold text-white">
          Manage Budget
        </h2>

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >
          <div className="flex flex-wrap gap-2">
            {(["INITIAL", "ADD", "DECREASE"] as BudgetAction[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAction(value)}
                  className={
                    action === value
                      ? "pmb-btn-primary"
                      : "pmb-btn-secondary"
                  }
                >
                  {value === "INITIAL"
                    ? "Set Initial"
                    : value === "ADD"
                      ? "Add Money"
                      : "Decrease Money"}
                </button>
              )
            )}
          </div>

          <div>
            <label className="pmb-label" htmlFor="budget-amount">
              Amount
            </label>

            <input
              id="budget-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="pmb-input"
              placeholder="e.g. 150000000"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="pmb-label" htmlFor="budget-reason">
              Reason
            </label>

            <input
              id="budget-reason"
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="pmb-input"
              placeholder={
                action === "INITIAL"
                  ? "Initial budget allocation"
                  : "Reason for adjustment"
              }
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-400">
              {success}
            </p>
          )}

          <button
            type="submit"
            className="pmb-btn-primary"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Confirm"}
          </button>
        </form>
      </div>

      <div className="pmb-card overflow-hidden">
        <div className="border-b border-pmb-border px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-400">
            Budget History
          </h2>
        </div>

        {loading && (
          <div className="p-6 text-sm text-gray-500">
            Loading history...
          </div>
        )}

        {!loading &&
          history &&
          history.transactions.length === 0 && (
            <div className="p-6 text-sm text-gray-500">
              No budget activity yet.
            </div>
          )}

        {!loading &&
          history &&
          history.transactions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-pmb-border bg-pmb-charcoal/60 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3 text-right">
                      Balance
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-pmb-border">
                  {history.transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-pmb-charcoal/40"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                        {new Date(
                          transaction.createdAt
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3 text-gray-300">
                        {transaction.description ?? "Budget adjustment"}
                      </td>

                      <td
                        className={`px-4 py-3 font-semibold whitespace-nowrap ${
                          Number(transaction.amount) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatMoney(transaction.amount)}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap text-gray-400">
                        {formatMoney(transaction.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </section>
  );
}