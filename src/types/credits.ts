// Credit-write types — request bodies and the ledger transaction result the
// Phase 6.5 credit endpoints return. These back the flag-gated write controls
// (`VITE_CREDITS_WRITE`) on the distributor + practitioner Credits pages.

/** Ledger entry types the backend records for a credit movement. */
export type CreditTransactionType =
  | "purchase"
  | "allocate"
  | "use"
  | "refund"

/**
 * The `data` payload of every credit-write endpoint (standard `BaseApiResponse`
 * envelope). `balance` is the counterparty's post-transaction balance;
 * `idempotent_replay` is true when the same `idempotency_key` was seen before
 * and no new movement was recorded.
 */
export type CreditTransaction = {
  transaction_id: string
  ledger_id: string
  type: CreditTransactionType
  amount: number
  balance: number
  counterparty_id: string | null
  idempotent_replay: boolean
}

/** POST /api/distributor/credits/purchase */
export type PurchaseCreditsBody = {
  amount: number
  order_ref?: string
  idempotency_key?: string
}

/** POST /api/distributor/credits/allocate */
export type AllocateCreditsBody = {
  practitioner_id: string
  amount: number
  idempotency_key?: string
}

/** POST /api/practitioner/credits/use */
export type UseCreditsBody = {
  amount: number
  client_id?: string
  session_ref?: string
  idempotency_key?: string
}

/** POST /api/distributor/credits/refund */
export type RefundCreditsBody = {
  transaction_id: string
  reason?: string
  idempotency_key?: string
}
