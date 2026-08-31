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

// Mutable auth mock so tests can switch the signed-in user.
let mockUser: { id: string } | null = { id: "user-1" }
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }))

import { useEnabledVerticals } from "../useEnabledVerticals"

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("useEnabledVerticals", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUser = { id: "user-1" }
  })

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

  test("scopes the cache to the signed-in user — no cross-account bleed", async () => {
    // Share ONE QueryClient across both renders, like a real browser session.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const sharedWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    // User A resolves to just grant.
    mockUser = { id: "userA" }
    mockGetEnabledVerticals.mockResolvedValue({ status: true, data: { enabled_verticals: ["grant"] } })
    const a = renderHook(() => useEnabledVerticals(), { wrapper: sharedWrapper })
    await waitFor(() => expect(a.result.current.data).toEqual(["grant"]))
    expect(client.getQueryData(["verticals", "entitlements", "me", "userA"])).toEqual(["grant"])

    // Switch to user B (different entitlement). Different key → own fetch, no bleed.
    mockUser = { id: "userB" }
    mockGetEnabledVerticals.mockResolvedValue({
      status: true,
      data: { enabled_verticals: ["grant", "knowledge-continuity"] },
    })
    const b = renderHook(() => useEnabledVerticals(), { wrapper: sharedWrapper })
    await waitFor(() => expect(b.result.current.data).toEqual(["grant", "knowledge-continuity"]))
    expect(client.getQueryData(["verticals", "entitlements", "me", "userB"])).toEqual([
      "grant",
      "knowledge-continuity",
    ])
    // A's cached entry is untouched and separate.
    expect(client.getQueryData(["verticals", "entitlements", "me", "userA"])).toEqual(["grant"])
  })

  test("uses 'anon' in the key when logged out", async () => {
    mockUser = null
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const w = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    mockGetEnabledVerticals.mockResolvedValue({ status: true, data: { enabled_verticals: [] } })
    const { result } = renderHook(() => useEnabledVerticals(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(["verticals", "entitlements", "me", "anon"])).toEqual([])
  })
})
