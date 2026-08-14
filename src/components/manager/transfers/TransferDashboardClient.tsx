"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TransferDTO } from "@/lib/serialize-transfer";
import { TransferWindowBanner } from "./TransferWindowBanner";
import { CreateTransferModal } from "./CreateTransferModal";
import { Toast } from "@/components/Toast";
import { useToast } from "@/lib/use-toast";

export type TransferDashboardStats = {
  awaitingMyApproval: number;
  myActiveRequests: number;
  completed: number;
  rejected: number;
};

export function TransferDashboardClient({
  clubId,
  clubName,
  windowOpen,
  stats,
}: {
  clubId: string;
  clubName: string;
  windowOpen: boolean;
  stats: TransferDashboardStats;
}) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast, showSuccess, showError, dismiss } = useToast();

  function handleCreated(transfer: TransferDTO) {
    showSuccess(`Transfer request for ${transfer.playerName} was sent to ${transfer.fromClubName}.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <TransferWindowBanner isOpen={windowOpen} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-400">
          Manage transfer requests for {clubName}, both the players you&apos;re trying to sign and the
          requests other clubs have made for yours.
        </p>
        <button
          type="button"
          disabled={!windowOpen}
          onClick={() => setShowCreateModal(true)}
          className="pmb-btn-primary whitespace-nowrap"
          title={!windowOpen ? "The transfer window is closed" : undefined}
        >
          Request a Transfer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/manager/transfers/outgoing" className="pmb-card p-6 transition hover:border-pmb-gold/60">
          <p className="text-3xl font-bold text-pmb-gold">{stats.awaitingMyApproval}</p>
          <p className="mt-1 text-sm text-gray-400">Awaiting your approval</p>
        </Link>
        <Link href="/manager/transfers/incoming" className="pmb-card p-6 transition hover:border-pmb-gold/60">
          <p className="text-3xl font-bold text-pmb-gold">{stats.myActiveRequests}</p>
          <p className="mt-1 text-sm text-gray-400">Your active requests</p>
        </Link>
        <Link href="/manager/transfers/completed" className="pmb-card p-6 transition hover:border-pmb-gold/60">
          <p className="text-3xl font-bold text-pmb-gold">{stats.completed}</p>
          <p className="mt-1 text-sm text-gray-400">Completed</p>
        </Link>
        <Link href="/manager/transfers/rejected" className="pmb-card p-6 transition hover:border-pmb-gold/60">
          <p className="text-3xl font-bold text-pmb-gold">{stats.rejected}</p>
          <p className="mt-1 text-sm text-gray-400">Rejected</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/manager/transfers/outgoing" className="pmb-card flex flex-col gap-1 p-6 hover:border-pmb-gold/60">
          <h3 className="font-semibold text-white">Outgoing Requests</h3>
          <p className="text-sm text-gray-400">
            Offers from other clubs for your players. Accept or reject here.
          </p>
        </Link>
        <Link href="/manager/transfers/incoming" className="pmb-card flex flex-col gap-1 p-6 hover:border-pmb-gold/60">
          <h3 className="font-semibold text-white">Incoming Requests</h3>
          <p className="text-sm text-gray-400">
            Players you&apos;ve requested from other clubs. Cancel anytime before it&apos;s resolved.
          </p>
        </Link>
      </div>

      {showCreateModal && (
        <CreateTransferModal
          clubId={clubId}
          clubName={clubName}
          windowOpen={windowOpen}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
          onError={showError}
        />
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
