/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockGetReviewQueue = jest.fn()
jest.mock("@/services/knowledge-continuity/continuity.service", () => ({
  getReviewQueue: (...a: unknown[]) => mockGetReviewQueue(...a),
}))

import { useReviewQueue } from "../useReviewQueue"
import type { ReviewQueue } from "@/types/knowledge-continuity"

const QUEUE: ReviewQueue = {
  needs_review_units: [
    {
      id: "unit-1",
      session_id: "session-1",
      taxonomy_node_id: null,
      category: "process",
      title: "Shutdown sequence",
      body: "Detailed shutdown steps for the line.",
      structured: null,
      document_id: null,
      criticality: "high",
      kvi: 0.62,
      validity_band: "needs_review",
      kvi_features: null,
      captured_at: "2026-07-01T00:00:00Z",
    },
  ],
  unresolved_contradictions: [
    {
      id: "contradiction-1",
      from_unit_id: "unit-1",
      to_unit_id: "unit-2",
      relation_type: "conflicting_procedure",
      resolved: false,
    },
  ],
}

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe("useReviewQueue", () => {
  test("reads the review queue from the service and unwraps the envelope", async () => {
    mockGetReviewQueue.mockResolvedValue({ status: true, data: QUEUE })
    const { result } = renderHook(() => useReviewQueue(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(QUEUE)
    expect(mockGetReviewQueue).toHaveBeenCalledWith(undefined)
  })

  test("passes the org id through to the service", async () => {
    mockGetReviewQueue.mockResolvedValue({ status: true, data: QUEUE })
    const { result } = renderHook(() => useReviewQueue("org-1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetReviewQueue).toHaveBeenCalledWith("org-1")
  })

  test("falls back to an empty queue when the envelope has no data", async () => {
    mockGetReviewQueue.mockResolvedValue({ status: true, data: undefined })
    const { result } = renderHook(() => useReviewQueue(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ needs_review_units: [], unresolved_contradictions: [] })
  })
})
