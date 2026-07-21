/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

const mockRecordUsage = jest.fn()
jest.mock("@/services/knowledge-continuity/continuity.service", () => ({
  recordUsage: (...a: unknown[]) => mockRecordUsage(...a),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import { useRecordUsage } from "../useRecordUsage"

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe("useRecordUsage", () => {
  test("records a still_true signal and confirms with a toast", async () => {
    mockRecordUsage.mockResolvedValue({ status: true, data: { id: "usage-1" } })
    const { result } = renderHook(() => useRecordUsage(), { wrapper })

    result.current.mutate({
      unitId: "unit-1",
      body: { signal_type: "still_true", value: 1.0, successor_user_id: "successor-1" },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRecordUsage).toHaveBeenCalledWith("unit-1", {
      signal_type: "still_true",
      value: 1.0,
      successor_user_id: "successor-1",
    })
    expect(toast.success).toHaveBeenCalledWith("Marked still accurate")
  })

  test("invalidates the owning curriculum when a template id is supplied", async () => {
    mockRecordUsage.mockResolvedValue({ status: true, data: {} })
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useRecordUsage(), { wrapper })

    result.current.mutate({
      unitId: "unit-1",
      templateId: "tmpl-1",
      body: { signal_type: "clarity_flag", value: 0.0, notes: "unclear" },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["knowledge-continuity", "curriculum", "tmpl-1"],
    })
    expect(toast.success).toHaveBeenCalledWith("Sent for clarification")
  })

  test("shows an error toast when the request fails", async () => {
    mockRecordUsage.mockRejectedValue(new Error("network error"))
    const { result } = renderHook(() => useRecordUsage(), { wrapper })

    result.current.mutate({
      unitId: "unit-1",
      body: { signal_type: "no_longer_true", value: 0.0 },
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith("Couldn't record your feedback. Please try again.")
  })
})
