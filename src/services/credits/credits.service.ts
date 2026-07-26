// Credit-write service — the four Phase 6.5 credit endpoints.
//
// These go through the singleton `api` axios instance (the same one the existing
// GET credits calls use — `practitioner.service.ts` / `distributor.service.ts`),
// NOT `agentApi`. Each function posts the typed body and returns the parsed
// `data` (the ledger `CreditTransaction`).
//
// The backend gates these behind its own server flag and returns 503 until it is
// enabled; the frontend `VITE_CREDITS_WRITE` flag only decides whether the write
// UI is rendered. The hook layer maps a 503 to a friendly toast, so a flag-on
// frontend against a flag-off backend degrades gracefully.

import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type {
  AllocateCreditsBody,
  CreditTransaction,
  PurchaseCreditsBody,
  RefundCreditsBody,
  UseCreditsBody,
} from "@/types/credits"

async function postCredit<B>(
  path: string,
  body: B,
): Promise<CreditTransaction | undefined> {
  const res = await api.post<BaseApiResponse<CreditTransaction>>(path, body)
  return res.data?.data
}

/** Distributor buys credits into their available pool. */
export function purchaseCredits(body: PurchaseCreditsBody) {
  return postCredit("/api/distributor/credits/purchase", body)
}

/** Distributor allocates pool credits to one of their practitioners. */
export function allocateCredits(body: AllocateCreditsBody) {
  return postCredit("/api/distributor/credits/allocate", body)
}

/** Practitioner consumes credits (e.g. running a PRISM assessment for a client). */
export function useCredits(body: UseCreditsBody) {
  return postCredit("/api/practitioner/credits/use", body)
}

/** Distributor refunds/reverses a prior credit transaction. */
export function refundCredits(body: RefundCreditsBody) {
  return postCredit("/api/distributor/credits/refund", body)
}
