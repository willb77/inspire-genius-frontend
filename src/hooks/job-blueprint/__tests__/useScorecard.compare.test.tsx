/**
 * @jest-environment jsdom
 *
 * JS-4 — the comparison hook and the 404-is-a-state rule on scorecard reads.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const getScorecard = jest.fn()
jest.mock("@/services/job-blueprint", () => ({
  scorecardService: { getScorecard: (...a: unknown[]) => getScorecard(...a) },
}))

import { useScorecardsFor, useScorecardDetail, isNoScorecardError } from "../useScorecard"

const notFound = { isAxiosError: true, response: { status: 404 } }
const boom = { isAxiosError: true, response: { status: 500 } }
const card = (id: string, total: number) => ({ id: `sc-${id}`, candidateId: id, grandTotal: total, recommendation: "good-alignment" })

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => getScorecard.mockReset())

test("isNoScorecardError recognises only a 404", () => {
  expect(isNoScorecardError(notFound)).toBe(true)
  expect(isNoScorecardError(boom)).toBe(false)
  expect(isNoScorecardError(undefined)).toBe(false)
})

test("useScorecardsFor returns the cards that exist and lists the ones the server has none for", async () => {
  getScorecard.mockImplementation((id: string) =>
    id === "c2" ? Promise.reject(notFound) : Promise.resolve({ data: { data: card(id, id === "c1" ? 48 : 30) } })
  )
  const { result } = renderHook(() => useScorecardsFor(["c1", "c2", "c3"]), { wrapper })
  await waitFor(() => expect(result.current.pending).toBe(false))
  expect(result.current.scorecards.map((s) => s.candidateId)).toEqual(["c1", "c3"])
  expect(result.current.missing).toEqual(["c2"])
  expect(result.current.failed).toBe(false)
  // a 404 is not retried — one call per candidate
  expect(getScorecard).toHaveBeenCalledTimes(3)
})

test("a non-404 failure is reported as failed, not as missing", async () => {
  getScorecard.mockImplementation((id: string) =>
    id === "c2" ? Promise.reject(boom) : Promise.resolve({ data: { data: card(id, 40) } })
  )
  const { result } = renderHook(() => useScorecardsFor(["c1", "c2"]), { wrapper })
  await waitFor(() => expect(result.current.pending).toBe(false), { timeout: 4000 })
  expect(result.current.failed).toBe(true)
  expect(result.current.missing).toEqual([])
  expect(result.current.scorecards).toHaveLength(1)
})

test("an empty selection reads nothing", () => {
  const { result } = renderHook(() => useScorecardsFor([]), { wrapper })
  expect(result.current.pending).toBe(false)
  expect(result.current.scorecards).toEqual([])
  expect(getScorecard).not.toHaveBeenCalled()
})

test("useScorecardDetail does not retry a 404", async () => {
  getScorecard.mockRejectedValue(notFound)
  const { result } = renderHook(() => useScorecardDetail("c9"), { wrapper })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(getScorecard).toHaveBeenCalledTimes(1)
  expect(isNoScorecardError(result.current.error)).toBe(true)
})
