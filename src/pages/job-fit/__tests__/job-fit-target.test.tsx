/**
 * @jest-environment jsdom
 *
 * "Fit a job description" page — the Job-Fit consumer of the neutral D7 target
 * service. Rendered against a mocked `useTargetExtract` so the page + the
 * confidenceTone helper stay covered without hitting the network.
 */
import { render, screen, fireEvent } from "@testing-library/react"

const mockMutate = jest.fn()
let mockIsPending = false
jest.mock("@/hooks/job-fit/useTargetExtract", () => ({
  useTargetExtract: () => ({ mutate: mockMutate, isPending: mockIsPending }),
}))

// JS-5 — the score mutation. `mockScore` is the object the page reads; tests
// flip its state to walk pending / no-PRISM / failure / success.
const mockScoreMutate = jest.fn()
const mockScoreReset = jest.fn()
type ScoreState = {
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error: { response?: { status: number } } | null
  data: FitDetail | undefined
}
let mockScore: ScoreState
jest.mock("@/hooks/job-fit/useScoreTarget", () => ({
  useScoreTarget: () => ({ ...mockScore, mutate: mockScoreMutate, reset: mockScoreReset }),
  isNoPrismError: (err: { response?: { status: number } } | null) => err?.response?.status === 404,
}))

// recharts renders nothing at 0×0 in jsdom; stub the radar so the breakdown renders.
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar" />,
}))

import TargetPreviewPage from "../TargetPreviewPage"
import { confidenceTone } from "../_fit"
import type { TargetDraft } from "@/types/targets"
import { targetDraftToBenchmarks } from "@/types/targets"
import type { FitDetail } from "@/types/job-fit"

const DRAFT: TargetDraft = {
  behaviors: [
    {
      dimensionId: 1,
      dimensionName: "Innovating",
      category: "behavior",
      target: 72,
      confidence: 0.82,
      evidence: "drives new initiatives",
      provenance: "measured",
      interpretation: "very-high",
    },
  ],
  aptitudes: [
    {
      dimensionId: 2,
      dimensionName: "Investigative",
      category: "aptitude",
      target: 60,
      confidence: 0.3,
      evidence: "imputed from role shape",
      provenance: "imputed",
      interpretation: "moderate",
    },
  ],
  coreTraits: [],
  measuredCount: 1,
  imputedCount: 1,
  meanConfidence: 0.6,
  provider: "stub",
  draft: true,
  warnings: [],
  methodologyNote: "Advisory only — not a hiring decision.",
}

const SCORED: FitDetail = {
  jobId: "",
  roleTitle: "This job description",
  // The wire carries the FIT tier here (blueprint-service sets `tier=ev.tier`:
  // strong-fit | potential-fit | moderate-fit | misalignment); the FE type still
  // says JobTier. Cast rather than widen the type inside this change.
  tier: "potential-fit" as FitDetail["tier"],
  baseTier: "potential-fit" as FitDetail["baseTier"],
  totalVariation: 210,
  fitScore: 62,
  perDimension: [
    { category: "behavior", dimensionId: 1, dimensionName: "Innovating", candidateScore: 80, benchmarkScore: 72, gap: 8, coaching: "" },
    { category: "aptitude", dimensionId: 2, dimensionName: "Investigative", candidateScore: 40, benchmarkScore: 60, gap: -20, coaching: "" },
  ],
  criticalGaps: [],
  coachingGaps: [{ dimensionName: "Investigative", category: "aptitude", gap: -20 }],
  overdoneFlags: [],
  interviewSelfAdvocacy: ["Lead with how you generate new approaches."],
  methodologyNote: "Decision support only — not a validated selection instrument.",
}

function idleScore(): ScoreState {
  return { isPending: false, isError: false, isSuccess: false, error: null, data: undefined }
}

/** Render the page with a draft already produced, so the score card is on screen. */
function renderDrafted() {
  mockMutate.mockImplementation((_text: string, opts?: { onSuccess?: (d: TargetDraft) => void }) =>
    opts?.onSuccess?.(DRAFT),
  )
  render(<TargetPreviewPage />)
  fireEvent.change(screen.getByLabelText("Job description"), {
    target: { value: "Lead a support team" },
  })
  fireEvent.click(screen.getByRole("button", { name: /draft the target/i }))
}

beforeEach(() => {
  mockMutate.mockReset()
  mockScoreMutate.mockReset()
  mockScoreReset.mockReset()
  mockIsPending = false
  mockScore = idleScore()
})

describe("TargetPreviewPage", () => {
  it("renders the header and an empty state before extraction", () => {
    render(<TargetPreviewPage />)
    expect(screen.getByRole("heading", { name: /fit a job description/i })).toBeInTheDocument()
    expect(screen.getByText(/drafted target will appear here/i)).toBeInTheDocument()
  })

  it("disables the draft button until a job description is entered", () => {
    render(<TargetPreviewPage />)
    const btn = screen.getByRole("button", { name: /draft the target/i })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "Lead a support team" },
    })
    expect(btn).toBeEnabled()
  })

  it("submits the trimmed JD text to the extract mutation", () => {
    render(<TargetPreviewPage />)
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "  Lead a support team  " },
    })
    fireEvent.click(screen.getByRole("button", { name: /draft the target/i }))
    expect(mockMutate).toHaveBeenCalledWith("Lead a support team", expect.any(Object))
  })

  it("renders the drafted dimensions, summary stats and disclaimer on success", () => {
    // Make the mocked mutate resolve by invoking the success callback.
    mockMutate.mockImplementation((_text: string, opts?: { onSuccess?: (d: TargetDraft) => void }) =>
      opts?.onSuccess?.(DRAFT),
    )
    render(<TargetPreviewPage />)
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "Lead a support team" },
    })
    fireEvent.click(screen.getByRole("button", { name: /draft the target/i }))

    // Grouped dimensions (unique)
    expect(screen.getByText("Innovating")).toBeInTheDocument()
    expect(screen.getByText("Investigative")).toBeInTheDocument()
    // Provenance appears on both the summary stat and the per-dimension pill,
    // by design — assert at least one of each rather than uniqueness.
    expect(screen.getAllByText(/from the jd/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/imputed/i).length).toBeGreaterThanOrEqual(1)
    // Confidence pill on the measured dimension (0.82 → 82%)
    expect(screen.getByText(/82% confidence/i)).toBeInTheDocument()
    // Summary stats + disclaimer (unique)
    expect(screen.getByText(/mean confidence/i)).toBeInTheDocument()
    expect(screen.getByText(/not a hiring decision/i)).toBeInTheDocument()
  })
})

describe("confidenceTone", () => {
  it("maps confidence bands to tones", () => {
    expect(confidenceTone(0.9)).toBe("green")
    expect(confidenceTone(0.6)).toBe("teal")
    expect(confidenceTone(0.3)).toBe("amber")
    expect(confidenceTone(0.1)).toBe("gray")
  })
})

describe("TargetPreviewPage — score my fit (JS-5)", () => {
  it("offers no score button until a target is drafted", () => {
    render(<TargetPreviewPage />)
    expect(screen.queryByRole("button", { name: /score my fit/i })).not.toBeInTheDocument()
  })

  it("drafting resets any earlier score, then the button sends the draft", () => {
    renderDrafted()
    expect(mockScoreReset).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: /score my fit against this target/i }))
    expect(mockScoreMutate).toHaveBeenCalledWith({ draft: DRAFT })
  })

  it("renders the headline and the shared breakdown on success", () => {
    mockScore = { ...idleScore(), isSuccess: true, data: SCORED }
    renderDrafted()
    expect(screen.getByText("Your fit against this target")).toBeInTheDocument()
    expect(screen.getByText("62")).toBeInTheDocument()
    expect(screen.getByText(/^potential fit$/i)).toBeInTheDocument()
    // the same block FitDetailPage renders
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    expect(screen.getByText("Where you stand, dimension by dimension")).toBeInTheDocument()
    expect(screen.getByText("Growth focus")).toBeInTheDocument()
    expect(screen.getByText(/lead with how you generate/i)).toBeInTheDocument()
    expect(screen.getAllByText(/not a validated selection instrument/i).length).toBeGreaterThanOrEqual(1)
  })

  it("no PRISM on file → the honest state, not a score", () => {
    mockScore = { ...idleScore(), isError: true, error: { response: { status: 404 } } }
    renderDrafted()
    expect(screen.getByText(/no prism assessment on file/i)).toBeInTheDocument()
    expect(screen.queryByText("Your fit against this target")).not.toBeInTheDocument()
  })

  it("any other failure → an error, not an empty state", () => {
    mockScore = { ...idleScore(), isError: true, error: { response: { status: 500 } } }
    renderDrafted()
    expect(screen.getByText(/couldn't score your fit/i)).toBeInTheDocument()
    expect(screen.queryByText(/no prism assessment on file/i)).not.toBeInTheDocument()
  })

  it("scoring → a loading state and a disabled button", () => {
    mockScore = { ...idleScore(), isPending: true }
    renderDrafted()
    expect(screen.getByText(/scoring your fit against this target/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /scoring/i })).toBeDisabled()
  })
})

describe("targetDraftToBenchmarks", () => {
  it("carries every drafted dimension, measured and imputed, as a benchmark row", () => {
    expect(targetDraftToBenchmarks(DRAFT)).toEqual([
      { category: "behavior", dimensionId: 1, dimensionName: "Innovating", finalBenchmarkPercent: 72, interpretation: "very-high" },
      { category: "aptitude", dimensionId: 2, dimensionName: "Investigative", finalBenchmarkPercent: 60, interpretation: "moderate" },
    ])
  })
})
