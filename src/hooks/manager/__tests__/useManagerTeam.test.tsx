/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useManagerTeam, useManagerHiringStats, useManagerInterviews, useManagerTraining } from "../useManagerTeam"

jest.mock("@/services/manager/manager.service", () => ({
  getManagerTeam: jest.fn().mockResolvedValue({ data: { data: { members: [], total: 0 } } }),
  getManagerHiringStats: jest.fn().mockResolvedValue({ data: { data: { openPositions: 3 } } }),
  getManagerInterviews: jest.fn().mockResolvedValue({ data: { data: { interviews: [] } } }),
  getManagerCandidates: jest.fn().mockResolvedValue({ data: { data: { candidates: [] } } }),
  getManagerInterviewSchedule: jest.fn().mockResolvedValue({ data: { data: { interviews: [] } } }),
  getManagerTraining: jest.fn().mockResolvedValue({ data: { data: { programs: [] } } }),
  getManagerCareerPaths: jest.fn().mockResolvedValue({ data: { data: { paths: [] } } }),
  getManagerTeamComposition: jest.fn().mockResolvedValue({ data: { data: { members: [] } } }),
  getManagerLeadership: jest.fn().mockResolvedValue({ data: { data: { leaders: [] } } }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useManagerTeam hooks", () => {
  it("useManagerTeam fetches team", async () => {
    const { result } = renderHook(() => useManagerTeam(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ members: [], total: 0 })
  })

  it("useManagerHiringStats fetches stats", async () => {
    const { result } = renderHook(() => useManagerHiringStats(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ openPositions: 3 })
  })

  it("useManagerInterviews fetches interviews", async () => {
    const { result } = renderHook(() => useManagerInterviews(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useManagerTraining fetches training", async () => {
    const { result } = renderHook(() => useManagerTraining(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
