/**
 * @jest-environment jsdom
 *
 * JS-5 — the hook turns a drafted target into the self-fit request body and
 * treats "no PRISM on file" (404) as a state rather than a toast-worthy error.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))
const mockScoreTarget = jest.fn()
jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: { scoreTarget: (...a: unknown[]) => mockScoreTarget(...a) },
}))

import { isNoPrismError, useScoreTarget } from "../useScoreTarget"
import type { TargetDraft } from "@/types/targets"

const DRAFT: TargetDraft = {
  behaviors: [
    { dimensionId: 1, dimensionName: "Innovating", category: "behavior", target: 72, confidence: 0.8, evidence: "x", provenance: "measured", interpretation: "very-high" },
  ],
  aptitudes: [
    { dimensionId: 2, dimensionName: "Investigative", category: "aptitude", target: 60, confidence: 0.3, evidence: "y", provenance: "imputed", interpretation: "moderate" },
  ],
  coreTraits: [],
  measuredCount: 1,
  imputedCount: 1,
  meanConfidence: 0.55,
  provider: "stub",
  draft: true,
  warnings: [],
  methodologyNote: "n",
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  mockScoreTarget.mockReset()
  ;(toast.error as jest.Mock).mockReset()
})

test("sends every drafted dimension as a benchmark row, imputed ones included", async () => {
  mockScoreTarget.mockResolvedValueOnce({ data: { data: { jobId: "", perDimension: [] } } })
  const { result } = renderHook(() => useScoreTarget(), { wrapper })
  result.current.mutate({ draft: DRAFT, roleTitle: "Ops lead" })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(mockScoreTarget).toHaveBeenCalledWith({
    target: [
      { category: "behavior", dimensionId: 1, dimensionName: "Innovating", finalBenchmarkPercent: 72, interpretation: "very-high" },
      { category: "aptitude", dimensionId: 2, dimensionName: "Investigative", finalBenchmarkPercent: 60, interpretation: "moderate" },
    ],
    roleTitle: "Ops lead",
  })
})

test("gap is the backend default and is not sent; closeness is", async () => {
  mockScoreTarget.mockResolvedValue({ data: { data: { jobId: "" } } })
  const { result } = renderHook(() => useScoreTarget(), { wrapper })
  result.current.mutate({ draft: DRAFT, method: "gap" })
  await waitFor(() => expect(mockScoreTarget).toHaveBeenCalledTimes(1))
  expect(mockScoreTarget.mock.calls[0][0]).not.toHaveProperty("method")
  result.current.mutate({ draft: DRAFT, method: "closeness" })
  await waitFor(() => expect(mockScoreTarget).toHaveBeenCalledTimes(2))
  expect(mockScoreTarget.mock.calls[1][0]).toMatchObject({ method: "closeness" })
})

test("a 404 is the no-PRISM state — no toast", async () => {
  const err = { response: { status: 404 }, isAxiosError: true } as unknown as AxiosError
  mockScoreTarget.mockRejectedValueOnce(err)
  const { result } = renderHook(() => useScoreTarget(), { wrapper })
  result.current.mutate({ draft: DRAFT })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(isNoPrismError(result.current.error)).toBe(true)
  expect(toast.error).not.toHaveBeenCalled()
})

test("any other failure toasts", async () => {
  const err = { response: { status: 500 }, isAxiosError: true } as unknown as AxiosError
  mockScoreTarget.mockRejectedValueOnce(err)
  const { result } = renderHook(() => useScoreTarget(), { wrapper })
  result.current.mutate({ draft: DRAFT })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(isNoPrismError(result.current.error)).toBe(false)
  expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/couldn't score your fit/i))
})

test("an empty envelope is an error, not a silent success", async () => {
  mockScoreTarget.mockResolvedValueOnce({ data: { data: null } })
  const { result } = renderHook(() => useScoreTarget(), { wrapper })
  result.current.mutate({ draft: DRAFT })
  await waitFor(() => expect(result.current.isError).toBe(true))
})
