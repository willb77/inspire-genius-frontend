/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CurriculumSummary } from "@/types/knowledge-continuity"

const mockGetCurricula = jest.fn()
jest.mock("@/services/knowledge-continuity/continuity.service", () => ({
  getCurricula: (...a: unknown[]) => mockGetCurricula(...a),
}))

import { useCurricula } from "../useCurricula"

const CURRICULA: CurriculumSummary[] = [
  {
    template_id: "tmpl-1",
    name: "Line Lead handover",
    wiring_style: "sequential",
    taxonomy_id: "tax-1",
    session_id: "session-1",
    module_count: 3,
    cited_unit_count: 12,
    published_by: "reviewer@example.com",
    created_at: "2026-07-01T00:00:00Z",
  },
]

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe("useCurricula", () => {
  test("reads the curricula list and unwraps the envelope", async () => {
    mockGetCurricula.mockResolvedValue({ status: true, data: CURRICULA })
    const { result } = renderHook(() => useCurricula(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(CURRICULA)
    expect(mockGetCurricula).toHaveBeenCalledWith(undefined)
  })

  test("passes the taxonomy id through to the service", async () => {
    mockGetCurricula.mockResolvedValue({ status: true, data: CURRICULA })
    const { result } = renderHook(() => useCurricula("tax-1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetCurricula).toHaveBeenCalledWith("tax-1")
  })

  test("falls back to an empty list when the envelope has no data", async () => {
    mockGetCurricula.mockResolvedValue({ status: true, data: undefined })
    const { result } = renderHook(() => useCurricula(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
