/**
 * @jest-environment jsdom
 *
 * FIT-3 — Overall fit beside the PRISM fit, on Career Fit's My fit list and the
 * role's detail card only. Pins (each names the mutation that turns it red):
 *  - Overall fit shows only when the server answers in that shape; otherwise
 *    the page is today's page (the composite path is untouched);
 *  - the list is ordered by Overall fit by default, one click gives PRISM fit,
 *    rows with no Overall fit go after the scored ones (owner, Q1: option A);
 *  - the D4 method reads "PRISM closeness" (owner, Q2);
 *  - the order is the browser's: the server is never asked for it;
 *  - the detail card names every signal, its weight, and why one is absent;
 *  - no manager or candidate surface reads Overall fit.
 */
import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { FitComponentsResponse, JobOverall } from "@/types/job-fit/components"
import type { FitMatch } from "@/types/job-fit"

const mockSwitch = jest.fn()
const mockGetComponents = jest.fn()
jest.mock("@/services/switches/jobFitComponents.service", () => ({
  getJobFitComponentsEnabled: () => mockSwitch(),
}))
jest.mock("@/services/job-fit/components.service", () => ({
  getFitComponents: (...a: unknown[]) => mockGetComponents(...a),
  getGoalsWiring: jest.fn(),
}))
const mockUseFitMatches = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  useFitMatches: (...a: unknown[]) => mockUseFitMatches(...a),
}))
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useFitHistory: () => ({ data: [], isLoading: false, isError: false }),
  useSaveFitReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useFitSnapshot: () => ({ data: undefined, isLoading: false, isError: false }),
}))

import MatchesPage from "../MatchesPage"
import { FitComponentsCard } from "../FitComponentsCard"
import { orderRows } from "@/components/fit/components"

const base: FitMatch = {
  jobId: "j", roleTitle: "Role", department: null, tier: "strong-fit", baseTier: "strong-fit",
  fitBand: "strong", totalVariation: 14, behaviorVariation: 8, aptitudeVariation: 12,
  coreTraitVariation: 20, confidence: 0.8, fitScore: 70,
}
// Served in PRISM order: the HR SVP's benchmark is closest to this person's PRISM.
const MATCHES: FitMatch[] = [
  { ...base, jobId: "svp-hr", roleTitle: "Senior Vice President Human Resources", fitScore: 88 },
  { ...base, jobId: "no-ov", roleTitle: "Warehouse Coordinator", fitScore: 81 },
  { ...base, jobId: "cio", roleTitle: "Chief Information Officer", fitScore: 76 },
  { ...base, jobId: "cto", roleTitle: "Chief Technology Officer", fitScore: 75 },
]

const goalUnmapped = { status: "unmapped" as const, family: null }
const ov = (score: number | null, prism: number): JobOverall => ({
  status: "ok",
  goalAlignment: goalUnmapped,
  overall: {
    score,
    used: score == null ? ["prism"] : ["function", "prism", "seniority"],
    missing: score == null ? ["function", "seniority", "skills", "goal"] : ["skills", "goal"],
    signals: { prism: { status: "scored", score: prism } },
  },
})

const OVERALL_RESP: FitComponentsResponse = {
  mode: "overall",
  weights: { prism: 30, function: 30, seniority: 15, skills: 15, goal: 10 },
  engineVersion: "job-fit-overall v2",
  benchmarksValidated: false,
  person: {
    function: { status: "classified", primaryFamily: "Data & Quantitative" },
    seniority: { status: "classified", level: 6 },
    classifier: "hit",
    otherAssessments: [{ framework: "DISC", notUsed: "no role mapping" }],
  },
  jobs: {
    "svp-hr": ov(55.2, 88),
    "no-ov": ov(null, 81),
    cio: ov(90.4, 76),
    cto: ov(90.0, 75),
  },
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MatchesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const titles = () =>
  screen
    .getAllByRole("link")
    .map((a) => a.textContent ?? "")
    .filter((t) => /President|Coordinator|Officer/.test(t))
    .map((t) => t.replace(/\d.*$/s, "").trim())

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
  mockSwitch.mockResolvedValue(true)
  mockUseFitMatches.mockReturnValue({ data: MATCHES, isLoading: false, isError: false })
})

describe("My fit with Overall fit on", () => {
  test("default order is Overall fit; the headline is Overall fit with PRISM fit beneath", async () => {
    mockGetComponents.mockResolvedValue(OVERALL_RESP)
    renderPage()
    await screen.findAllByText("Overall fit")
    // Mutation: orderRows returns rows unchanged → the HR SVP stays first → red.
    expect(titles()).toEqual([
      "Chief Information Officer",
      "Chief Technology Officer",
      "Senior Vice President Human Resources",
      "Warehouse Coordinator",
    ])
    const cio = screen.getByText("Chief Information Officer").closest("a")!
    expect(within(cio).getByText("90")).toBeInTheDocument()
    expect(within(cio).getByText("PRISM fit 76%")).toBeInTheDocument()
    expect(screen.queryByText(/composite/i)).not.toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Overall fit" })).toHaveAttribute("aria-checked", "true")
  })

  test("a row with no Overall fit goes last, shows its PRISM fit and says why", async () => {
    mockGetComponents.mockResolvedValue(OVERALL_RESP)
    renderPage()
    await screen.findAllByText("Overall fit")
    const row = screen.getByText("Warehouse Coordinator").closest("a")!
    expect(within(row).getByText("81")).toBeInTheDocument()
    expect(within(row).getByText("PRISM fit")).toBeInTheDocument()
    expect(within(row).getByText(/not enough about you to combine — add a résumé/i)).toBeInTheDocument()
  })

  test("one click gives PRISM order, remembered for this viewer, and no new server read", async () => {
    mockGetComponents.mockResolvedValue(OVERALL_RESP)
    renderPage()
    await screen.findAllByText("Overall fit")
    const fetches = mockGetComponents.mock.calls.length
    fireEvent.click(screen.getByRole("radio", { name: "PRISM fit" }))
    expect(titles()).toEqual([
      "Senior Vice President Human Resources",
      "Warehouse Coordinator",
      "Chief Information Officer",
      "Chief Technology Officer",
    ])
    expect(window.localStorage.getItem("jobfit.listOrder")).toBe("prism")
    // The order is the browser's: the server is asked nothing new, and the
    // fit list is only ever read by method (what a snapshot carries).
    expect(mockGetComponents.mock.calls.length).toBe(fetches)
    for (const call of mockUseFitMatches.mock.calls) expect(call).toEqual(["gap"])
  })

  test("a remembered PRISM order is used on the next visit; broken storage falls back", async () => {
    window.localStorage.setItem("jobfit.listOrder", "prism")
    mockGetComponents.mockResolvedValue(OVERALL_RESP)
    renderPage()
    await screen.findAllByText("Overall fit")
    expect(titles()[0]).toBe("Senior Vice President Human Resources")

    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    try {
      const { unmount } = renderPage()
      await waitFor(() => expect(screen.getAllByRole("radio", { name: "Overall fit" }).length).toBe(2))
      unmount()
    } finally {
      spy.mockRestore()
    }
  })

  test("the D4 method is 'PRISM closeness' — 'Overall' means Overall fit only", async () => {
    mockGetComponents.mockResolvedValue(OVERALL_RESP)
    renderPage()
    await screen.findAllByText("Overall fit")
    expect(screen.getByRole("radio", { name: "PRISM closeness" })).toBeInTheDocument()
    expect(screen.queryByText("Overall closeness")).not.toBeInTheDocument()
  })

  test("no fit tier is shown person-facing (FE #584)", async () => {
    mockGetComponents.mockResolvedValue(OVERALL_RESP)
    renderPage()
    await screen.findAllByText("Overall fit")
    expect(screen.queryByText(/strong fit|strong-fit/i)).not.toBeInTheDocument()
  })
})

describe("Overall fit off: today's page", () => {
  test("a v1 response keeps the composite, the 'fit' label and no order control", async () => {
    mockGetComponents.mockResolvedValue({
      weights: { behavioural: 60, goalAlignment: 25, experienceMatch: 15 },
      engineVersion: "v1",
      jobs: {
        cio: {
          status: "ok", goalAlignment: goalUnmapped, experienceMatch: { status: "no_resume" },
          composite: { score: 61.2, used: ["behavioural", "goalAlignment"], missing: ["experienceMatch"] },
        },
      },
    } satisfies FitComponentsResponse)
    renderPage()
    expect(await screen.findByText("61% composite")).toBeInTheDocument()
    expect(screen.queryByText("Overall fit")).not.toBeInTheDocument()
    expect(screen.queryByRole("radiogroup", { name: "Order by" })).not.toBeInTheDocument()
    expect(titles()[0]).toBe("Senior Vice President Human Resources")   // served order
  })

  test("the components read failing is rendered, and the list stays in PRISM order", async () => {
    mockGetComponents.mockRejectedValue(new Error("500"))
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't read/i)
    expect(titles()[0]).toBe("Senior Vice President Human Resources")
  })
})

describe("orderRows", () => {
  test("ties keep served order; unscored rows keep served order after the scored", () => {
    const rows = [{ jobId: "a" }, { jobId: "b" }, { jobId: "c" }, { jobId: "d" }]
    const jobs = { a: ov(null, 1), b: ov(70, 1), c: ov(70, 1), d: ov(null, 1) }
    expect(orderRows(rows, jobs, "overall").map((r) => r.jobId)).toEqual(["b", "c", "a", "d"])
    expect(orderRows(rows, jobs, "prism")).toBe(rows)
    expect(orderRows(rows, undefined, "overall")).toBe(rows)
  })
})

describe("The Overall fit card (role detail)", () => {
  const job: JobOverall = {
    status: "ok",
    goalAlignment: goalUnmapped,
    overall: {
      score: 90.4,
      used: ["function", "prism", "seniority"],
      missing: ["skills", "goal"],
      signals: {
        prism: { status: "scored", score: 76 },
        function: {
          status: "scored", score: 100, roleFamily: "Data & Quantitative",
          personFamily: "Data & Quantitative", evidence: "Led enterprise technology strategy",
        },
        seniority: {
          status: "scored", score: 100, roleLevel: 6, personLevel: 6,
          evidence: "Chief Information Officer",
        },
        skills: { status: "no_activities" },
        goal: { status: "no_goals" },
      },
    },
  }

  test("every signal: its value and weight, what it rests on, or why it is absent", () => {
    render(
      <FitComponentsCard
        fitPct={76} job={job} weights={OVERALL_RESP.weights} isError={false}
        person={OVERALL_RESP.person} benchmarksValidated={false}
      />,
    )
    expect(screen.getByText("Overall fit: 90%")).toBeInTheDocument()
    expect(screen.getByText(/from "Led enterprise technology strategy"/)).toBeInTheDocument()
    expect(screen.getByText(/highest you've held is VP \/ chief \("Chief Information Officer"\)/)).toBeInTheDocument()
    expect(screen.getByText("76% · weight 30")).toBeInTheDocument()
    expect(screen.getAllByText("not counted · weight 15").length).toBe(1)
    expect(screen.getByText(/doesn't list its critical activities/i)).toBeInTheDocument()
    expect(screen.getByText(/haven't published any goals/i)).toBeInTheDocument()
    expect(screen.getByText(/never counted as zero/i)).toBeInTheDocument()
    expect(screen.getByText(/not yet validated/i)).toBeInTheDocument()
    expect(screen.getByText(/other assessments not used: DISC — no role mapping/i)).toBeInTheDocument()
    expect(screen.queryByText(/composite/i)).not.toBeInTheDocument()
  })

  test("not set up on this tier: the PRISM fit is the read, and nothing is invented", () => {
    const notSetUp: JobOverall = {
      ...job,
      overall: { score: null, used: [], missing: ["prism", "function", "seniority", "skills", "goal"],
                 status: "not_set_up", signals: { prism: { status: "scored", score: 76 } } },
    }
    render(<FitComponentsCard fitPct={76} job={notSetUp} weights={OVERALL_RESP.weights} isError={false} />)
    expect(screen.getByText(/isn't set up on this service yet/i)).toBeInTheDocument()
    expect(screen.getAllByRole("listitem").length).toBe(1)
  })

  test("a failed read is an alert, as before", () => {
    render(<FitComponentsCard fitPct={76} job={undefined} weights={undefined} isError />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })
})

// ── UGESP: no manager or candidate surface reads Overall fit (CSA §1f U2, U5) ──

const SRC = join(__dirname, "..", "..", "..")
function filesUnder(rel: string): string[] {
  const root = join(SRC, rel)
  const st = statSync(root)
  if (st.isFile()) return [root]
  return readdirSync(root).flatMap((n) => {
    const p = join(root, n)
    if (n === "__tests__") return []
    return statSync(p).isDirectory() ? filesUnder(join(rel, n)) : /\.tsx?$/.test(n) ? [p] : []
  })
}

test("manager- and candidate-facing fit surfaces never read Overall fit", () => {
  const surfaces = [
    "components/manager/development",          // U2: roster card, Careers tab
    "pages/manager/development",                // U2: studio sort, workspace
    "lib/dossierPdf.ts",                       // U2: dossier PDF
    "components/job-blueprint/triage",         // U5: comparison, analysis, insight
    "pages/job-blueprint",                     // U5: candidate pages
  ]
  const files = surfaces.flatMap(filesUnder)
  // The populated control: an assertion over no files would always pass.
  expect(files.length).toBeGreaterThan(20)
  const marker = /useFitComponents|components\.service|job-fit\/components|OverallFitCard|asOverall|orderRows|\boverall_fit\b/
  const hits = files.filter((f) => marker.test(readFileSync(f, "utf8")))
  // Mutation: import useFitComponents in MemberCard.tsx → red.
  expect(hits).toEqual([])
})
