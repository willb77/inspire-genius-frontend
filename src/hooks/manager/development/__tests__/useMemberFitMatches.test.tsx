/**
 * 3.3a — the fit-engine matches hook.
 *
 *  - off (the flag's default) it never calls the server: a tier whose
 *    growth-service has no /fit-matches route is never asked;
 *  - an envelope without a `state` is `unavailable`, never an empty list that
 *    would read as "no matches".
 */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"

const getMemberFitMatches = jest.fn()

jest.mock("@/services/manager/development/growthService", () => ({
  getMemberFitMatches: (id: string) => getMemberFitMatches(id),
}))

import { useMemberFitMatches } from "../useMemberFitMatches"

let client: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

it("does not call the server when disabled", async () => {
  const { result } = renderHook(() => useMemberFitMatches("m1", false), { wrapper })
  await new Promise((r) => setTimeout(r, 10))
  expect(getMemberFitMatches).not.toHaveBeenCalled()
  expect(result.current.data).toBeUndefined()
})

it("does not call the server without a member id", async () => {
  renderHook(() => useMemberFitMatches(undefined, true), { wrapper })
  await new Promise((r) => setTimeout(r, 10))
  expect(getMemberFitMatches).not.toHaveBeenCalled()
})

it("returns the server's block when enabled", async () => {
  const block = {
    state: "ok", matches: [{ rank: 1, roleTitle: "R", jobId: "j", fitScore: 70 }],
    asOf: "2026-10-01T00:00:00Z", ageDays: 5,
  }
  getMemberFitMatches.mockResolvedValue({ data: { status: true, data: block } })
  const { result } = renderHook(() => useMemberFitMatches("m1", true), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(getMemberFitMatches).toHaveBeenCalledWith("m1")
  expect(result.current.data).toEqual(block)
})

it.each([
  ["no data", { data: {} }],
  ["no state", { data: { data: { matches: [] } } }],
])("%s reads as unavailable", async (_label, response) => {
  getMemberFitMatches.mockResolvedValue(response)
  const { result } = renderHook(() => useMemberFitMatches("m1", true), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual({ state: "unavailable", matches: [], asOf: null, ageDays: null })
})

it("a state without a matches array still yields an array", async () => {
  getMemberFitMatches.mockResolvedValue({ data: { data: { state: "no_snapshot", asOf: null, ageDays: null } } })
  const { result } = renderHook(() => useMemberFitMatches("m1", true), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.matches).toEqual([])
})
