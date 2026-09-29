/**
 * @jest-environment jsdom
 */

import userEvent from "@testing-library/user-event"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type {
  DimensionBenchmark,
  JobDNA,
  BlueprintStats,
  Candidate,
  InterviewScorecard,
} from "@/types/job-blueprint"

/* ── Router: keep everything real except useNavigate ── */
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

/* ── Wizard: reduce the 6-step flow to a single onSubmit trigger ── */
const SAMPLE_WIZARD = {
  roleTitle: "Engineer",
  department: "Tech",
  tier: "professional" as const,
  behaviors: [] as DimensionBenchmark[],
  aptitudes: [] as DimensionBenchmark[],
  coreTraits: [] as DimensionBenchmark[],
  roleContext: {
    workPressures: [],
    requiredWorkStyles: [],
    environmentalFactors: [],
    culturalFactors: [],
  },
}
jest.mock("@/components/job-blueprint/job-dna/JobDnaWizard", () => ({
  JobDnaWizard: ({ onSubmit }: { onSubmit: (d: typeof SAMPLE_WIZARD) => void }) => (
    <button onClick={() => onSubmit(SAMPLE_WIZARD)}>submit-wizard</button>
  ),
}))

/* ── Auth: the signed-in role decides whether a Live Interview link exists (JS-10/11) ── */
const mockRole = jest.fn<string, []>(() => "manager")
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", role: mockRole() } }),
}))

/* ── Hooks ── */
jest.mock("@/hooks/job-blueprint/useJobDna")
jest.mock("@/hooks/job-blueprint/useTriage")
jest.mock("@/hooks/job-blueprint/useScorecard")
jest.mock("@/hooks/job-blueprint/useAnalytics")

import * as jobDnaHooks from "@/hooks/job-blueprint/useJobDna"
import * as triageHooks from "@/hooks/job-blueprint/useTriage"
import * as scorecardHooks from "@/hooks/job-blueprint/useScorecard"
import * as analyticsHooks from "@/hooks/job-blueprint/useAnalytics"

import JobBlueprintDashboardPage from "../JobBlueprintDashboardPage"
import JobBlueprintAuthoringPage from "../JobBlueprintAuthoringPage"
import JobBlueprintDnaDetailPage from "../JobBlueprintDnaDetailPage"
import JobBlueprintCandidatesPage from "../JobBlueprintCandidatesPage"
import JobBlueprintCandidateDetailPage from "../JobBlueprintCandidateDetailPage"
import JobBlueprintPipelinePage from "../JobBlueprintPipelinePage"
import JobBlueprintScorecardsPage from "../JobBlueprintScorecardsPage"
import JobBlueprintAnalyticsPage from "../JobBlueprintAnalyticsPage"

const bench = (id: number, name: string, category: DimensionBenchmark["category"]): DimensionBenchmark => ({
  dimensionId: id,
  dimensionName: name,
  category,
  rankPosition: id,
  rankPercent: 100 - id * 5,
  rateValue: 8 - id,
  finalBenchmarkPercent: 100 - id * 5,
  interpretation: "natural",
})

const JOB_DNA: JobDNA = {
  id: "j1",
  orgId: "o1",
  roleTitle: "Senior Engineer",
  department: "Engineering",
  tier: "professional",
  status: "active",
  behaviors: Array.from({ length: 8 }, (_, i) => bench(i + 1, `Beh${i + 1}`, "behavior")),
  aptitudes: Array.from({ length: 8 }, (_, i) => bench(i + 1, `Apt${i + 1}`, "aptitude")),
  coreTraits: Array.from({ length: 6 }, (_, i) => bench(i + 1, `Trait${i + 1}`, "core-trait")),
  counterProductiveBehaviors: [],
  roleContext: { workPressures: [], requiredWorkStyles: [], environmentalFactors: [], culturalFactors: [] },
  deliverables: { jobDescription: "", kpis: [], criticalActivities: [], keyInteractions: [] },
  createdBy: "u1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 1,
}

const STATS: BlueprintStats = {
  totalJobDnas: 3,
  activeJobs: 2,
  totalCandidates: 10,
  avgTimeToFill: 25,
  strongFitRate: 40,
  hiresThisMonth: 1,
}

const CANDIDATE: Candidate = {
  id: "cand-1",
  jobId: "j1",
  name: "CAND-R01@BP-PEOPLE-MGR",
  email: "",
  code: "CAND-R01@BP-PEOPLE-MGR",
  status: "classified",
  assessmentId: null,
  prismScores: null,
  variationScores: null,
  classificationTier: "potential-fit",
  scorecardId: null,
  insightPackage: null,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
}

const SCORECARD: InterviewScorecard = {
  id: "sc-1",
  candidateId: "cand-1",
  jobId: "j1",
  interviewerId: "",
  interviewDate: "2026-07-02",
  behaviorScores: [],
  counterProductiveScores: [],
  aptitudeScores: [],
  coreTraitScores: [],
  grandTotal: 41,
  recommendation: "good-alignment",
  notes: "",
  completedAt: "2026-07-02T00:00:00Z",
}

function query<T>(data: T, over: Record<string, unknown> = {}) {
  return { data, isLoading: false, isError: false, refetch: jest.fn(), ...over }
}

function renderPage(ui: React.ReactNode, path = "/x") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
}

beforeEach(() => {
  jest.clearAllMocks()
  // Sensible defaults; individual tests override as needed.
  ;(jobDnaHooks.useJobDnaList as jest.Mock).mockReturnValue(query([JOB_DNA]))
  ;(jobDnaHooks.useJobDnaDetail as jest.Mock).mockReturnValue(query(JOB_DNA))
  ;(jobDnaHooks.useCreateJobDna as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({ ...JOB_DNA, id: "new-id" }),
    isPending: false,
  })
  ;(jobDnaHooks.useFinalizeBenchmark as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(JOB_DNA),
    isPending: false,
  })
  ;(jobDnaHooks.useUpdateJobDna as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(JOB_DNA),
    isPending: false,
  })
  ;(triageHooks.usePipeline as jest.Mock).mockReturnValue(query([]))
  ;(triageHooks.useCandidateDetail as jest.Mock).mockReturnValue(query(CANDIDATE))
  ;(triageHooks.useCandidateInsights as jest.Mock).mockReturnValue(query(undefined))
  ;(triageHooks.useAdvanceCandidate as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  })
  ;(triageHooks.useSubmitIntake as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  })
  ;(scorecardHooks.useInterviewGuide as jest.Mock).mockReturnValue(query(undefined))
  ;(scorecardHooks.useScorecardDetail as jest.Mock).mockReturnValue(
    query(undefined, { isError: true, error: { response: { status: 404 } } })
  )
  ;(scorecardHooks.useScorecardsFor as jest.Mock).mockReturnValue({ scorecards: [], missing: [], pending: false, failed: false })
  ;(scorecardHooks.useScorecardDraft as jest.Mock).mockReturnValue(
    query(undefined, { isError: true, error: { response: { status: 404 } } })
  )
  mockRole.mockReturnValue("manager")
  ;(scorecardHooks.isNoScorecardError as jest.Mock).mockImplementation(
    (err: { response?: { status: number } } | undefined) => err?.response?.status === 404
  )
  ;(scorecardHooks.useSubmitScorecard as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  })
  ;(analyticsHooks.useBlueprintStats as jest.Mock).mockReturnValue(query(STATS))
  ;(analyticsHooks.useBlueprintFunnel as jest.Mock).mockReturnValue(query([]))
  ;(analyticsHooks.useBlueprintAccuracy as jest.Mock).mockReturnValue(query(undefined))
  ;(analyticsHooks.useBlueprintTimeToFill as jest.Mock).mockReturnValue(query([]))
  ;(analyticsHooks.useBlueprintHires as jest.Mock).mockReturnValue(query([]))
  ;(analyticsHooks.useBlueprintActivity as jest.Mock).mockReturnValue(query([]))
})

describe("Dashboard", () => {
  test("lists Job DNAs and shows stats", () => {
    renderPage(<JobBlueprintDashboardPage />)
    expect(screen.getByRole("heading", { name: "Career Blueprint" })).toBeInTheDocument()
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument()
    expect(screen.getByText("Total Job DNAs")).toBeInTheDocument()
  })

  test("empty state offers a create CTA", () => {
    ;(jobDnaHooks.useJobDnaList as jest.Mock).mockReturnValue(query([]))
    renderPage(<JobBlueprintDashboardPage />)
    expect(screen.getByText(/Create your first Job DNA/i)).toBeInTheDocument()
  })
})

describe("Authoring create → benchmark → save → reload", () => {
  test("creates, finalizes the benchmark, then navigates to the detail page", async () => {
    const create = jest.fn().mockResolvedValue({ ...JOB_DNA, id: "new-id" })
    const finalize = jest.fn().mockResolvedValue(JOB_DNA)
    ;(jobDnaHooks.useCreateJobDna as jest.Mock).mockReturnValue({ mutateAsync: create, isPending: false })
    ;(jobDnaHooks.useFinalizeBenchmark as jest.Mock).mockReturnValue({ mutateAsync: finalize, isPending: false })

    renderPage(<JobBlueprintAuthoringPage />)
    // The authoring page lands on a method chooser — pick "Build manually" to
    // reach the wizard.
    fireEvent.click(screen.getByRole("button", { name: /build manually/i }))
    fireEvent.click(screen.getByText("submit-wizard"))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-id", benchmark: expect.any(Object) })
    )
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/vertical/job-blueprint/dna/new-id")
    )
  })
})

describe("DNA detail", () => {
  test("renders the benchmark profile for a role", () => {
    renderPage(
      <Routes>
        <Route path="/vertical/job-blueprint/dna/:id" element={<JobBlueprintDnaDetailPage />} />
      </Routes>,
      "/vertical/job-blueprint/dna/j1"
    )
    expect(screen.getByRole("heading", { name: "Senior Engineer" })).toBeInTheDocument()
    expect(screen.getByText("Benchmark profile")).toBeInTheDocument()
  })
})

describe("Candidates", () => {
  test("prompts to pick a role, then shows the gated empty state", () => {
    renderPage(<JobBlueprintCandidatesPage />)
    expect(screen.getByText(/Select a role to see its candidate roster/i)).toBeInTheDocument()
  })

  test("offers the Add-candidate form and, on an empty pipeline, points at it", async () => {
    renderPage(<JobBlueprintCandidatesPage />)
    expect(screen.getByRole("button", { name: /add candidate/i })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /Job DNA/i }), JOB_DNA.id)
    expect(screen.getByText(/Use .Add candidate. above to put one in/i)).toBeInTheDocument()
  })
})

describe("Candidates → Live Interview (JS-10)", () => {
  async function selectCandidate() {
    ;(triageHooks.usePipeline as jest.Mock).mockReturnValue(query([CANDIDATE]))
    renderPage(<JobBlueprintCandidatesPage />)
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /Job DNA/i }), JOB_DNA.id)
    await userEvent.click(screen.getByText(CANDIDATE.name))
  }

  test("a manager gets 'Interview this candidate', deep-linked with both ids", async () => {
    await selectCandidate()
    const link = screen.getByRole("link", { name: /interview this candidate/i })
    expect(link).toHaveAttribute("href", "/manager/interview-live?blueprintId=j1&candidateId=cand-1")
    // The existing detail link is untouched.
    expect(screen.getByRole("link", { name: /open candidate/i })).toHaveAttribute(
      "href",
      "/vertical/job-blueprint/candidates/cand-1"
    )
  })

  test("a practitioner is sent to their own Live Interview page", async () => {
    mockRole.mockReturnValue("practitioner")
    await selectCandidate()
    expect(screen.getByRole("link", { name: /interview this candidate/i })).toHaveAttribute(
      "href",
      "/practitioner/interview-live?blueprintId=j1&candidateId=cand-1"
    )
  })

  test("a role with no Live Interview page gets no link — not a link that 404s", async () => {
    mockRole.mockReturnValue("company-admin")
    await selectCandidate()
    expect(screen.queryByRole("link", { name: /interview this candidate/i })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /open candidate/i })).toBeInTheDocument()
  })
})

describe("Scorecards — draft from a finalised interview (JS-11)", () => {
  const DRAFT = {
    id: "d-1",
    candidateId: "cand-1",
    jobId: "j1",
    interviewerId: "",
    interviewDate: "2026-09-28",
    behaviorScores: [{ dimensionId: 1, dimensionName: "Beh1", score: 3 as const, evidence: "" }],
    counterProductiveScores: [],
    aptitudeScores: [{ dimensionId: 2, dimensionName: "Apt2", score: 5 as const, evidence: "" }],
    coreTraitScores: [],
    notes: "Drafted from a finalised interview session.",
    status: "draft",
    interviewSessionId: "sess-77",
    createdAt: "2026-09-28T10:00:00Z",
  }

  function pickCandidate() {
    ;(triageHooks.usePipeline as jest.Mock).mockReturnValue(query([CANDIDATE]))
    renderPage(<JobBlueprintScorecardsPage />)
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "j1" } })
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "cand-1" } })
  }

  test("shows the draft with its coverage and a link back to the session", () => {
    ;(scorecardHooks.useScorecardDraft as jest.Mock).mockReturnValue(query(DRAFT))
    pickCandidate()
    expect(scorecardHooks.useScorecardDraft).toHaveBeenLastCalledWith("cand-1")
    const card = screen.getByTestId("scorecard-draft-card")
    expect(card).toHaveTextContent(/Draft from a finalised interview/i)
    expect(card).toHaveTextContent(/2 dimensions scored/i)
    expect(card).toHaveTextContent(/not yet submitted/i)
    expect(screen.getByRole("link", { name: /open the interview/i })).toHaveAttribute(
      "href",
      "/manager/interview-live?session=sess-77"
    )
  })

  test("without a Live Interview page for the role, names the session instead of linking", () => {
    mockRole.mockReturnValue("company-admin")
    ;(scorecardHooks.useScorecardDraft as jest.Mock).mockReturnValue(query(DRAFT))
    pickCandidate()
    expect(screen.queryByRole("link", { name: /open the interview/i })).not.toBeInTheDocument()
    expect(screen.getByTestId("scorecard-draft-card")).toHaveTextContent(/Interview session sess-77/i)
  })

  test("a 404 is the honest 'no draft yet' state, not an error", () => {
    pickCandidate()
    expect(screen.getByTestId("scorecard-draft-none")).toHaveTextContent(/No finalised interview has written a draft/i)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  test("any other failure is said out loud", () => {
    ;(scorecardHooks.useScorecardDraft as jest.Mock).mockReturnValue(
      query(undefined, { isError: true, error: { response: { status: 500 } } })
    )
    pickCandidate()
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not check for an interview draft/i)
  })

  test("asks for nothing until a candidate is chosen", () => {
    renderPage(<JobBlueprintScorecardsPage />)
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "j1" } })
    expect(scorecardHooks.useScorecardDraft).toHaveBeenLastCalledWith("")
    expect(screen.queryByTestId("scorecard-draft-none")).not.toBeInTheDocument()
  })
})

describe("Pipeline", () => {
  test("renders the role picker heading", () => {
    renderPage(<JobBlueprintPipelinePage />)
    expect(screen.getByRole("heading", { name: "Pipeline" })).toBeInTheDocument()
    expect(screen.getByText(/Select a role to see its pipeline/i)).toBeInTheDocument()
  })
})

describe("Scorecards", () => {
  test("renders the role picker heading", () => {
    renderPage(<JobBlueprintScorecardsPage />)
    expect(screen.getByRole("heading", { name: "Scorecards" })).toBeInTheDocument()
  })
})

describe("Analytics", () => {
  test("renders stats grid from the live stats read", () => {
    renderPage(<JobBlueprintAnalyticsPage />)
    expect(screen.getByRole("heading", { name: "Analytics" })).toBeInTheDocument()
    expect(screen.getByText("Total Job DNAs")).toBeInTheDocument()
  })

  test("renders the accuracy read as the backend's object — distribution plus the pending note", () => {
    ;(analyticsHooks.useBlueprintAccuracy as jest.Mock).mockReturnValue(
      query({
        distribution: [
          { period: "2026-07", strongFit: 25, potentialFit: 25, moderateFit: 10, misalignment: 36, total: 96 },
        ],
        pendingOutcomeData: true,
        note: "Predicted classification distribution only — no outcome data exists yet.",
      })
    )
    renderPage(<JobBlueprintAnalyticsPage />)
    expect(screen.getByText("Predicted fit distribution")).toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent("no outcome data exists yet")
    expect(screen.queryByText("No accuracy data yet.")).not.toBeInTheDocument()
  })

  test("no accuracy body at all → the empty state", () => {
    renderPage(<JobBlueprintAnalyticsPage />)
    expect(screen.getByText("No accuracy data yet.")).toBeInTheDocument()
  })
})

// ── JS-4 — candidate detail, scorecard comparison, hires + activity panels ──

describe("Candidate detail", () => {
  function renderDetail() {
    return render(
      <MemoryRouter initialEntries={["/vertical/job-blueprint/candidates/cand-1"]}>
        <Routes>
          <Route path="/vertical/job-blueprint/candidates/:candidateId" element={<JobBlueprintCandidateDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  test("shows the blind code as the title, never a name field, and the honest states", () => {
    renderDetail()
    expect(screen.getByRole("heading", { name: "Candidate CAND-R01@BP-PEOPLE-MGR" })).toBeInTheDocument()
    expect(screen.getByText(/identity is held in the blind map/i)).toBeInTheDocument()
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument()
    expect(screen.getByText(/has not been fit-scored yet/i)).toBeInTheDocument()
    expect(screen.getByText(/No insight package has been generated/i)).toBeInTheDocument()
    expect(screen.getByText(/No interview scorecard has been submitted/i)).toBeInTheDocument()
    // reads went to the hooks with the route's id
    expect(triageHooks.useCandidateDetail).toHaveBeenCalledWith("cand-1")
    expect(scorecardHooks.useScorecardDetail).toHaveBeenCalledWith("cand-1")
  })

  test("renders the submitted scorecard's evidence summary when one exists", () => {
    ;(scorecardHooks.useScorecardDetail as jest.Mock).mockReturnValue(query(SCORECARD))
    renderDetail()
    expect(screen.getByText("41")).toBeInTheDocument()
    expect(screen.getByText("Good alignment, with development areas")).toBeInTheDocument()
  })

  test("a non-404 scorecard failure is an error, not the empty state", () => {
    ;(scorecardHooks.useScorecardDetail as jest.Mock).mockReturnValue(
      query(undefined, { isError: true, error: { response: { status: 500 } } })
    )
    renderDetail()
    expect(screen.getByText(/Failed to load the scorecard/i)).toBeInTheDocument()
    expect(screen.queryByText(/No interview scorecard has been submitted/i)).not.toBeInTheDocument()
  })

  test("advance reuses useAdvanceCandidate; a terminal step disables it", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ ...CANDIDATE, status: "insights-delivered" })
    ;(triageHooks.useAdvanceCandidate as jest.Mock).mockReturnValue({ mutateAsync, isPending: false })
    renderDetail()
    fireEvent.click(screen.getByRole("button", { name: /advance to next stage/i }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("cand-1"))
  })

  test("hired → nothing to advance to", () => {
    ;(triageHooks.useCandidateDetail as jest.Mock).mockReturnValue(query({ ...CANDIDATE, status: "hired" }))
    renderDetail()
    expect(screen.getByRole("button", { name: /pipeline complete/i })).toBeDisabled()
  })

  test("load failure → error with a way back", () => {
    ;(triageHooks.useCandidateDetail as jest.Mock).mockReturnValue(query(undefined, { isError: true }))
    renderDetail()
    expect(screen.getByText(/Failed to load this candidate/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /back to candidates/i })).toHaveAttribute("href", "/vertical/job-blueprint/candidates")
  })
})

describe("Pipeline → candidate detail", () => {
  test("clicking a card navigates to the candidate's page", () => {
    ;(triageHooks.usePipeline as jest.Mock).mockReturnValue(query([CANDIDATE]))
    renderPage(<JobBlueprintPipelinePage />)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "j1" } })
    fireEvent.click(screen.getAllByText("CAND-R01@BP-PEOPLE-MGR")[0])
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/job-blueprint/candidates/cand-1")
  })
})

describe("Scorecards comparison", () => {
  function pickRole() {
    renderPage(<JobBlueprintScorecardsPage />)
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "j1" } })
  }

  test("no submitted scorecards → the honest empty state", () => {
    ;(triageHooks.usePipeline as jest.Mock).mockReturnValue(query([CANDIDATE]))
    pickRole()
    expect(screen.getByText(/No submitted scorecards for this role yet/i)).toBeInTheDocument()
  })

  test("candidates with a scorecard are offered; selecting two renders the comparison", () => {
    const a = { ...CANDIDATE, id: "cand-1", code: "A-1", name: "A-1", scorecardId: "sc-1" }
    const b = { ...CANDIDATE, id: "cand-2", code: "B-2", name: "B-2", scorecardId: "sc-2" }
    const c = { ...CANDIDATE, id: "cand-3", code: "C-3", name: "C-3", scorecardId: null }
    ;(triageHooks.usePipeline as jest.Mock).mockReturnValue(query([a, b, c]))
    ;(scorecardHooks.useScorecardsFor as jest.Mock).mockImplementation((ids: string[]) => ({
      scorecards: ids.map((id, i) => ({ ...SCORECARD, id: `sc-${id}`, candidateId: id, grandTotal: 48 - i * 10 })),
      missing: [],
      pending: false,
      failed: false,
    }))
    pickRole()
    // only the two with a scorecardId are offered
    expect(screen.getByRole("checkbox", { name: "Compare A-1" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Compare B-2" })).toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: "Compare C-3" })).not.toBeInTheDocument()
    expect(screen.getByText(/Select candidates to compare/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("checkbox", { name: "Compare A-1" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Compare B-2" }))
    expect(scorecardHooks.useScorecardsFor).toHaveBeenLastCalledWith(["cand-1", "cand-2"])
    expect(screen.getByText("Scorecard Comparison")).toBeInTheDocument()
    expect(screen.getByText("48/55")).toBeInTheDocument()
    expect(screen.getByText("38/55")).toBeInTheDocument()
  })

  test("a fifth candidate cannot be added", () => {
    const five = [1, 2, 3, 4, 5].map((n) => ({ ...CANDIDATE, id: `c${n}`, code: `K-${n}`, name: `K-${n}`, scorecardId: `s${n}` }))
    ;(triageHooks.usePipeline as jest.Mock).mockReturnValue(query(five))
    pickRole()
    for (const n of [1, 2, 3, 4]) fireEvent.click(screen.getByRole("checkbox", { name: `Compare K-${n}` }))
    expect(screen.getByRole("checkbox", { name: "Compare K-5" })).toBeDisabled()
  })
})

describe("Analytics — hires and activity", () => {
  test("both panels render their honest empty states by default", () => {
    renderPage(<JobBlueprintAnalyticsPage />)
    expect(screen.getByText("No hires recorded yet.")).toBeInTheDocument()
    expect(screen.getByText("No activity yet.")).toBeInTheDocument()
  })

  test("rows render the panels", () => {
    ;(analyticsHooks.useBlueprintHires as jest.Mock).mockReturnValue(query([{ period: "2026-07", hires: 2, avgFitScore: 70 }]))
    ;(analyticsHooks.useBlueprintActivity as jest.Mock).mockReturnValue(
      query([{ id: "a1", type: "job-created", description: "Blueprint created for Account Executive", timestamp: "2026-08-02T05:28:12Z" }])
    )
    renderPage(<JobBlueprintAnalyticsPage />)
    expect(screen.getByText("Hires by period")).toBeInTheDocument()
    expect(screen.getByText("Blueprint created for Account Executive")).toBeInTheDocument()
    expect(analyticsHooks.useBlueprintHires).toHaveBeenCalledWith("month")
    expect(analyticsHooks.useBlueprintActivity).toHaveBeenCalledWith(10)
  })
})
