/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type {
  DimensionBenchmark,
  JobDNA,
  BlueprintStats,
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
  ;(triageHooks.useCandidateInsights as jest.Mock).mockReturnValue(query(undefined))
  ;(triageHooks.useAdvanceCandidate as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  })
  ;(scorecardHooks.useInterviewGuide as jest.Mock).mockReturnValue(query(undefined))
  ;(scorecardHooks.useSubmitScorecard as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  })
  ;(analyticsHooks.useBlueprintStats as jest.Mock).mockReturnValue(query(STATS))
  ;(analyticsHooks.useBlueprintFunnel as jest.Mock).mockReturnValue(query([]))
  ;(analyticsHooks.useBlueprintAccuracy as jest.Mock).mockReturnValue(query([]))
  ;(analyticsHooks.useBlueprintTimeToFill as jest.Mock).mockReturnValue(query([]))
})

describe("Dashboard", () => {
  test("lists Job DNAs and shows stats", () => {
    renderPage(<JobBlueprintDashboardPage />)
    expect(screen.getByRole("heading", { name: "Job DNA" })).toBeInTheDocument()
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
})
