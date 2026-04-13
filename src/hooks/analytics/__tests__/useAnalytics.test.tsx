/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useUserAnalytics, useManagerAnalytics, usePlatformAnalytics } from "../useAnalytics"

jest.mock("@/services/analytics/analytics.service", () => ({
  getUserAnalytics: jest.fn().mockResolvedValue({ data: { data: { sessions: 10 } } }),
  getManagerAnalytics: jest.fn().mockResolvedValue({ data: { data: { reports: 5 } } }),
  getCompanyAnalytics: jest.fn().mockResolvedValue({ data: { data: {} } }),
  getPractitionerAnalytics: jest.fn().mockResolvedValue({ data: { data: {} } }),
  getDistributorAnalytics: jest.fn().mockResolvedValue({ data: { data: {} } }),
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

  it("usePlatformAnalytics fetches platform analytics", async () => {
    const { result } = renderHook(() => usePlatformAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ totalUsers: 100 })
  })
})
