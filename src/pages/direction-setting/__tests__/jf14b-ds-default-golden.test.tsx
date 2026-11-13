/**
 * @jest-environment jsdom
 *
 * JF-14b — Direction Setting's stage 7 with NO order chosen is today's page.
 *
 * The goldens under `__golden_jf14b__/` were recorded on the base sha, before any
 * JF-14b source change, with `JF14B_GOLDEN_WRITE=1`. Each holds the page's HTML
 * plus the exact arguments the page passed to its matches hooks and the job id
 * it recorded as the stage-7 target — under `fit_shared_display` off and on, for
 * rows without `jobSet` (no local job set: every org today), rows that are all
 * `national` (an org listed for a job set that owns no ranked role) and rows with
 * a `local` first (JF-14's local-first order).
 *
 * The first two must stay byte-identical. The third gains exactly one thing on
 * the branch — the order toggle, marked `data-jf14b-order-toggle` — so it is
 * compared with that element removed; everything else, including the hook
 * arguments and the recorded target, must be identical.
 *
 * To re-record (only ever on the base, before a source change):
 *   JF14B_GOLDEN_WRITE=1 npx jest src/pages/direction-setting/__tests__/jf14b-ds-default-golden.test.tsx
 */
import fs from "fs"
import path from "path"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { FitDetail, FitMatch } from "@/types/job-fit"

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
  useAdvanceJourney: () => ({ mutate: mockAdvance, isPending: false }),
}))

import MatchesPage from "../MatchesPage"

const GOLDEN_DIR = path.join(__dirname, "__golden_jf14b__")
const WRITE = process.env.JF14B_GOLDEN_WRITE === "1"
/** The one element JF-14b adds, and only when a local role is in the list. */
const ORDER_TOGGLE_SELECTOR = "[data-jf14b-order-toggle]"

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

const NO_SET: FitMatch[] = [
  match("n1", "Registered Nurse", 84),
  match("a1", "Forklift Operator", 79),
  match("n2", "Electrician", 71),
]
const ALL_NATIONAL: FitMatch[] = NO_SET.map((m) => ({ ...m, jobSet: "national" }))
const LOCAL_FIRST: FitMatch[] = [
  { ...NO_SET[1], jobSet: "local" },
  { ...NO_SET[0], jobSet: "national" },
  { ...NO_SET[2], jobSet: "national" },
]

function detailFor(m: FitMatch): FitDetail {
  return {
    jobId: m.jobId,
    roleTitle: m.roleTitle,
    tier: "potential-fit",
    baseTier: "potential-fit",
    totalVariation: m.totalVariation,
    fitScore: m.fitScore,
    perDimension: [],
    criticalGaps: [],
    coachingGaps: [],
    overdoneFlags: [],
    interviewSelfAdvocacy: [],
    methodologyNote: "Compared with the role's published benchmark.",
  } as unknown as FitDetail
}

const CASES: Record<string, FitMatch[]> = {
  "no-set": NO_SET,
  "all-national": ALL_NATIONAL,
  "local-first": LOCAL_FIRST,
}

function snapshot(shared: boolean, rows: FitMatch[]) {
  jest.clearAllMocks()
  mockShared.mockReturnValue(shared)
  const result = { data: { matches: rows, gated: false }, isLoading: false, isError: false }
  mockUseMatches.mockReturnValue(shared ? { data: undefined, isLoading: false, isError: false } : result)
  mockUseFitMatches.mockReturnValue(
    shared
      ? { data: rows, gated: false, isLoading: false, isError: false }
      : { data: undefined, gated: false, isLoading: false, isError: false },
  )
  mockUseFitDetail.mockImplementation((jobId?: string) => {
    const m = rows.find((r) => r.jobId === jobId)
    return { data: m ? detailFor(m) : undefined, isLoading: false, isError: false }
  })
  const { container, unmount } = render(
    <MemoryRouter>
      <MatchesPage />
    </MemoryRouter>,
  )
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll(ORDER_TOGGLE_SELECTOR).forEach((el) => el.remove())
  const out = {
    html: clone.innerHTML,
    useMatches: mockUseMatches.mock.calls,
    useFitMatches: mockUseFitMatches.mock.calls,
    useFitDetail: mockUseFitDetail.mock.calls,
    stage7: mockAdvance.mock.calls
      .filter((c) => c[0]?.stageId === "7")
      .map((c) => (c[0].artefact.targetRole as FitMatch).jobId),
  }
  unmount()
  return JSON.stringify(out, null, 1) + "\n"
}

describe("JF-14b: with no order chosen, stage 7 is today's page", () => {
  for (const shared of [false, true]) {
    for (const [name, rows] of Object.entries(CASES)) {
      const file = `jf14b-ds-${name}-shared-${shared ? "on" : "off"}.json`
      test(`${name}, fit_shared_display ${shared ? "on" : "off"} — ${file}`, () => {
        const got = snapshot(shared, rows)
        const target = path.join(GOLDEN_DIR, file)
        if (WRITE) {
          fs.mkdirSync(GOLDEN_DIR, { recursive: true })
          fs.writeFileSync(target, got)
          return
        }
        expect(got).toBe(fs.readFileSync(target, "utf8"))
      })
    }
  }

  test("the goldens are populated (a degenerate golden would pass vacuously)", () => {
    for (const shared of ["on", "off"]) {
      for (const name of Object.keys(CASES)) {
        const g = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, `jf14b-ds-${name}-shared-${shared}.json`), "utf8"))
        expect(g.html).toContain("Registered Nurse")
        expect(g.html).toContain("Forklift Operator")
        expect(g.stage7).toEqual([CASES[name][0].jobId])
        expect(g.useMatches.length).toBeGreaterThan(0)
      }
    }
  })
})
