/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useSubmitFeedback, useFeedbackList, useFeedbackStats } from "../useFeedback"
import { submitFeedback, getFeedbackList, getFeedbackStats } from "@/services/feedback/feedback.service"

jest.mock("@/services/feedback/feedback.service", () => ({
  submitFeedback: jest.fn(),
  getFeedbackList: jest.fn(),
  getFeedbackStats: jest.fn(),
}))
jest.mock("@/services/audit/audit.service", () => ({ logAuditEvent: jest.fn() }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useFeedback hooks", () => {
  beforeEach(() => jest.clearAllMocks())

  it("useSubmitFeedback calls submitFeedback", async () => {
    (submitFeedback as jest.Mock).mockResolvedValueOnce({ data: { feedback_id: "fb1" } })
    const { result } = renderHook(() => useSubmitFeedback(), { wrapper })
    act(() => {
      result.current.mutate({
        coach_id: "c1",
        message_id: "m1",
        conversation_id: "conv1",
        rating: 5,
      } as never)
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(submitFeedback).toHaveBeenCalled()
  })

  it("useFeedbackList fetches list", async () => {
    (getFeedbackList as jest.Mock).mockResolvedValueOnce({ data: { items: [], total: 0 } })
    const { result } = renderHook(() => useFeedbackList({}), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getFeedbackList).toHaveBeenCalledWith({})
  })

  it("useFeedbackStats fetches stats", async () => {
    (getFeedbackStats as jest.Mock).mockResolvedValueOnce({ data: { avg_rating: 4.5 } })
    const { result } = renderHook(() => useFeedbackStats({}, { enabled: true }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getFeedbackStats).toHaveBeenCalledWith({})
  })
})
