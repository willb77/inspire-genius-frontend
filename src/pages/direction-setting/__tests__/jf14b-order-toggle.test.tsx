/**
 * @jest-environment jsdom
 *
 * JF-14b — Direction Setting's "Local jobs first" / "Best fit" order toggle.
 *
 * Shown only when the server marked at least one row `local` (the caller's
 * organisation has a local job set). "Local jobs first" is the default and is
 * today's request; "Best fit" asks `/fit/matches?order=fit`. The pre-selected
 * default follows the order, but a re-ordered default is never recorded as the
 * stage-7 target — only a role the person picks is.
 *
 * The default path (no toggle touched) is pinned byte-for-byte, hook arguments
 * included, by `jf14b-ds-default-golden.test.tsx`.
 */
import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { FitDetail, FitMatch } from "@/types/job-fit"
import { hasLocalJobSet } from "@/lib/job-fit/matches"

const mockUseMatches = jest.fn()
const mockUseFitDetail = jest.fn()
const mockShared = jest.fn(() => false)
const mockUseFitMatches = jest.fn()
const mockAdvance = jest.fn()
jest.mock("@/hooks/direction-setting/useMatches", () => ({
  useMatches: (...args: unknown[]) => mockUseMatches(...args),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: (...args: unknown[]) => mockUseFitDetail(...args),
}))
jest.mock("@/hooks/switches/useFitSharedDisplayEnabled", () => ({
  useFitSharedDisplayEnabled: () => mockShared(),
}))
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  FIT_MATCHES_STALE_MS: 5 * 60_000,
  useFitMatches: (...args: unknown[]) => mockUseFitMatches(...args),
}))
jest.mock("@/hooks/switches/useJobFitComponentsEnabled", () => ({
  useJobFitComponentsEnabled: () => false,
}))
jest.mock("@/hooks/job-fit/useFitComponents", () => ({
  useFitComponents: () => ({ data: undefined, isError: false }),
}))
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  // DS-7: the page reads the journey; nothing saved at stage 7 here.
  useJourney: () => ({ data: { artefactKeys: [] }, isLoading: false, isError: false }),
  useAdvanceJourney: () => ({ mutate: mockAdvance, isPending: false }),
}))

import MatchesPage from "../MatchesPage"

function match(jobId: string, roleTitle: string, fitScore: number, extra: Partial<FitMatch> = {}): FitMatch {
  return {
    jobId,
    roleTitle,
    department: null,
    tier: "potential-fit",
    baseTier: "potential-fit",
    fitBand: "Good",
    totalVariation: 100 - fitScore,
    behaviorVariation: 10,
    aptitudeVariation: 15,
    coreTraitVariation: 15,
    confidence: null,
    fitScore,
    method: "gap",
    ...extra,
  } as FitMatch
}

const NURSE = match("n1", "Registered Nurse", 84, { jobSet: "national" })
const FORKLIFT = match("a1", "Forklift Operator", 79, { jobSet: "local" })
const ELECTRICIAN = match("n2", "Electrician", 71, { jobSet: "national" })
/** What the server sends by default to a caller with a job set: local first. */
const LOCAL_FIRST = [FORKLIFT, NURSE, ELECTRICIAN]
/** What it sends for ?order=fit: the pure fit order, labels kept. */
const BEST_FIT = [NURSE, FORKLIFT, ELECTRICIAN]

const detailFor = (jobId?: string): FitDetail | undefined =>
  jobId
    ? ({
        jobId,
        roleTitle: jobId,
        tier: "potential-fit",
        baseTier: "potential-fit",
        totalVariation: 20,
        fitScore: 80,
        perDimension: [],
        criticalGaps: [],
        coachingGaps: [],
        overdoneFlags: [],
        interviewSelfAdvocacy: [],
        methodologyNote: "Compared with the role's published benchmark.",
      } as unknown as FitDetail)
    : undefined

const ok = (rows: FitMatch[], gated = false) => ({
  data: { matches: rows, gated },
  isLoading: false,
  isError: false,
})

/** The DS hook, answering by its arguments the way the server would. */
function serveDs(byOrder: { local: FitMatch[]; fit: FitMatch[] }, gated = false) {
  mockUseMatches.mockImplementation((_method: string, _opts?: unknown, order?: string) =>
    ok(order === "fit" ? byOrder.fit : byOrder.local, gated),
  )
}

/** Career Fit's hook (fit_shared_display on), answering by its arguments. */
function serveShared(byOrder: { local: FitMatch[]; fit: FitMatch[] }) {
  mockShared.mockReturnValue(true)
  mockUseMatches.mockReturnValue({ data: undefined, isLoading: false, isError: false })
  mockUseFitMatches.mockImplementation((_method: string, _opts?: unknown, order?: string) => ({
    data: order === "fit" ? byOrder.fit : byOrder.local,
    gated: false,
    isLoading: false,
    isError: false,
  }))
}

const page = () =>
  render(
    <MemoryRouter>
      <MatchesPage />
    </MemoryRouter>,
  )

const toggle = () => screen.queryByRole("radiogroup", { name: "Which jobs come first" })
const stage7 = () =>
  mockAdvance.mock.calls
    .filter((c) => c[0]?.stageId === "7")
    .map((c) => (c[0].artefact.targetRole as FitMatch).jobId)
const lastDetailId = () => mockUseFitDetail.mock.calls.at(-1)?.[0]

beforeEach(() => {
  jest.clearAllMocks()
  mockShared.mockReturnValue(false)
  mockUseFitMatches.mockReturnValue({ data: undefined, gated: false, isLoading: false, isError: false })
  mockUseFitDetail.mockImplementation((jobId?: string) => ({
    data: detailFor(jobId),
    isLoading: false,
    isError: false,
  }))
})

describe("hasLocalJobSet", () => {
  test("true only when a row is local", () => {
    expect(hasLocalJobSet(undefined)).toBe(false)
    expect(hasLocalJobSet([])).toBe(false)
    expect(hasLocalJobSet([match("x", "X", 50)])).toBe(false)
    expect(hasLocalJobSet([NURSE, ELECTRICIAN])).toBe(false)
    expect(hasLocalJobSet([NURSE, FORKLIFT])).toBe(true)
  })
})

describe("JF-14b: when the toggle is offered", () => {
  test("not without a job set (rows carry no jobSet)", () => {
    const plain = [match("n1", "Registered Nurse", 84), match("a1", "Forklift Operator", 79)]
    serveDs({ local: plain, fit: plain })
    page()
    expect(toggle()).toBeNull()
    expect(screen.queryByRole("radio", { name: /local jobs first/i })).toBeNull()
  })

  test("not when every row is national (both orders are the same list)", () => {
    serveDs({ local: [NURSE, ELECTRICIAN], fit: [NURSE, ELECTRICIAN] })
    page()
    expect(toggle()).toBeNull()
  })

  test("not while matching is on hold", () => {
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT }, true)
    page()
    expect(toggle()).toBeNull()
  })

  test("yes with a local role, defaulting to Local jobs first", () => {
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    expect(toggle()).not.toBeNull()
    expect(screen.getByRole("radio", { name: /local jobs first/i })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("radio", { name: /best fit/i })).toHaveAttribute("aria-checked", "false")
    // the default request is today's: no order argument at all
    expect(mockUseMatches.mock.calls.every((c) => c.length === 1 && c[0] === "gap")).toBe(true)
    expect(lastDetailId()).toBe("a1")
    expect(stage7()).toEqual(["a1"])
  })
})

describe("JF-14b: switching the order", () => {
  test("Best fit re-reads with order=fit and the default follows the new first row", () => {
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    expect(mockUseMatches).toHaveBeenLastCalledWith("gap", undefined, "fit")
    expect(screen.getByRole("radio", { name: /best fit/i })).toHaveAttribute("aria-checked", "true")
    expect(lastDetailId()).toBe("n1")
    // the rows still say which set they are from
    expect(document.querySelectorAll('[data-job-set="local"]')).toHaveLength(1)
  })

  test("the method still applies under Best fit", () => {
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    fireEvent.click(screen.getByRole("radio", { name: /best overall match/i }))
    expect(mockUseMatches).toHaveBeenLastCalledWith("closeness", undefined, "fit")
  })

  test("a re-ordered default is not recorded as the target", () => {
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    expect(stage7()).toEqual(["a1"])
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    expect(lastDetailId()).toBe("n1")
    expect(stage7()).toEqual(["a1"])
    fireEvent.click(screen.getByRole("radio", { name: /local jobs first/i }))
    expect(mockUseMatches).toHaveBeenLastCalledWith("gap")
    expect(stage7()).toEqual(["a1"])
  })

  test("a role the person picks after switching IS recorded", () => {
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    fireEvent.click(screen.getByRole("button", { name: /electrician/i }))
    expect(stage7()).toEqual(["a1", "n2"])
  })

  test("a role the person picked stays picked when the order changes", () => {
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    fireEvent.click(screen.getByRole("button", { name: /electrician/i }))
    expect(stage7()).toEqual(["a1", "n2"])
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    expect(lastDetailId()).toBe("n2")
    expect(stage7()).toEqual(["a1", "n2"])
  })

  test("clicking the order already chosen changes nothing", () => {
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    fireEvent.click(screen.getByRole("radio", { name: /local jobs first/i }))
    expect(mockUseMatches.mock.calls.every((c) => c.length === 1)).toBe(true)
    expect(stage7()).toEqual(["a1"])
  })

  test("…so a refetch that moves the first row still records it, as it does today", () => {
    // Today, with the order never touched, a refetch that brings a new first
    // row records it (one write per role). Clicking the order that was already
    // chosen is not a change of order, so it must not switch that off.
    serveDs({ local: LOCAL_FIRST, fit: BEST_FIT })
    const { rerender } = page()
    fireEvent.click(screen.getByRole("radio", { name: /local jobs first/i }))
    serveDs({ local: [FORKLIFT, NURSE, ELECTRICIAN].reverse(), fit: BEST_FIT })
    rerender(
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>,
    )
    expect(stage7()).toEqual(["a1", "n2"])
  })
})

describe("JF-14b with fit_shared_display ON (Career Fit's hook)", () => {
  test("default is today's call; Best fit appends order to both hooks", () => {
    serveShared({ local: LOCAL_FIRST, fit: BEST_FIT })
    page()
    expect(mockUseFitMatches).toHaveBeenCalledWith("gap", { enabled: true, staleTime: 5 * 60_000 })
    expect(mockUseFitMatches.mock.calls.every((c) => c.length === 2)).toBe(true)
    expect(stage7()).toEqual(["a1"])
    fireEvent.click(screen.getByRole("radio", { name: /best fit/i }))
    expect(mockUseFitMatches).toHaveBeenLastCalledWith("gap", { enabled: true, staleTime: 5 * 60_000 }, "fit")
    expect(mockUseMatches).toHaveBeenLastCalledWith("gap", { enabled: false }, "fit")
    expect(lastDetailId()).toBe("n1")
    expect(stage7()).toEqual(["a1"])
  })
})

/* ── The hooks and the service: only "fit" changes the request or the key ── */

describe("JF-14b hooks", () => {
  const actualSvc = jest.requireActual("@/services/job-fit/fit.service") as {
    fitService: { getMatches: (...a: unknown[]) => unknown }
  }

  function wrap() {
    // staleTime Infinity: a second mount of the same key must not refetch, so a
    // second call can only mean a second key.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    return { qc, wrapper }
  }

  test.each([
    ["@/hooks/direction-setting/useMatches", "useMatches", ["direction-setting", "matches"]],
    ["@/hooks/job-fit/useFitMatches", "useFitMatches", ["job-fit", "matches"]],
  ] as const)("%s: default key and call are today's; fit gets its own", async (mod, name, prefix) => {
    const hook = (jest.requireActual(mod) as Record<string, (...a: unknown[]) => { isSuccess: boolean }>)[name]
    const spy = jest
      .spyOn(actualSvc.fitService, "getMatches")
      .mockResolvedValue({ data: { data: [FORKLIFT], gated: false } } as never)
    const { qc, wrapper } = wrap()
    const a = renderHook(() => hook("gap"), { wrapper })
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true))
    const b = renderHook(() => hook("gap", undefined, "local"), { wrapper })
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true))
    const c = renderHook(() => hook("gap", undefined, "fit"), { wrapper })
    await waitFor(() => expect(c.result.current.isSuccess).toBe(true))
    // strict: the default call must not even carry an undefined second argument
    expect(spy.mock.calls).toStrictEqual([["gap"], ["gap", "fit"]])
    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey)
    expect(keys).toEqual([[...prefix, "gap"], [...prefix, "gap", "fit"]])
    spy.mockRestore()
  })
})
