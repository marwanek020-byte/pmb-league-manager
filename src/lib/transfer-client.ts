import { TransferDTO } from "@/lib/serialize-transfer";
import { PlayerDTO } from "@/lib/serialize-player";

// Deliberately NOT importing from src/lib/api/* here - those files pull in
// "@/lib/prisma" (a live PrismaClient instance), which must never end up
// in a client bundle. This file only ever calls the HTTP API, exactly
// like the rest of the client code in this app already does.

export type TransferErrorCode =
  | "WINDOW_CLOSED"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_NOT_REGISTERED"
  | "CLUB_NOT_FOUND"
  | "SELF_TRANSFER"
  | "DUPLICATE_TRANSFER"
  | "INVALID_VALUE"
  | "TRANSFER_NOT_FOUND"
  | "INVALID_STATE"
  | "FORBIDDEN"
  | "OWNERSHIP_CONFLICT"
  | "UNKNOWN";

export class TransferApiError extends Error {
  code: TransferErrorCode;
  status: number;

  constructor(message: string, code: TransferErrorCode, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new TransferApiError(
      data.error ?? "Something went wrong. Please try again.",
      (data.code as TransferErrorCode) ?? "UNKNOWN",
      res.status
    );
  }
  return data as T;
}

export type PaginatedTransfersResponse = {
  transfers: TransferDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransferListFilters = {
  status?: string;
  page?: number;
  pageSize?: number;
};

function buildQuery(filters: TransferListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function fetchIncomingTransfers(filters: TransferListFilters = {}) {
  return fetch(`/api/transfers/incoming${buildQuery(filters)}`).then((res) =>
    parseOrThrow<PaginatedTransfersResponse>(res)
  );
}

export function fetchOutgoingTransfers(filters: TransferListFilters = {}) {
  return fetch(`/api/transfers/outgoing${buildQuery(filters)}`).then((res) =>
    parseOrThrow<PaginatedTransfersResponse>(res)
  );
}

export function fetchCompletedTransfers(filters: TransferListFilters = {}) {
  return fetch(`/api/transfers/completed${buildQuery(filters)}`).then((res) =>
    parseOrThrow<PaginatedTransfersResponse>(res)
  );
}

// There is no dedicated /api/transfers/rejected endpoint - "Rejected
// Transfers" is the existing history endpoint filtered to REJECTED, so no
// new API surface is needed for it.
export function fetchRejectedTransfers(filters: Omit<TransferListFilters, "status"> = {}) {
  return fetch(`/api/transfers/history${buildQuery({ ...filters, status: "REJECTED" })}`).then((res) =>
    parseOrThrow<PaginatedTransfersResponse>(res)
  );
}

export function fetchTransferById(id: string) {
  return fetch(`/api/transfers/${id}`).then((res) => parseOrThrow<{ transfer: TransferDTO }>(res));
}

export type CreateTransferPayload = {
  playerId?: string;
  toClubId?: string;
  season?: string;
  type?: "PERMANENT" | "LOAN" | "SWAP" | "FREE_TRANSFER";
  fee?: number;
  currency?: string;
  notes?: string;
  durationDays?: number;
  swapPlayerId?: string;
};

export function createTransferRequest(payload: CreateTransferPayload) {
  return fetch("/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => parseOrThrow<{ transfer: TransferDTO }>(res));
}

export function fetchMyClubPlayers() {
  return fetch(`/api/manager/players/list`).then((res) =>
    parseOrThrow<{ players: PlayerDTO[] }>(res)
  );
}

export function approveTransferRequest(id: string) {
  return fetch(`/api/transfers/${id}/approve`, { method: "POST" }).then((res) =>
    parseOrThrow<{ transfer: TransferDTO }>(res)
  );
}

export function rejectTransferRequest(id: string, reason?: string) {
  return fetch(`/api/transfers/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  }).then((res) => parseOrThrow<{ transfer: TransferDTO }>(res));
}

export function cancelTransferRequest(id: string) {
  return fetch(`/api/transfers/${id}/cancel`, { method: "POST" }).then((res) =>
    parseOrThrow<{ transfer: TransferDTO }>(res)
  );
}

export function completeTransferRequest(id: string) {
  return fetch(`/api/transfers/${id}/complete`, { method: "POST" }).then((res) =>
    parseOrThrow<{ transfer: TransferDTO }>(res)
  );
}

export function fetchTransferHistory(filters: TransferListFilters = {}) {
  return fetch(`/api/transfers/history${buildQuery(filters)}`).then((res) =>
    parseOrThrow<PaginatedTransfersResponse>(res)
  );
}

// Player search re-uses the same global search endpoint the "Add Player"
// flow already uses - no new API route needed here either.
export function searchPlayers(query: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ q: query, pageSize: "15", ...extra });
  return fetch(`/api/players/search?${params.toString()}`).then((res) =>
    parseOrThrow<{ players: PlayerDTO[]; total: number }>(res)
  );
}
