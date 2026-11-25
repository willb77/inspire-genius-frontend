/**
 * @jest-environment jsdom
 *
 * NP3 — the two readers of the server's reasons, and `useFitDetail`'s retry.
 */
import type { ReactNode } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { normalizeMatches, type MatchesEnvelope } from "../matches"
import { fitDetailErrorCode, isClientError, retryUnlessClientError } from "../fitDetailError"
import type { FitMatch } from "@/types/job-fit"

const mockGetDetail = jest.fn()
jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: { getDetail: (...a: unknown[]) => mockGetDetail(...a) },
}))
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"

const ROW = { jobId: "j1", roleTitle: "R" } as FitMatch
const http = (status: number, data?: unknown) => ({ isAxiosError: true, response: { status, data } })

describe("normalizeMatches — emptyReason", () => {
  test("passes no_prism through on an empty list", () => {
    expect(normalizeMatches({ data: [], gated: false, emptyReason: "no_prism" })).toEqual({
      matches: [], gated: false, emptyReason: "no_prism",
    })
  })

  test.each([
    ["absent (older server)", { data: [], gated: false }],
    ["null", { data: [], emptyReason: null }],
    ["an unknown value", { data: [], emptyReason: "no_roles" }],
    ["a non-string", { data: [], emptyReason: 1 }],
  ])("%s reads null", (_n, body) => {
    expect(normalizeMatches(body as MatchesEnvelope).emptyReason).toBeNull()
  })

  test("a non-empty list never carries a reason, even if one is sent", () => {
    expect(normalizeMatches({ data: [ROW], emptyReason: "no_prism" }).emptyReason).toBeNull()
  })

  test("the wrapped shape carries it too", () => {
    expect(
      normalizeMatches({ data: { matches: [], gated: false, emptyReason: "no_prism" } }).emptyReason
    ).toBe("no_prism")
  })

  test("an undefined body degrades to no rows, not gated, no reason", () => {
    expect(normalizeMatches(undefined)).toEqual({ matches: [], gated: false, emptyReason: null })
  })
})

describe("fitDetailErrorCode", () => {
  test.each([
    [http(404, { detail: { code: "no_prism", message: "m" } }), "no_prism"],
    [http(404, { detail: { code: "not_found", message: "m" } }), "not_found"],
    [http(404, { detail: "Blueprint not found, not published, or no PRISM assessment on file" }), null],
    [http(404, { detail: { code: "other" } }), null],
    [http(404), null],
    [http(500, { detail: { code: "no_prism" } }), null],
    [http(403, { detail: { code: "not_found" } }), null],
    [new Error("Network Error"), null],
    [null, null],
  ])("%#", (error, want) => {
    expect(fitDetailErrorCode(error)).toBe(want)
  })
})

describe("retry", () => {
  test("never retries a 4xx, whatever the client default", () => {
    for (const fallback of [2, true, undefined, () => true] as const) {
      for (const s of [400, 403, 404, 422, 429]) {
        expect(isClientError(http(s))).toBe(true)
        expect(retryUnlessClientError(fallback)(0, http(s))).toBe(false)
      }
    }
  })

  test("anything else follows the client default exactly", () => {
    // The app's `retry: 2`.
    expect(retryUnlessClientError(2)(0, http(500))).toBe(true)
    expect(retryUnlessClientError(2)(1, http(503))).toBe(true)
    expect(retryUnlessClientError(2)(2, http(500))).toBe(false)
    expect(retryUnlessClientError(2)(0, new Error("Network Error"))).toBe(true)
    // A test client's `retry: false`, and `true` (React Query: no limit).
    expect(retryUnlessClientError(false)(0, http(500))).toBe(false)
    expect(retryUnlessClientError(true)(9, http(500))).toBe(true)
    // No default: React Query's own three.
    expect(retryUnlessClientError(undefined)(2, http(500))).toBe(true)
    expect(retryUnlessClientError(undefined)(3, http(500))).toBe(false)
    // A function default is consulted.
    const fn = jest.fn(() => false)
    expect(retryUnlessClientError(fn)(1, http(500))).toBe(false)
    expect(fn).toHaveBeenCalledWith(1, http(500))
  })

  test("useFitDetail calls a 404 exactly once, even on a client that retries", async () => {
    mockGetDetail.mockRejectedValue(http(404, { detail: { code: "no_prism", message: "m" } }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: 2, retryDelay: 1 } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useFitDetail("j1"), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockGetDetail).toHaveBeenCalledTimes(1)
    expect(fitDetailErrorCode(result.current.error)).toBe("no_prism")
  })

  test("useFitDetail still retries a 500 on the app's default", async () => {
    mockGetDetail.mockReset()
    mockGetDetail.mockRejectedValue(http(500))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: 2, retryDelay: 1 } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useFitDetail("j1"), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockGetDetail).toHaveBeenCalledTimes(3)
  })
})
