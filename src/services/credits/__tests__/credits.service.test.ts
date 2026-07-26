/**
 * @jest-environment node
 *
 * Credit-write service tests — each function must POST to the right path with
 * the right body via the singleton `api` instance, and return the parsed
 * envelope `data` (the ledger transaction).
 */
const mockPost = jest.fn()
jest.mock("@/lib/axios", () => ({ api: { post: mockPost } }))

import {
  allocateCredits,
  purchaseCredits,
  refundCredits,
  useCredits,
} from "../credits.service"
import type { CreditTransaction } from "@/types/credits"

const tx: CreditTransaction = {
  transaction_id: "t1",
  ledger_id: "l1",
  type: "purchase",
  amount: 500,
  balance: 1800,
  counterparty_id: null,
  idempotent_replay: false,
}

const envelope = (data: unknown) => ({ data: { status: true, data } })

beforeEach(() => mockPost.mockReset())

describe("credits.service", () => {
  test("purchaseCredits posts to the distributor purchase endpoint and returns data", async () => {
    mockPost.mockResolvedValueOnce(envelope(tx))
    const result = await purchaseCredits({ amount: 500, order_ref: "PO-1" })
    expect(mockPost).toHaveBeenCalledWith("/api/distributor/credits/purchase", {
      amount: 500,
      order_ref: "PO-1",
    })
    expect(result).toEqual(tx)
  })

  test("allocateCredits posts practitioner_id + amount", async () => {
    mockPost.mockResolvedValueOnce(envelope({ ...tx, type: "allocate" }))
    const result = await allocateCredits({ practitioner_id: "p-9", amount: 100 })
    expect(mockPost).toHaveBeenCalledWith("/api/distributor/credits/allocate", {
      practitioner_id: "p-9",
      amount: 100,
    })
    expect(result?.type).toBe("allocate")
  })

  test("useCredits posts to the practitioner use endpoint", async () => {
    mockPost.mockResolvedValueOnce(envelope({ ...tx, type: "use" }))
    const result = await useCredits({ amount: 1, client_id: "c-1", session_ref: "s-1" })
    expect(mockPost).toHaveBeenCalledWith("/api/practitioner/credits/use", {
      amount: 1,
      client_id: "c-1",
      session_ref: "s-1",
    })
    expect(result?.type).toBe("use")
  })

  test("refundCredits posts transaction_id + reason", async () => {
    mockPost.mockResolvedValueOnce(envelope({ ...tx, type: "refund" }))
    const result = await refundCredits({ transaction_id: "t1", reason: "duplicate" })
    expect(mockPost).toHaveBeenCalledWith("/api/distributor/credits/refund", {
      transaction_id: "t1",
      reason: "duplicate",
    })
    expect(result?.type).toBe("refund")
  })

  test("returns undefined when the envelope has no data", async () => {
    mockPost.mockResolvedValueOnce({ data: { status: true } })
    const result = await purchaseCredits({ amount: 10 })
    expect(result).toBeUndefined()
  })
})
