import { NextResponse } from "next/server";
import { TransferServiceError, TransferServiceErrorCode } from "@/lib/services/transfer-service";

const STATUS_BY_CODE: Record<TransferServiceErrorCode, number> = {
  WINDOW_CLOSED: 409,
  PLAYER_NOT_FOUND: 404,
  PLAYER_NOT_REGISTERED: 409,
  CLUB_NOT_FOUND: 404,
  SELF_TRANSFER: 400,
  DUPLICATE_TRANSFER: 409,
  INVALID_VALUE: 400,
  TRANSFER_NOT_FOUND: 404,
  INVALID_STATE: 409,
  FORBIDDEN: 403,
  OWNERSHIP_CONFLICT: 409,
  INSUFFICIENT_BUDGET: 402,
  USER_NOT_FOUND: 404,
};

/**
 * Every mutating transfer route funnels errors through this one place, so
 * the HTTP status a client sees for e.g. FORBIDDEN or WINDOW_CLOSED is
 * identical no matter which endpoint raised it - the mapping lives once,
 * here, instead of being re-declared (and risking drift) in every route.
 */
export function transferErrorResponse(err: unknown): NextResponse {
  if (err instanceof TransferServiceError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: STATUS_BY_CODE[err.code] }
    );
  }

  console.error(err);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
