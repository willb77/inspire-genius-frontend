/**
 * @jest-environment jsdom
 *
 * FIT-5a — golden DOM + request log for every surface that draws a fit.
 *
 * FIT-5a moves the fit helpers and primitives into `src/components/fit/` and
 * builds the shared fit components. It must change NOTHING a person sees and
 * NOTHING the server receives. This suite is the proof:
 *
 * - The goldens under `__golden__/` were recorded on the base sha, before any
 *   source file changed (CSA d01e9276 §3). Every later commit must leave them
 *   byte-identical; a golden diff in the PR IS the failure.
 * - Each case stores `container.innerHTML` and the ordered list of service
 *   calls it made (getMatches / getDetail / switches / components / explain /
 *   journey writes), so a query-key or staleTime change the DOM cannot show
 *   still fails here.
 * - Mocks sit at the boundaries FIT-5 does not move: the services, the
 *   journey-write hook and the radar chart (Recharts is not deterministic in
 *   jsdom). The fit hooks themselves run for real — mocking them would let a
 *   hook rewrite pass unseen.
 *
 * To re-record (only ever on the base, before a source change):
 *   FIT5_GOLDEN_WRITE=1 npx jest src/components/fit/__tests__/fit5-golden.test.tsx
 */
import fs from "fs"
import path from "path"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement } from "react"
import type { FitDetail, FitMatch, FitSnapshot, FitSnapshotSummary } from "@/types/job-fit"
import type { FitComponentsResponse } from "@/types/job-fit/components"
import type { TargetDraft } from "@/types/targets"

/* ── The request log: every boundary call, in order ── */
const requests: string[] = []
const log = (entry: string) => requests.push(entry)

/* What each service answers with, per case. `never` = still loading. */
type Answer<T> = { ok: T } | { fail: number } | "never"
let matchesAnswer: (method: string) => Answer<unknown>
let detailAnswer: (jobId: string, method: string) => Answer<unknown>
let historyAnswer: Answer<unknown>
let snapshotAnswer: Answer<unknown>
let pathwayAnswer: Answer<unknown>
let scoreAnswer: Answer<unknown>
let componentsSwitch = false
let targetsSwitch = false
let componentsAnswer: Answer<FitComponentsResponse>

function answer<T>(a: Answer<T>, wrap: (v: T) => unknown = (v) => v): Promise<unknown> {
  if (a === "never") return new Promise(() => {})
  if ("fail" in a) {
    const err = Object.assign(new Error(`HTTP ${a.fail}`), { response: { status: a.fail } })
    return Promise.reject(err)
  }
  return Promise.resolve(wrap(a.ok))
}
const envelope = (v: unknown) => ({ data: { data: v } })

jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: {
    getMatches: (method?: string) => {
      log(`fit.getMatches(${method ?? ""})`)
      return answer(matchesAnswer(method ?? "gap"), (v) => ({ data: v }))
    },
    getDetail: (jobId: string, method?: string) => {
      log(`fit.getDetail(${jobId},${method ?? ""})`)
      return answer(detailAnswer(jobId, method ?? "gap"), envelope)
    },
    getPathway: () => {
      log("fit.getPathway()")
      return answer(pathwayAnswer, envelope)
    },
    getHistory: () => {
      log("fit.getHistory()")
      return answer(historyAnswer, envelope)
    },
    getSnapshot: (id: string) => {
      log(`fit.getSnapshot(${id})`)
      return answer(snapshotAnswer, envelope)
    },
    saveSnapshot: (body: unknown) => {
      log(`fit.saveSnapshot(${JSON.stringify(body)})`)
      return Promise.resolve(envelope({ id: "saved" }))
    },
    scoreTarget: (body: { target: unknown[]; method?: string }) => {
      log(`fit.scoreTarget(${body.target.length},${body.method ?? ""})`)
      return answer(scoreAnswer, envelope)
    },
  },
}))
jest.mock("@/services/job-fit/components.service", () => ({
  getFitComponents: (jobs: { jobId: string; fitScore?: number }[]) => {
    log(`components.getFitComponents(${jobs.map((j) => `${j.jobId}:${j.fitScore}`).join(",")})`)
    return answer(componentsAnswer)
  },
  getGoalsWiring: () => {
    log("components.getGoalsWiring()")
    return new Promise(() => {})
  },
}))
jest.mock("@/services/switches/jobFitComponents.service", () => ({
  getJobFitComponentsEnabled: () => {
    log("switch.jobFitComponents()")
    return Promise.resolve(componentsSwitch)
  },
}))
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => {
    log("switch.goalTargets()")
    return Promise.resolve(targetsSwitch)
  },
}))
jest.mock("@/services/goals/targets.service", () => ({
  getMyTargets: () => {
    log("goals.getMyTargets()")
    return Promise.resolve([])
  },
  getRoadmap: () => Promise.resolve(null),
  makeTarget: () => Promise.resolve(null),
  rebuildRoadmap: () => Promise.resolve(null),
  removeTarget: () => Promise.resolve(null),
}))
jest.mock("@/services/job-fit/explain.service", () => {
  const actual = jest.requireActual("@/services/job-fit/explain.service")
  return {
    ...actual,
    explainService: {
      explain: (body: { jobId?: string; fitScore?: number; question?: string }) => {
        log(`explain(${body.jobId},${body.fitScore},${body.question ?? ""})`)
        return Promise.resolve({
          overview: "Fixture overview of this fit.",
          gaps: [{ dimension: "Innovating", plain: "Fixture plain read.", howToClose: "Fixture step." }],
          closingActions: [],
          answer: null,
          fitScore: body.fitScore,
          disclaimer: "Fixture disclaimer.",
        })
      },
    },
  }
})
jest.mock("@/services/targets", () => ({
  targetsService: {
    extract: (jdText: string) => {
      log(`targets.extract(${jdText.length})`)
      return Promise.resolve(envelope(DRAFT))
    },
  },
}))
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useAdvanceJourney: () => ({
    mutate: (v: { stageId: string; artefact: Record<string, unknown> }) => {
      const a = v.artefact as { jobId?: string; targetRole?: { jobId?: string } }
      log(`journey.advance(${v.stageId},${a.targetRole?.jobId ?? a.jobId ?? ""})`)
    },
    isPending: false,
  }),
}))
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar-stub" />,
}))

import CareerMatchesPage from "@/pages/job-fit/MatchesPage"
import FitDetailPage from "@/pages/job-fit/FitDetailPage"
import FitHistoryPage from "@/pages/job-fit/FitHistoryPage"
import TargetPreviewPage from "@/pages/job-fit/TargetPreviewPage"
import PathwayPage from "@/pages/job-fit/PathwayPage"
import GapsPage from "@/pages/job-fit/GapsPage"
import CoachPage from "@/pages/job-fit/CoachPage"
import DsMatchesPage from "@/pages/direction-setting/MatchesPage"

/* ── Fixtures (synthetic) ── */
const ROW_BASE: FitMatch = {
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
const ROWS_GAP: FitMatch[] = [
  ROW_BASE,
  { ...ROW_BASE, jobId: "j2", roleTitle: "Data Analyst", department: null, fitScore: 64, totalVariation: 790, criticalGapCount: 2 },
  { ...ROW_BASE, jobId: "j3", roleTitle: "Sales Lead", department: "Sales", fitScore: 41, totalVariation: 1300, criticalGapCount: 1 },
  { ...ROW_BASE, jobId: "j4", roleTitle: "Night Porter", department: null, fitScore: undefined, totalVariation: 1760, criticalGapCount: 5 },
]
const ROWS_CLOSENESS: FitMatch[] = ROWS_GAP.map((r, i) => ({
  ...r,
  method: "closeness",
  closenessScore: [92, 71, 58, 33][i],
}))
const ROWS_PARTIAL: FitMatch[] = ROWS_GAP.map((r, i) =>
  i === 1 ? { ...r, coverage: "partial", dimensionsEvaluated: 18, dimensionsTotal: 22, verdictWithheld: true } : r,
)

function detailFor(jobId: string, method: string): FitDetail {
  const row = (method === "closeness" ? ROWS_CLOSENESS : ROWS_GAP).find((r) => r.jobId === jobId) ?? ROW_BASE
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
      { category: "behavior", dimensionId: 1, dimensionName: "Innovating", candidateScore: 70, benchmarkScore: 60, gap: 10, coaching: "Keep it up.", measured: true },
      { category: "behavior", dimensionId: 2, dimensionName: "Analysing", candidateScore: 40, benchmarkScore: 65, gap: -25, coaching: "Practise structured review.", measured: true },
      { category: "aptitude", dimensionId: 9, dimensionName: "Numerical", candidateScore: 55, benchmarkScore: 60, gap: -5, coaching: "Small daily drills.", measured: true },
    ],
    criticalGaps: [{ dimensionName: "Analysing", category: "behavior", gap: -25 }],
    coachingGaps: [{ dimensionName: "Numerical", category: "aptitude", gap: -5 }],
    overdoneFlags: [{ dimensionName: "Innovating", candidateScore: 70 }],
    interviewSelfAdvocacy: ["You lead with new ideas.", "You stay calm in a crunch."],
    methodologyNote: "Fixture methodology note.",
  }
}
const PARTIAL_DETAIL = (jobId: string, method: string): FitDetail => ({
  ...detailFor(jobId, method),
  coverage: "partial",
  dimensionsEvaluated: 18,
  dimensionsTotal: 22,
  verdictWithheld: true,
})

const HISTORY_ROWS: FitSnapshotSummary[] = [
  { id: "h1", source: "detail", jobId: "j1", roleTitle: "Operations Coordinator", fitScore: 87, tier: null, engineVersion: "fx-1", computedAt: "2026-10-01T12:00:00Z" },
  { id: "h2", source: "matches", jobId: null, roleTitle: "", fitScore: null, tier: null, engineVersion: "fx-1", computedAt: "2026-10-02T12:00:00Z" },
  { id: "h3", source: "saved", jobId: "j2", roleTitle: "Data Analyst", fitScore: 64, tier: null, engineVersion: "fx-1", computedAt: "2026-10-03T12:00:00Z" },
]

const COMPONENTS_V1: FitComponentsResponse = {
  weights: { behavioural: 0.6, goalAlignment: 0.2, experienceMatch: 0.2 },
  engineVersion: "fx-components",
  jobs: {
    j1: {
      status: "ok",
      goalAlignment: { status: "scored", family: "Operations", score: 72, verdict: "supported", goalIds: ["g1"], goalTitles: ["Run a team"], pullingDimensions: [] },
      experienceMatch: { status: "scored", score: 60, covered: 3, total: 5, uncovered: ["Budgeting", "Hiring"] },
      composite: { score: 76.4, used: ["behavioural", "goalAlignment", "experienceMatch"], missing: [] },
    },
    j2: {
      status: "ok",
      goalAlignment: { status: "scored", family: "Data", score: 30, verdict: "at-tension", goalIds: ["g1"], goalTitles: ["Run a team"], pullingDimensions: ["Analysing"] },
      experienceMatch: { status: "no_resume" },
      composite: { score: null, used: ["behavioural"], missing: ["experienceMatch"] },
    },
    j3: { status: "ok", goalAlignment: { status: "unmapped", family: null }, experienceMatch: { status: "no_activities" }, composite: { score: 41, used: ["behavioural"], missing: ["goalAlignment"] } },
    j4: { status: "not_found" },
  },
}
const COMPONENTS_OVERALL: FitComponentsResponse = {
  weights: { prism: 0.4, function: 0.2, seniority: 0.15, skills: 0.15, goal: 0.1 },
  engineVersion: "fx-overall",
  mode: "overall",
  benchmarksValidated: false,
  person: {
    function: { status: "classified", primaryFamily: "Operations", secondaryFamilies: ["Data"], evidence: "Fixture résumé line", source: "resume" },
    seniority: { status: "classified", level: 3, evidence: "Fixture title", source: "resume" },
    classifier: "fixture",
    otherAssessments: [],
  },
  jobs: {
    j1: {
      status: "ok",
      goalAlignment: { status: "scored", family: "Operations", score: 72, verdict: "supported", goalIds: ["g1"], goalTitles: ["Run a team"], pullingDimensions: [] },
      overall: {
        score: 70.6,
        used: ["prism", "function", "seniority"],
        missing: ["skills", "goal"],
        signals: {
          prism: { status: "scored", score: 87 },
          function: { status: "scored", score: 100, roleFamily: "Operations", personFamily: "Operations" },
          seniority: { status: "scored", score: 80, roleLevel: 3, personLevel: 3 },
          skills: { status: "no_resume" },
          goal: { status: "no_goals" },
        },
      },
    },
    j2: {
      status: "ok",
      goalAlignment: { status: "unscored", family: null },
      overall: { score: 81.2, used: ["prism", "function"], missing: ["seniority"], signals: { prism: { status: "scored", score: 64 }, seniority: { status: "role_unlevelled" } } },
    },
    j3: {
      status: "ok",
      goalAlignment: { status: "no_linked_goal", family: "Sales" },
      overall: { score: null, used: [], missing: ["function"], signals: { function: { status: "role_unmapped" } } },
    },
    j4: {
      status: "ok",
      goalAlignment: { status: "unscored", family: null },
      overall: { score: null, used: [], missing: [], status: "not_set_up", signals: {} },
    },
  },
}

const DIM = (id: number, name: string, provenance: "measured" | "imputed", conf: number) => ({
  dimensionId: id,
  dimensionName: name,
  category: "behavior" as const,
  target: 60 + id,
  confidence: conf,
  evidence: provenance === "measured" ? "Fixture JD phrase" : "",
  provenance,
  interpretation: "natural",
})
const DRAFT: TargetDraft = {
  behaviors: [DIM(1, "Innovating", "measured", 0.8), DIM(2, "Analysing", "imputed", 0.4)],
  aptitudes: [],
  coreTraits: [DIM(17, "Resilience", "measured", 0.6)],
  measuredCount: 2,
  imputedCount: 1,
  meanConfidence: 0.6,
  provider: "stub",
  draft: true,
  warnings: ["Fixture warning."],
  methodologyNote: "Fixture draft methodology.",
}

const snap = (payload: FitSnapshot["payload"], extra: Partial<FitSnapshot> = {}): FitSnapshot => ({
  id: "s1",
  source: "detail",
  jobId: "j1",
  roleTitle: "Operations Coordinator",
  fitScore: 87,
  tier: null,
  engineVersion: "fx-1",
  computedAt: "2026-10-01T12:00:00Z",
  payload,
  ...extra,
})

/* ── Harness ── */
const GOLDEN_DIR = path.resolve(process.cwd(), "src/components/fit/__tests__/__golden__")
const WRITE = process.env.FIT5_GOLDEN_WRITE === "1"

async function settle(ticks = 12) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

function mount(ui: ReactElement, at = "/", routePath?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
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
}

function compare(name: string, html: string) {
  const htmlFile = path.join(GOLDEN_DIR, `${name}.html`)
  const reqFile = path.join(GOLDEN_DIR, `${name}.requests.txt`)
  const reqText = requests.join("\n") + "\n"
  if (WRITE) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true })
    fs.writeFileSync(htmlFile, html + "\n")
    fs.writeFileSync(reqFile, reqText)
    return
  }
  expect(fs.existsSync(htmlFile)).toBe(true)
  expect(html + "\n").toBe(fs.readFileSync(htmlFile, "utf8"))
  expect(reqText).toBe(fs.readFileSync(reqFile, "utf8"))
}

const ok = <T,>(v: T): Answer<T> => ({ ok: v })
const MATCHES = (rows: FitMatch[], gated = false) => ({ data: rows, gated })
const byMethod = (gapRows: FitMatch[], closenessRows: FitMatch[] = ROWS_CLOSENESS, gated = false) =>
  (m: string): Answer<unknown> => ok(MATCHES(m === "closeness" ? closenessRows : gapRows, gated))

let dateSpy: jest.SpyInstance
beforeEach(() => {
  requests.length = 0
  window.localStorage.clear()
  matchesAnswer = byMethod(ROWS_GAP)
  detailAnswer = (id, m) => ok(detailFor(id, m))
  historyAnswer = ok(HISTORY_ROWS)
  snapshotAnswer = ok(snap(detailFor("j1", "gap")))
  pathwayAnswer = ok({})
  scoreAnswer = ok(detailFor("j1", "gap"))
  componentsSwitch = false
  targetsSwitch = false
  componentsAnswer = ok(COMPONENTS_V1)
  // Locale/timezone-free dates, so the goldens hold on any machine and in CI.
  dateSpy = jest.spyOn(Date.prototype, "toLocaleString").mockImplementation(function (this: Date) {
    return this.toISOString()
  })
})
afterEach(() => dateSpy.mockRestore())

type Case = { name: string; setup?: () => void; run: () => Promise<HTMLElement> }

/* Career Fit list */
const careerList = (act2?: () => Promise<void>) => async () => {
  const { container } = mount(<CareerMatchesPage />)
  await settle()
  if (act2) {
    await act2()
    await settle()
  }
  return container
}
const click = (label: string | RegExp) => async () => {
  fireEvent.click(screen.getByRole("radio", { name: label }))
}

/* Direction Setting */
const dsList = (act2?: () => Promise<void>) => async () => {
  const { container } = mount(<DsMatchesPage />)
  await settle()
  if (act2) {
    await act2()
    await settle()
  }
  return container
}

/* Career Fit detail */
const detailPage = (at = "/job-fit/role/j1") => async () => {
  const { container } = mount(<FitDetailPage />, at, "/job-fit/role/:jobId")
  await settle()
  return container
}

/* History */
const historyPage = async () => {
  const { container } = mount(<FitHistoryPage />, "/job-fit/history/s1", "/job-fit/history/:snapshotId")
  await settle()
  return container
}

/* Fit a JD */
const jdPage = (score: boolean) => async () => {
  const { container } = mount(<TargetPreviewPage />)
  await settle()
  if (score) {
    fireEvent.change(screen.getByLabelText("Job description"), { target: { value: "Fixture job description text." } })
    fireEvent.click(screen.getByRole("button", { name: /Draft the target/ }))
    await settle()
    fireEvent.click(screen.getByRole("button", { name: /Score my fit against this target/ }))
    await settle()
  }
  return container
}

const CASES: Case[] = [
  // ── Career Fit list ──
  { name: "career-list-loading", setup: () => (matchesAnswer = () => "never"), run: careerList() },
  { name: "career-list-error", setup: () => (matchesAnswer = () => ({ fail: 500 })), run: careerList() },
  { name: "career-list-gated-empty", setup: () => (matchesAnswer = byMethod([], [], true)), run: careerList() },
  { name: "career-list-gated-rows", setup: () => (matchesAnswer = byMethod(ROWS_GAP, ROWS_CLOSENESS, true)), run: careerList() },
  { name: "career-list-empty", setup: () => (matchesAnswer = byMethod([], [])), run: careerList() },
  { name: "career-list-full-gap", run: careerList() },
  { name: "career-list-partial", setup: () => (matchesAnswer = byMethod(ROWS_PARTIAL)), run: careerList() },
  { name: "career-list-closeness", run: careerList(click("PRISM closeness")) },
  { name: "career-list-history-error", setup: () => (historyAnswer = { fail: 500 }), run: careerList() },
  { name: "career-list-history-empty", setup: () => (historyAnswer = ok([])), run: careerList() },
  {
    name: "career-list-components-v1",
    setup: () => {
      componentsSwitch = true
      componentsAnswer = ok(COMPONENTS_V1)
    },
    run: careerList(),
  },
  {
    name: "career-list-components-v1-by-goals",
    setup: () => {
      componentsSwitch = true
      componentsAnswer = ok(COMPONENTS_V1)
    },
    run: careerList(async () => {
      fireEvent.click(screen.getByRole("checkbox"))
    }),
  },
  {
    name: "career-list-components-error",
    setup: () => {
      componentsSwitch = true
      componentsAnswer = { fail: 500 }
    },
    run: careerList(),
  },
  {
    name: "career-list-overall",
    setup: () => {
      componentsSwitch = true
      componentsAnswer = ok(COMPONENTS_OVERALL)
    },
    run: careerList(),
  },
  {
    name: "career-list-overall-prism-order",
    setup: () => {
      componentsSwitch = true
      componentsAnswer = ok(COMPONENTS_OVERALL)
    },
    run: careerList(click("PRISM fit")),
  },
  {
    name: "career-list-overall-partial",
    setup: () => {
      componentsSwitch = true
      componentsAnswer = ok(COMPONENTS_OVERALL)
      matchesAnswer = byMethod(ROWS_PARTIAL)
    },
    run: careerList(),
  },

  // ── Direction Setting Job matches ──
  { name: "ds-loading", setup: () => (matchesAnswer = () => "never"), run: dsList() },
  { name: "ds-error", setup: () => (matchesAnswer = () => ({ fail: 500 })), run: dsList() },
  { name: "ds-gated-empty", setup: () => (matchesAnswer = byMethod([], [], true)), run: dsList() },
  { name: "ds-gated-rows", setup: () => (matchesAnswer = byMethod(ROWS_GAP, ROWS_CLOSENESS, true)), run: dsList() },
  { name: "ds-empty", setup: () => (matchesAnswer = byMethod([], [])), run: dsList() },
  { name: "ds-full-gap", run: dsList() },
  { name: "ds-closeness", run: dsList(click("Best overall match")) },
  {
    name: "ds-select-second",
    run: dsList(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Data Analyst/ }))
    }),
  },
  {
    name: "ds-partial",
    setup: () => {
      matchesAnswer = byMethod(ROWS_PARTIAL)
      detailAnswer = (id, m) => ok(PARTIAL_DETAIL(id, m))
    },
    run: dsList(),
  },
  {
    name: "ds-detail-gated",
    setup: () => (detailAnswer = (id, m) => ok({ ...detailFor(id, m), gated: true, methodologyNote: "" })),
    run: dsList(),
  },
  { name: "ds-detail-loading", setup: () => (detailAnswer = () => "never"), run: dsList() },
  { name: "ds-detail-error", setup: () => (detailAnswer = () => ({ fail: 500 })), run: dsList() },

  // ── Career Fit detail ──
  { name: "detail-gap", run: detailPage() },
  { name: "detail-closeness", run: detailPage("/job-fit/role/j1?method=closeness") },
  { name: "detail-partial", setup: () => (detailAnswer = (id, m) => ok(PARTIAL_DETAIL(id, m))), run: detailPage() },
  { name: "detail-loading", setup: () => (detailAnswer = () => "never"), run: detailPage() },
  { name: "detail-error", setup: () => (detailAnswer = () => ({ fail: 500 })), run: detailPage() },
  { name: "detail-narrative-off", setup: () => window.localStorage.setItem("job_fit_narrative", "false"), run: detailPage() },
  {
    name: "detail-components-v1",
    setup: () => {
      componentsSwitch = true
      componentsAnswer = ok(COMPONENTS_V1)
    },
    run: detailPage(),
  },
  {
    name: "detail-overall",
    setup: () => {
      componentsSwitch = true
      componentsAnswer = ok(COMPONENTS_OVERALL)
    },
    run: detailPage(),
  },

  // ── Fit a JD ──
  { name: "jd-before-draft", run: jdPage(false) },
  { name: "jd-scored", run: jdPage(true) },
  {
    name: "jd-scored-partial-gated",
    setup: () => (scoreAnswer = ok({ ...PARTIAL_DETAIL("target", "gap"), gated: true })),
    run: jdPage(true),
  },
  { name: "jd-no-prism", setup: () => (scoreAnswer = { fail: 404 }), run: jdPage(true) },
  { name: "jd-score-error", setup: () => (scoreAnswer = { fail: 500 }), run: jdPage(true) },

  // ── History (a reopened report) ──
  { name: "history-detail-gap", run: historyPage },
  { name: "history-detail-closeness", setup: () => (snapshotAnswer = ok(snap(detailFor("j1", "closeness")))), run: historyPage },
  {
    name: "history-detail-partial",
    setup: () => (snapshotAnswer = ok(snap(PARTIAL_DETAIL("j1", "gap")))),
    run: historyPage,
  },
  {
    name: "history-matches",
    setup: () => (snapshotAnswer = ok(snap(ROWS_CLOSENESS, { source: "matches", roleTitle: "", jobId: null }))),
    run: historyPage,
  },
  {
    name: "history-matches-gap",
    setup: () => (snapshotAnswer = ok(snap(ROWS_GAP, { source: "matches", roleTitle: "", jobId: null }))),
    run: historyPage,
  },
  {
    name: "history-matches-empty",
    setup: () => (snapshotAnswer = ok(snap([], { source: "matches", roleTitle: "", jobId: null }))),
    run: historyPage,
  },
  {
    name: "history-legacy-save",
    setup: () => (snapshotAnswer = ok(snap({ overview: "A kept overview." }, { source: "saved", fitScore: 64 }))),
    run: historyPage,
  },
  {
    name: "history-legacy-headline-only",
    setup: () => (snapshotAnswer = ok(snap({}, { source: "saved", fitScore: null, roleTitle: "" }))),
    run: historyPage,
  },
  { name: "history-404", setup: () => (snapshotAnswer = { fail: 404 }), run: historyPage },

  // ── Pathway (import-path change only) ──
  {
    name: "pathway-content",
    setup: () =>
      (pathwayAnswer = ok({
        suggestions: [
          { roleTitle: "Team Lead", roleFamily: "Operations", rationale: "A step up.", jobId: "j1" },
          { roleTitle: "Planner", rationale: "Adjacent.", jobId: null },
        ],
        skillLadders: [{ skill: "Delegation", steps: ["Step one.", "Step two."] }],
        note: "Fixture pathway note.",
      })),
    run: async () => {
      const { container } = mount(<PathwayPage />)
      await settle()
      return container
    },
  },
  {
    name: "pathway-empty",
    run: async () => {
      const { container } = mount(<PathwayPage />)
      await settle()
      return container
    },
  },

  // ── Gaps and Coach (import-path change only) ──
  {
    name: "gaps-full",
    run: async () => {
      const { container } = mount(<GapsPage />)
      await settle()
      return container
    },
  },
  {
    name: "coach-default",
    run: async () => {
      const { container } = mount(<CoachPage />)
      await settle()
      return container
    },
  },
]

describe("FIT-5a golden DOM + request log (recorded on the base sha)", () => {
  test.each(CASES.map((c) => [c.name, c] as const))("%s", async (name, c) => {
    c.setup?.()
    const container = await c.run()
    compare(name, container.innerHTML)
  })

  test("every golden on disk has a case (no orphaned proof)", () => {
    if (WRITE) return
    const names = new Set(CASES.map((c) => c.name))
    const files = fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith(".html"))
    expect(files.length).toBe(CASES.length)
    for (const f of files) expect(names.has(f.replace(/\.html$/, ""))).toBe(true)
  })
})
