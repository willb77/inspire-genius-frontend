/**
 * @jest-environment jsdom
 *
 * FIT-5b — every visible change behind `fit_shared_display` (CSA d01e9276,
 * decisions 1–9 as recommended).
 *
 * The OFF proof lives in `fit5-golden.test.tsx`: the 55 FIT-5a goldens with
 * this switch pinned false, DOM byte-identical, the request log gaining only
 * `switch.fitSharedDisplay()`. This file is the ON side, plus the two things a
 * golden cannot see: which query key Direction Setting reads (a hook rewrite
 * renders the same DOM and logs the same GET) and that an unreadable switch is
 * off (fail closed).
 *
 * Mocks sit at the same boundaries as the goldens: the services, the
 * journey-write hook and the radar chart. The fit hooks run for real.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement } from "react"
import type { FitDetail, FitMatch, FitSnapshot } from "@/types/job-fit"
import type { FitComponentsResponse } from "@/types/job-fit/components"
import type { TargetDraft } from "@/types/targets"

/* ── Boundary log ── */
const requests: string[] = []
const log = (e: string) => requests.push(e)

type SwitchAnswer = boolean | "error" | "never"
let sharedSwitch: SwitchAnswer = true
let componentsSwitch = false
let componentsAnswer: FitComponentsResponse
let snapshotPayload: FitSnapshot
let journeyWrites: string[] = []

function switchPromise(a: SwitchAnswer): Promise<boolean> {
  if (a === "never") return new Promise(() => {})
  if (a === "error") return Promise.reject(new Error("HTTP 500"))
  return Promise.resolve(a)
}
const envelope = (v: unknown) => ({ data: { data: v } })

jest.mock("@/services/switches/fitSharedDisplay.service", () => ({
  getFitSharedDisplayEnabled: () => {
    log("switch.fitSharedDisplay()")
    return switchPromise(sharedSwitch)
  },
}))
jest.mock("@/services/switches/jobFitComponents.service", () => ({
  getJobFitComponentsEnabled: () => {
    log("switch.jobFitComponents()")
    return Promise.resolve(componentsSwitch)
  },
}))
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => Promise.resolve(false),
}))
jest.mock("@/services/job-fit/components.service", () => ({
  getFitComponents: (jobs: { jobId: string; fitScore?: number }[]) => {
    log(`components.getFitComponents(${jobs.map((j) => `${j.jobId}:${j.fitScore}`).join(",")})`)
    return Promise.resolve(componentsAnswer)
  },
  getGoalsWiring: () => new Promise(() => {}),
}))
jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: {
    getMatches: (method?: string) => {
      log(`fit.getMatches(${method ?? ""})`)
      return Promise.resolve({ data: { data: method === "closeness" ? ROWS_CLOSENESS : ROWS_GAP, gated: false } })
    },
    getDetail: (jobId: string, method?: string) => {
      log(`fit.getDetail(${jobId},${method ?? ""})`)
      return Promise.resolve(envelope(detailFor(jobId, method ?? "gap")))
    },
    getHistory: () => Promise.resolve(envelope([])),
    getSnapshot: (id: string) => {
      log(`fit.getSnapshot(${id})`)
      return Promise.resolve(envelope(snapshotPayload))
    },
    getPathway: () => Promise.resolve(envelope({})),
    saveSnapshot: () => Promise.resolve(envelope({ id: "saved" })),
    scoreTarget: (body: { target: unknown[] }) => {
      log(`fit.scoreTarget(${body.target.length})`)
      return Promise.resolve(envelope(detailFor("target", "gap")))
    },
  },
}))
jest.mock("@/services/job-fit/explain.service", () => {
  const actual = jest.requireActual("@/services/job-fit/explain.service")
  return {
    ...actual,
    explainService: { explain: () => new Promise(() => {}) },
  }
})
jest.mock("@/services/targets", () => ({
  targetsService: { extract: () => Promise.resolve(envelope(DRAFT)) },
}))
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useAdvanceJourney: () => ({
    mutate: (v: { stageId: string; artefact: Record<string, unknown> }) => {
      const a = v.artefact as { jobId?: string; targetRole?: { jobId?: string } }
      journeyWrites.push(`${v.stageId}:${a.targetRole?.jobId ?? a.jobId ?? ""}`)
    },
    isPending: false,
  }),
}))
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar-stub" />,
}))

import DsMatchesPage from "@/pages/direction-setting/MatchesPage"
import CareerMatchesPage from "@/pages/job-fit/MatchesPage"
import FitDetailPage from "@/pages/job-fit/FitDetailPage"
import FitHistoryPage from "@/pages/job-fit/FitHistoryPage"
import TargetPreviewPage from "@/pages/job-fit/TargetPreviewPage"
import { useFitSharedDisplayEnabled } from "@/hooks/switches/useFitSharedDisplayEnabled"
import { FIT_MATCHES_STALE_MS } from "@/hooks/job-fit/useFitMatches"
import { renderHook } from "@testing-library/react"

/* ── Fixtures (synthetic) ── */
const ROW: FitMatch = {
  jobId: "j1",
  roleTitle: "Operations Coordinator",
  department: "Operations",
  tier: null,
  baseTier: null,
  fitBand: "Good",
  totalVariation: 280,
  behaviorVariation: 90,
  aptitudeVariation: 100,
  coreTraitVariation: 90,
  confidence: null,
  fitScore: 87,
  method: "gap",
  closenessScore: null,
  criticalGapCount: 0,
  dimensionsEvaluated: 22,
  dimensionsTotal: 22,
  coverage: "full",
}
// Server order: j1 first. Overall fit (below) would put j2 first — it must not.
const ROWS_GAP: FitMatch[] = [
  ROW,
  { ...ROW, jobId: "j2", roleTitle: "Data Analyst", department: null, fitScore: 64, totalVariation: 790 },
  { ...ROW, jobId: "j3", roleTitle: "Sales Lead", department: "Sales", fitScore: 41, totalVariation: 1300 },
]
const ROWS_CLOSENESS: FitMatch[] = ROWS_GAP.map((r, i) => ({ ...r, method: "closeness", closenessScore: [92, 71, 58][i] }))

function detailFor(jobId: string, method: string): FitDetail {
  const row = (method === "closeness" ? ROWS_CLOSENESS : ROWS_GAP).find((r) => r.jobId === jobId) ?? ROW
  return {
    jobId,
    roleTitle: row.roleTitle,
    tier: null,
    baseTier: null,
    totalVariation: row.totalVariation,
    fitScore: row.fitScore,
    method: method === "closeness" ? "closeness" : "gap",
    closenessScore: row.closenessScore ?? null,
    blueprintVersion: 3,
    dimensionsEvaluated: 22,
    dimensionsTotal: 22,
    coverage: "full",
    perDimension: [
      { category: "behavior", dimensionId: 2, dimensionName: "Analysing", candidateScore: 40, benchmarkScore: 65, gap: -25, coaching: "Practise.", measured: true },
    ],
    criticalGaps: [{ dimensionName: "Analysing", category: "behavior", gap: -25 }],
    coachingGaps: [],
    overdoneFlags: [],
    interviewSelfAdvocacy: ["You lead with new ideas."],
    methodologyNote: "Fixture methodology note.",
  }
}
const PARTIAL = (d: FitDetail): FitDetail => ({ ...d, coverage: "partial", dimensionsEvaluated: 18, dimensionsTotal: 22, verdictWithheld: true })

const COMPONENTS_OVERALL: FitComponentsResponse = {
  weights: { prism: 0.4, function: 0.2, seniority: 0.15, skills: 0.15, goal: 0.1 },
  engineVersion: "fx-overall",
  mode: "overall",
  benchmarksValidated: false,
  jobs: {
    j1: { status: "ok", goalAlignment: { status: "unscored", family: null }, overall: { score: 70.6, used: ["prism"], missing: [], signals: {} } },
    j2: { status: "ok", goalAlignment: { status: "unscored", family: null }, overall: { score: 81.2, used: ["prism"], missing: [], signals: {} } },
    j3: { status: "ok", goalAlignment: { status: "unscored", family: null }, overall: { score: null, used: [], missing: ["function"], signals: {} } },
  },
}
const COMPONENTS_V1: FitComponentsResponse = {
  weights: { behavioural: 0.6, goalAlignment: 0.2, experienceMatch: 0.2 },
  engineVersion: "fx-v1",
  jobs: {
    j1: {
      status: "ok",
      goalAlignment: { status: "unscored", family: null },
      experienceMatch: { status: "no_resume" },
      composite: { score: 76.4, used: ["behavioural"], missing: [] },
    },
  },
}
const DRAFT: TargetDraft = {
  behaviors: [
    { dimensionId: 1, dimensionName: "Innovating", category: "behavior", target: 61, confidence: 0.8, evidence: "Fixture", provenance: "measured", interpretation: "natural" },
  ],
  aptitudes: [],
  coreTraits: [],
  measuredCount: 1,
  imputedCount: 0,
  meanConfidence: 0.8,
  provider: "stub",
  draft: true,
  warnings: [],
  methodologyNote: "Fixture draft methodology.",
}
const snap = (payload: FitSnapshot["payload"]): FitSnapshot => ({
  id: "s1",
  source: "detail",
  jobId: "j1",
  roleTitle: "Operations Coordinator",
  fitScore: 87,
  tier: null,
  engineVersion: "fx-1",
  computedAt: "2026-10-01T12:00:00Z",
  payload,
})

/* ── Harness ── */
async function settle(ticks = 12) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

function mount(ui: ReactElement, qc = newClient(), at = "/", routePath?: string) {
  const r = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        {routePath ? (
          <Routes>
            <Route path={routePath} element={ui} />
          </Routes>
        ) : (
          ui
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...r, qc }
}
/** The keys that actually hold data (a disabled observer still creates an empty entry). */
const keysOf = (qc: QueryClient) =>
  qc
    .getQueryCache()
    .getAll()
    .filter((q) => q.state.data !== undefined)
    .map((q) => JSON.stringify(q.queryKey))
/** A client whose fit_shared_display read is already cached as on — the warm case. */
function warmClient(): QueryClient {
  const qc = newClient()
  qc.setQueryData(["switches", "fit-shared-display"], true)
  return qc
}
/** Direction Setting's rows, in the order drawn (each is a toggle button). */
const dsRows = () => Array.from(document.querySelectorAll<HTMLElement>("section[aria-labelledby=\"ds-matches-heading\"] button[aria-pressed]"))

beforeEach(() => {
  requests.length = 0
  journeyWrites = []
  sharedSwitch = true
  componentsSwitch = false
  componentsAnswer = COMPONENTS_OVERALL
  snapshotPayload = snap(detailFor("j1", "gap"))
  window.localStorage.clear()
})

/* ── The switch itself ── */
describe("useFitSharedDisplayEnabled — fails closed", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={newClient()}>{children}</QueryClientProvider>
  )
  it("is false while loading and true only once the server says on", async () => {
    const { result } = renderHook(() => useFitSharedDisplayEnabled(), { wrapper })
    expect(result.current).toBe(false)
    await settle(3)
    expect(result.current).toBe(true)
  })
  it("reads an error as off", async () => {
    sharedSwitch = "error"
    const { result } = renderHook(() => useFitSharedDisplayEnabled(), { wrapper })
    await settle(3)
    expect(requests).toContain("switch.fitSharedDisplay()")
    expect(result.current).toBe(false)
  })
  it("reads the server's off as off", async () => {
    sharedSwitch = false
    const { result } = renderHook(() => useFitSharedDisplayEnabled(), { wrapper })
    await settle(3)
    expect(result.current).toBe(false)
  })
})

/* ── Direction Setting Job matches ── */
describe("Direction Setting Job matches — one matches hook (decision 9)", () => {
  it("ON: reads Career Fit's key, not its own", async () => {
    const { qc } = mount(<DsMatchesPage />, warmClient())
    await settle()
    const keys = keysOf(qc)
    expect(keys).toContain('["job-fit","matches","gap"]')
    expect(keys).not.toContain('["direction-setting","matches","gap"]')
    expect(dsRows()[0]).toHaveTextContent("Operations Coordinator")
  })

  it("ON: the shared read is cached for 5 minutes", async () => {
    const { qc } = mount(<DsMatchesPage />)
    await settle()
    const q = qc.getQueryCache().find({ queryKey: ["job-fit", "matches", "gap"] })
    expect(FIT_MATCHES_STALE_MS).toBe(5 * 60_000)
    const staleTimes = (q?.observers ?? []).map((o) => o.options.staleTime)
    expect(staleTimes).toContain(5 * 60_000)
  })

  it("ON (switch read cached): Career Fit then Direction Setting is ONE matches GET (one snapshot row)", async () => {
    const qc = warmClient()
    const a = mount(<CareerMatchesPage />, qc)
    await settle()
    a.unmount()
    mount(<DsMatchesPage />, qc)
    await settle()
    expect(requests.filter((r) => r.startsWith("fit.getMatches"))).toEqual(["fit.getMatches(gap)"])
  })

  it("ON, switch read cold: fail closed means DS reads its own key while the switch loads (a second GET), then moves onto the shared key", async () => {
    const qc = newClient()
    const a = mount(<CareerMatchesPage />, qc)
    await settle()
    a.unmount()
    mount(<DsMatchesPage />, qc)
    await settle()
    expect(requests.filter((r) => r.startsWith("fit.getMatches"))).toEqual(["fit.getMatches(gap)", "fit.getMatches(gap)"])
    expect(screen.getByRole("radio", { name: "PRISM: gap" })).toBeInTheDocument()
    // Revisiting within the 5 minutes costs nothing: both reads are now cached.
    requests.length = 0
    mount(<DsMatchesPage />, qc)
    await settle()
    expect(requests.filter((r) => r.startsWith("fit.getMatches"))).toEqual([])
  })

  it("OFF: Direction Setting keeps its own key, so the same visit is two GETs", async () => {
    sharedSwitch = false
    const qc = newClient()
    const a = mount(<CareerMatchesPage />, qc)
    await settle()
    a.unmount()
    mount(<DsMatchesPage />, qc)
    await settle()
    expect(keysOf(qc)).toContain('["direction-setting","matches","gap"]')
    expect(requests.filter((r) => r.startsWith("fit.getMatches"))).toEqual(["fit.getMatches(gap)", "fit.getMatches(gap)"])
  })

  it("an unreadable switch is OFF: own key, FIT-5a wording", async () => {
    sharedSwitch = "error"
    const { qc } = mount(<DsMatchesPage />)
    await settle()
    expect(keysOf(qc)).toContain('["direction-setting","matches","gap"]')
    expect(keysOf(qc)).not.toContain('["job-fit","matches","gap"]')
    expect(screen.getByRole("radio", { name: "Best overall match" })).toBeInTheDocument()
    expect(screen.queryByRole("radio", { name: "PRISM: closeness" })).toBeNull()
  })
})

describe("Direction Setting Job matches — wording (decision 3)", () => {
  it("ON: the toggle reads PRISM: gap / PRISM: closeness, plain words as the hint", async () => {
    mount(<DsMatchesPage />)
    await settle()
    const gap = screen.getByRole("radio", { name: "PRISM: gap" })
    const closeness = screen.getByRole("radio", { name: "PRISM: closeness" })
    expect(gap).toHaveAttribute("title", "Closest to the role")
    expect(closeness.getAttribute("title")).not.toMatch(/overall/i)
    expect(screen.queryByText(/Best overall match/)).toBeNull()
    fireEvent.click(closeness)
    await settle()
    expect(requests).toContain("fit.getMatches(closeness)")
  })
})

describe("Direction Setting Job matches — Overall fit (decision 7)", () => {
  it("ON + Overall: each row shows Overall fit with PRISM fit beneath, in SERVER order", async () => {
    componentsSwitch = true
    mount(<DsMatchesPage />)
    await settle()
    const rows = dsRows()
    // Server order kept although j2's Overall fit (81) beats j1's (71).
    expect(rows.map((r) => within(r).getByText(/Coordinator|Analyst|Lead/).textContent)).toEqual([
      "Operations Coordinator",
      "Data Analyst",
      "Sales Lead",
    ])
    expect(rows[0]).toHaveTextContent("71%Overall fitPRISM fit 87%")
    expect(rows[1]).toHaveTextContent("81%Overall fitPRISM fit 64%")
    // A role too little is known about shows its PRISM fit, labelled as such.
    expect(rows[2]).toHaveTextContent("41%PRISM fitNot enough about you to combine")
    // The stage-7 target is still the server's first row (FIT-3-F1, FIT-5-F3).
    expect(journeyWrites).toEqual(["7:j1", "8:j1"])
    expect(rows[0]).toHaveAttribute("aria-pressed", "true")
  })

  it("ON + Overall: the breakdown headline carries the selected role's Overall fit", async () => {
    componentsSwitch = true
    const { container } = mount(<DsMatchesPage />)
    await settle()
    const line = container.querySelector('section[aria-labelledby="ds-breakdown-heading"] [data-fit-figure="overall"]')
    expect(line).toHaveTextContent("Overall fit 71%")
    expect(line).toHaveTextContent("PRISM fit above is unchanged")
  })

  it("ON + Overall: reads components the way Career Fit does (same jobs, same %s)", async () => {
    componentsSwitch = true
    mount(<DsMatchesPage />)
    await settle()
    expect(requests).toContain("components.getFitComponents(j1:87,j2:64,j3:41)")
  })

  it("ON + components v1 (no Overall): rows are FIT-5a's", async () => {
    componentsSwitch = true
    componentsAnswer = COMPONENTS_V1
    const { container } = mount(<DsMatchesPage />)
    await settle()
    expect(container.querySelector('[data-fit-figure="overall"]')).toBeNull()
    expect(dsRows()[0]).toHaveTextContent("87%fit")
  })

  it("ON + components switch off: no components request, no Overall", async () => {
    componentsSwitch = false
    const { container } = mount(<DsMatchesPage />)
    await settle()
    expect(requests).toContain("switch.jobFitComponents()")
    expect(requests.some((r) => r.startsWith("components."))).toBe(false)
    expect(container.querySelector('[data-fit-figure="overall"]')).toBeNull()
  })

  it("OFF: the components switch is not even read", async () => {
    sharedSwitch = false
    componentsSwitch = true
    mount(<DsMatchesPage />)
    await settle()
    expect(requests).not.toContain("switch.jobFitComponents()")
    expect(requests.some((r) => r.startsWith("components."))).toBe(false)
  })
})

/* ── Career Fit role detail ── */
describe("Career Fit role detail — Total gap (decision 3)", () => {
  it("ON: the tile reads Total gap", async () => {
    mount(<FitDetailPage />, newClient(), "/job-fit/role/j1", "/job-fit/role/:jobId")
    await settle()
    expect(screen.getByText("Total gap")).toBeInTheDocument()
    expect(screen.queryByText("Overall closeness")).toBeNull()
  })
  it("OFF: the tile still reads Overall closeness", async () => {
    sharedSwitch = false
    mount(<FitDetailPage />, newClient(), "/job-fit/role/j1", "/job-fit/role/:jobId")
    await settle()
    expect(screen.getByText("Overall closeness")).toBeInTheDocument()
    expect(screen.queryByText("Total gap")).toBeNull()
  })
})

/* ── Fit a JD ── */
async function scoreAJd() {
  fireEvent.change(screen.getByLabelText("Job description"), { target: { value: "Fixture job description text." } })
  fireEvent.click(screen.getByRole("button", { name: /Draft the target/ }))
  await settle()
  fireEvent.click(screen.getByRole("button", { name: /Score my fit against this target/ }))
  await settle()
}
describe("Fit a JD — Total gap and a reserved Overall slot (decisions 3, 4)", () => {
  it("ON: Total gap, and an Overall fit slot with no number in it", async () => {
    const { container } = mount(<TargetPreviewPage />)
    await settle()
    await scoreAJd()
    expect(screen.getByText("Total gap")).toBeInTheDocument()
    expect(screen.queryByText("Overall closeness")).toBeNull()
    const slot = container.querySelector('[data-fit-slot="overall"]')
    expect(slot).not.toBeNull()
    expect(slot?.textContent).not.toMatch(/\d/)
    expect(slot).toHaveTextContent("isn't available for a pasted job description yet")
  })
  it("OFF: no slot, Overall closeness", async () => {
    sharedSwitch = false
    const { container } = mount(<TargetPreviewPage />)
    await settle()
    await scoreAJd()
    expect(container.querySelector('[data-fit-slot="overall"]')).toBeNull()
    expect(screen.getByText("Overall closeness")).toBeInTheDocument()
  })
})

/* ── History ── */
const openReport = () => mount(<FitHistoryPage />, newClient(), "/job-fit/history/s1", "/job-fit/history/:snapshotId")
describe("History — PRISM fit as recorded, with the partial note (decision 5)", () => {
  it("ON + partial: labelled PRISM fit as recorded, with the partial-profile note", async () => {
    snapshotPayload = snap(PARTIAL(detailFor("j1", "gap")))
    openReport()
    await settle()
    expect(screen.getByText("PRISM fit as recorded")).toBeInTheDocument()
    expect(screen.queryByText("Your fit as recorded")).toBeNull()
    expect(screen.getByRole("note")).toHaveTextContent("Partial profile · 18 of 22 measured")
    // No Overall fit on a reopened report: snapshots never stored one.
    expect(screen.queryByText(/Overall fit/)).toBeNull()
  })
  it("ON + full: no note", async () => {
    openReport()
    await settle()
    expect(screen.getByText("PRISM fit as recorded")).toBeInTheDocument()
    expect(screen.queryByRole("note")).toBeNull()
  })
  it("OFF + partial: FIT-5a's heading and no note", async () => {
    sharedSwitch = false
    snapshotPayload = snap(PARTIAL(detailFor("j1", "gap")))
    openReport()
    await settle()
    expect(screen.getByText("Your fit as recorded")).toBeInTheDocument()
    expect(screen.queryByRole("note")).toBeNull()
  })
})
