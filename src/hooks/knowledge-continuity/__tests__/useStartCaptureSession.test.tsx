/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"

const mockStartCaptureSession = jest.fn()
jest.mock("@/services/knowledge-continuity/continuity.service", () => ({
  startCaptureSession: (...a: unknown[]) => mockStartCaptureSession(...a),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import { useStartCaptureSession } from "../useStartCaptureSession"

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe("useStartCaptureSession", () => {
  test("toasts the new session id on success", async () => {
    mockStartCaptureSession.mockResolvedValue({
      status: true,
      data: { id: "session-1", status: "scheduled", is_synthetic: true },
    })

    const { result } = renderHook(() => useStartCaptureSession(), { wrapper })
    result.current.mutate({
      org_id: "org-1",
      expert_user_id: "expert-1",
      role_title: "Lead Welder",
      is_synthetic: true,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith("Capture session started — session-1")
  })

  test("shows the consent-required message on a 403", async () => {
    const error = new Error("Forbidden") as AxiosError
    error.response = { status: 403 } as AxiosError["response"]
    error.isAxiosError = true
    mockStartCaptureSession.mockRejectedValue(error)

    const { result } = renderHook(() => useStartCaptureSession(), { wrapper })
    result.current.mutate({
      org_id: "org-1",
      expert_user_id: "expert-1",
      role_title: "Lead Welder",
      is_synthetic: false,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith(
      "Consent record required for a real expert; use a practice session or attach a consent id."
    )
  })

  test("shows a generic error message for non-403 failures", async () => {
    const error = new Error("Server error") as AxiosError
    error.response = { status: 500 } as AxiosError["response"]
    error.isAxiosError = true
    mockStartCaptureSession.mockRejectedValue(error)

    const { result } = renderHook(() => useStartCaptureSession(), { wrapper })
    result.current.mutate({
      org_id: "org-1",
      expert_user_id: "expert-1",
      role_title: "Lead Welder",
      is_synthetic: true,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith("Couldn't start the capture session. Please try again.")
  })
})
