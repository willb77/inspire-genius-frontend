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

import { useSubmitValidation } from "../useSubmitValidation"

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe("useSubmitValidation", () => {
  test("submits the verdict and invalidates the review queue on success", async () => {
    mockSubmitValidation.mockResolvedValue({
      status: true,
      data: { id: "unit-1", validity_band: "validated" },
    })
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries")

    const { result } = renderHook(() => useSubmitValidation(), { wrapper })
    result.current.mutate({
      unitId: "unit-1",
      body: { validator_user_id: "user-1", method: "sme_review", verdict: "confirm" },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockSubmitValidation).toHaveBeenCalledWith("unit-1", {
      validator_user_id: "user-1",
      method: "sme_review",
      verdict: "confirm",
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["knowledge-continuity", "review-queue"],
    })
    expect(toast.success).toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
  })

  test("surfaces a held-at-provisional note via toast.info", async () => {
    mockSubmitValidation.mockResolvedValue({
      status: true,
      data: {
        id: "unit-1",
        validity_band: "provisional",
        note: "Held at provisional — needs a practitioner + a second confirm.",
      },
    })

    const { result } = renderHook(() => useSubmitValidation(), { wrapper })
    result.current.mutate({
      unitId: "unit-1",
      body: { validator_user_id: "user-1", method: "sme_review", verdict: "confirm" },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.info).toHaveBeenCalledWith(
      "Held at provisional — needs a practitioner + a second confirm."
    )
  })

  test("shows an error toast when the request fails", async () => {
    mockSubmitValidation.mockRejectedValue(new Error("network error"))

    const { result } = renderHook(() => useSubmitValidation(), { wrapper })
    result.current.mutate({
      unitId: "unit-1",
      body: { validator_user_id: "user-1", method: "sme_review", verdict: "reject", notes: "bad" },
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith("Couldn't submit the review. Please try again.")
  })
})
