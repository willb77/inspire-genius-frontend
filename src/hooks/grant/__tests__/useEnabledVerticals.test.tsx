/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useEnabledVerticals } from "../useEnabledVerticals"

// USE_GRANT_MOCKS is true, so the hook short-circuits to ["grant"] without
// touching the network — locks in the mock-mode entitlement.
function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("useEnabledVerticals", () => {
  test("returns ['grant'] in mock mode", async () => {
    const { result } = renderHook(() => useEnabledVerticals(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(["grant"])
  })
})
