/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

const mockSubmitValidation = jest.fn()
jest.mock("@/services/knowledge-continuity/continuity.service", () => ({
  submitValidation: (...a: unknown[]) => mockSubmitValidation(...a),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import {
  KCE_VERDICT_RETIRED_MESSAGE,
  useSubmitValidation,
  verdictOutcomeMessage,
} from "../useSubmitValidation"
import type { ValidationVerdict } from "@/types/knowledge-continuity"

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

// D-10: the toast reports the band the server set, not the button pressed.
describe("verdictOutcomeMessage", () => {
  test.each<[ValidationVerdict, string, string | null, RegExp]>([
    ["reject", "deprecated", null, /rejected and retired/],
    ["amend", "amend_requested", null, /sent back for amendment\. It will not be cited/],
    ["confirm", "validated", null, /approved and validated/],
    ["confirm", "provisional", null, /provisional and can be cited/],
    ["confirm", "needs_review", "awaiting_deeper_probe", /needs a deeper interview before it can be cited/],
  ])("%s -> %s (%s)", (verdict, band, reviewState, expected) => {
    expect(verdictOutcomeMessage(verdict, { validity_band: band, review_state: reviewState })).toMatch(
      expected
    )
  })

  test("a review_state on a non-confirm verdict does not claim the unit was approved", () => {
    expect(
      verdictOutcomeMessage("reject", { validity_band: "deprecated", review_state: "awaiting_deeper_probe" })
    ).toMatch(/rejected and retired/)
  })

  test("an unknown band (an older backend) falls back to the verdict wording", () => {
    expect(verdictOutcomeMessage("amend", { validity_band: "needs_review" })).toBe(
      "Unit sent back for amendment"
    )
  })
})

describe("useSubmitValidation (D-10)", () => {
  test("a held confirm toasts the held outcome and refreshes queue AND analytics", async () => {
    mockSubmitValidation.mockResolvedValue({
      status: true,
      data: {
        unit_id: "unit-1",
        verdict: "confirm",
        kvi: 0.7,
        validity_band: "needs_review",
        sme_signed_off: true,
        note: null,
        review_state: "awaiting_deeper_probe",
        approvals_resolved: 1,
      },
    })
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries")

    const { result } = renderHook(() => useSubmitValidation(), { wrapper })
    result.current.mutate({
      unitId: "unit-1",
      body: { validator_user_id: "self", method: "sme_review", verdict: "confirm" },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/needs a deeper interview/))
    expect(toast.info).not.toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["knowledge-continuity", "review-queue"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["knowledge-continuity", "analytics"] })
  })

  test("a reject toasts 'retired'", async () => {
    mockSubmitValidation.mockResolvedValue({
      status: true,
      data: { unit_id: "u", verdict: "reject", kvi: 0.7, validity_band: "deprecated", sme_signed_off: false },
    })
    const { result } = renderHook(() => useSubmitValidation(), { wrapper })
    result.current.mutate({
      unitId: "u",
      body: { validator_user_id: "self", method: "sme_review", verdict: "reject", notes: "wrong" },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith("Unit rejected and retired. It will not be cited.")
  })

  test("a 409 (unit retired since the queue loaded) says so and refreshes the queue", async () => {
    mockSubmitValidation.mockRejectedValue({
      response: { status: 409, data: { detail: "Deprecated units cannot be re-banded by a verdict" } },
    })
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useSubmitValidation(), { wrapper })
    result.current.mutate({
      unitId: "u",
      body: { validator_user_id: "self", method: "sme_review", verdict: "confirm" },
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith(KCE_VERDICT_RETIRED_MESSAGE)
    expect(toast.error).not.toHaveBeenCalledWith("Couldn't submit the review. Please try again.")
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["knowledge-continuity", "review-queue"] })
  })

  test("a non-409 failure keeps the generic message and does not refresh", async () => {
    mockSubmitValidation.mockRejectedValue({ response: { status: 500 } })
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useSubmitValidation(), { wrapper })
    result.current.mutate({
      unitId: "u",
      body: { validator_user_id: "self", method: "sme_review", verdict: "confirm" },
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith("Couldn't submit the review. Please try again.")
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
