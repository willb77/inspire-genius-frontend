/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import {
  useUserAnalytics,
  useManagerAnalytics,
  useCompanyAnalytics,
  usePractitionerAnalytics,
  useDistributorAnalytics,
  usePlatformAnalytics,
} from "../useAnalytics"

jest.mock("@/services/analytics/analytics.service", () => ({
  getUserAnalytics: jest.fn().mockResolvedValue({ data: { data: { sessions: 10 } } }),
  getManagerAnalytics: jest.fn().mockResolvedValue({ data: { data: { reports: 5 } } }),
  getCompanyAnalytics: jest.fn().mockResolvedValue({
    data: { data: { totalUsers: 247, activeUsers: 192, avgPrismScore: 82, trainingCompletion: 78 } },
  }),
  getPractitionerAnalytics: jest.fn().mockResolvedValue({ data: { data: { clients: 24 } } }),
  getDistributorAnalytics: jest.fn().mockResolvedValue({ data: { data: { regions: 3 } } }),
  getPlatformAnalytics: jest.fn().mockResolvedValue({ data: { data: { totalUsers: 100 } } }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useAnalytics hooks", () => {
  it("useUserAnalytics fetches user analytics", async () => {
    const { result } = renderHook(() => useUserAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ sessions: 10 })
  })

  it("useManagerAnalytics fetches manager analytics", async () => {
    const { result } = renderHook(() => useManagerAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ reports: 5 })
  })

  it("useCompanyAnalytics fetches company analytics (canonical)", async () => {
    const { result } = renderHook(() => useCompanyAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      totalUsers: 247,
      activeUsers: 192,
      avgPrismScore: 82,
      trainingCompletion: 78,
    })
  })

  it("usePractitionerAnalytics fetches practitioner analytics", async () => {
    const { result } = renderHook(() => usePractitionerAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ clients: 24 })
  })

  it("useDistributorAnalytics fetches distributor analytics", async () => {
    const { result } = renderHook(() => useDistributorAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ regions: 3 })
  })

  it("usePlatformAnalytics fetches platform analytics", async () => {
    const { result } = renderHook(() => usePlatformAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ totalUsers: 100 })
  })
})
