/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useDistributorPractitioners, useDistributorCredits, useDistributorTransactions, useDistributorTerritory } from "../useDistributor"

jest.mock("@/services/distributor/distributor.service", () => ({
  getDistributorPractitioners: jest.fn().mockResolvedValue({ data: { data: { practitioners: [], total: 0 } } }),
  getDistributorCredits: jest.fn().mockResolvedValue({ data: { data: {} } }),
  getDistributorTransactions: jest.fn().mockResolvedValue({ data: { data: { transactions: [] } } }),
  getDistributorTerritory: jest.fn().mockResolvedValue({ data: { data: {} } }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useDistributor hooks", () => {
  it("useDistributorPractitioners fetches data", async () => {
    const { result } = renderHook(() => useDistributorPractitioners(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useDistributorCredits fetches data", async () => {
    const { result } = renderHook(() => useDistributorCredits(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useDistributorTransactions fetches data", async () => {
    const { result } = renderHook(() => useDistributorTransactions(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useDistributorTerritory fetches data", async () => {
    const { result } = renderHook(() => useDistributorTerritory(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
