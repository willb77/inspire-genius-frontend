/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

const mockGetEnabledVerticals = jest.fn()
jest.mock("@/verticals/core/entitlements.service", () => ({
  getEnabledVerticals: () => mockGetEnabledVerticals(),
}))

import { useEnabledVerticals } from "../useEnabledVerticals"

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("useEnabledVerticals", () => {
  beforeEach(() => jest.clearAllMocks())

  test("returns the real server entitlement list", async () => {
    mockGetEnabledVerticals.mockResolvedValue({
      status: true,
      data: { enabled_verticals: ["grant"] },
    })
    const { result } = renderHook(() => useEnabledVerticals(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(["grant"])
  })

  test("resolves to a closed gate ([]) on error", async () => {
    mockGetEnabledVerticals.mockRejectedValue(new Error("404"))
    const { result } = renderHook(() => useEnabledVerticals(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  test("empty when the payload omits enabled_verticals", async () => {
    mockGetEnabledVerticals.mockResolvedValue({ status: true, data: {} })
    const { result } = renderHook(() => useEnabledVerticals(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
