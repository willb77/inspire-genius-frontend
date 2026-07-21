/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockGetAnalytics = jest.fn()
jest.mock("@/services/knowledge-continuity/continuity.service", () => ({
  getAnalytics: (...a: unknown[]) => mockGetAnalytics(...a),
}))

import { useContinuityAnalytics } from "../useContinuityAnalytics"
import type { ContinuityAnalytics } from "@/types/knowledge-continuity"

const ANALYTICS: ContinuityAnalytics = {
  org_id: "org-1",
  fresh_days: 90,
  validity_bands: { validated: 12, provisional: 4, needs_review: 2, deprecated: 1 },
  mean_kvi: 0.82,
  coverage: { taxonomy_nodes_total: 40, nodes_with_units: 30, units_total: 120 },
  currency: { fresh_units: 100, stale_units: 20, pct_fresh: 0.83 },
  capture_sessions: { scheduled: 5, in_progress: 2, captured: 10, synthesized: 8, validated: 6 },
  review_queue: { pending_approvals: 3, unresolved_contradictions: 1 },
  curricula: { count: 4 },
  risk_register: {
    by_priority: { urgent: 2, high: 3, medium: 5, low: 1 },
    top_at_risk: [
      { id: "r1", role_title: "Lead Welder", kri: 0.91, capture_priority: "urgent", capture_status: "not_started" },
    ],
    uncaptured_urgent: 2,
  },
}

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe("useContinuityAnalytics", () => {
  test("reads analytics from the service and unwraps the envelope", async () => {
    mockGetAnalytics.mockResolvedValue({ status: true, data: ANALYTICS })
    const { result } = renderHook(() => useContinuityAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(ANALYTICS)
    expect(mockGetAnalytics).toHaveBeenCalledWith(undefined)
  })

  test("passes the org id through to the service", async () => {
    mockGetAnalytics.mockResolvedValue({ status: true, data: ANALYTICS })
    const { result } = renderHook(() => useContinuityAnalytics("org-1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetAnalytics).toHaveBeenCalledWith("org-1")
  })
})
