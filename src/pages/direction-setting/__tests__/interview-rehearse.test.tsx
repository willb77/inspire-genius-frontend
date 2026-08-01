import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import type { FitDetail, FitMatch } from "@/types/job-fit"
import type { InterviewGuide } from "@/types/job-blueprint"

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "cand-1", email: "someone@example.com" } }),
}))

const mockUseFitMatches = jest.fn()
const mockUseFitDetail = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  useFitMatches: () => mockUseFitMatches(),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: (id?: string) => mockUseFitDetail(id),
}))

const mockGenerateMutate = jest.fn()
const mockUseInterviewGuide = jest.fn()
const mockGenerate = jest.fn()
jest.mock("@/hooks/job-blueprint/useScorecard", () => ({
  useInterviewGuide: (jobId: string) => mockUseInterviewGuide(jobId),
  useGenerateInterviewGuide: () => mockGenerate(),
}))

const mockAdvanceMutate = jest.fn()
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useAdvanceJourney: () => ({ mutate: mockAdvanceMutate, isPending: false }),
}))

import InterviewPage from "../InterviewPage"
import RehearsePage from "../RehearsePage"

// ── fixtures ────────────────────────────────────────────────────────────────

const MATCH: FitMatch = {
  jobId: "job-1",
  roleTitle: "Operations Coordinator",
  department: null,
  tier: "professional",
  baseTier: "professional",
  fitBand: "strong",
  totalVariation: 22,
  behaviorVariation: 9,
  aptitudeVariation: 7,
  coreTraitVariation: 6,
  confidence: null,
}

const GUIDE: InterviewGuide = {
  jobId: "job-1",
  candidateId: "cand-1",
  roleTitle: "Operations Coordinator",
  focusDimensions: [
    {
      dimensionId: 4,
      dimensionName: "Coordinating",
      category: "behavior",
      benchmarkScore: 78,
      candidateScore: 61,
      gap: -17,
      questions: ["Walk me through how you keep several workstreams moving."],
    },
  ],
  counterProductiveQuestions: [
    {
      dimensionName: "Impatience",
      questions: ["When has moving fast cost you something?"],
    },
  ],
  generalQuestions: ["Why this role?"],
  generatedAt: "2026-07-30T00:00:00Z",
}

const DETAIL: FitDetail = {
  jobId: "job-1",
  roleTitle: "Operations Coordinator",
  tier: "professional",
  baseTier: "professional",
  totalVariation: 22,
  perDimension: [],
  criticalGaps: [],
  coachingGaps: [],
  overdoneFlags: [],
  interviewSelfAdvocacy: ["You hold detail well under load — say so with an example."],
  methodologyNote: "",
}

const withMatches = (list: FitMatch[]) =>
  mockUseFitMatches.mockReturnValue({
    data: list,
    isLoading: false,
    isError: false,
  })

function renderPage(el: React.ReactElement) {
  return render(<MemoryRouter>{el}</MemoryRouter>)
}

beforeEach(() => {
  jest.clearAllMocks()
  withMatches([MATCH])
  mockUseFitDetail.mockReturnValue({ data: DETAIL, isLoading: false, isError: false })
  mockUseInterviewGuide.mockReturnValue({ data: undefined, isLoading: false })
  mockGenerate.mockReturnValue({
    mutate: mockGenerateMutate,
    reset: jest.fn(),
    data: undefined,
    isPending: false,
    isError: false,
  })
})

// ── InterviewPage ───────────────────────────────────────────────────────────

describe("InterviewPage — no target role", () => {
  beforeEach(() => withMatches([]))

  it("explains honestly instead of fabricating a guide", () => {
    renderPage(<InterviewPage />)
    expect(screen.getByText(/no role to prepare for yet/i)).toBeInTheDocument()
    expect(screen.getByText(/comes from your job matches/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/What.re most likely to dig into/)
    ).not.toBeInTheDocument()
  })

  it("does not imply the user did something wrong", () => {
    renderPage(<InterviewPage />)
    expect(screen.getByText(/isn.t anything you did wrong/i)).toBeInTheDocument()
  })

  it("routes to the matches stage", () => {
    renderPage(<InterviewPage />)
    fireEvent.click(screen.getByRole("button", { name: /Go to job matches/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/matches")
  })
})

describe("InterviewPage — with a target role", () => {
  it("offers to build a prep sheet before one exists", () => {
    renderPage(<InterviewPage />)
    expect(screen.getByText("Operations Coordinator")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Build my prep sheet/ })
    ).toBeInTheDocument()
  })

  it("generates for this candidate and records the stage", () => {
    renderPage(<InterviewPage />)
    fireEvent.click(screen.getByRole("button", { name: /Build my prep sheet/ }))
    expect(mockGenerateMutate).toHaveBeenCalledWith(
      { jobId: "job-1", candidateId: "cand-1" },
      expect.anything()
    )
  })

  it("renders gap-derived questions and the self-advocacy lines together", () => {
    mockGenerate.mockReturnValue({
      mutate: mockGenerateMutate,
      reset: jest.fn(),
      data: GUIDE,
      isPending: false,
      isError: false,
    })
    renderPage(<InterviewPage />)
    expect(
      screen.getByText("Walk me through how you keep several workstreams moving.")
    ).toBeInTheDocument()
    expect(screen.getByText("When has moving fast cost you something?")).toBeInTheDocument()
    expect(screen.getByText("Why this role?")).toBeInTheDocument()
    expect(
      screen.getByText(/You hold detail well under load/)
    ).toBeInTheDocument()
  })

  it("ignores a fetched guide belonging to a different candidate", () => {
    mockUseInterviewGuide.mockReturnValue({
      data: { ...GUIDE, candidateId: "someone-else" },
      isLoading: false,
    })
    renderPage(<InterviewPage />)
    expect(
      screen.queryByText("Walk me through how you keep several workstreams moving.")
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Build my prep sheet/ })
    ).toBeInTheDocument()
  })

  it("uses a fetched guide when it is this candidate's", () => {
    mockUseInterviewGuide.mockReturnValue({ data: GUIDE, isLoading: false })
    renderPage(<InterviewPage />)
    expect(
      screen.getByText("Walk me through how you keep several workstreams moving.")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Rebuild/ })).toBeInTheDocument()
  })
})

// ── RehearsePage ────────────────────────────────────────────────────────────

describe("RehearsePage", () => {
  it("says plainly that rehearsal is not switched on yet", () => {
    renderPage(<RehearsePage />)
    expect(screen.getByText(/Rehearsal isn.t switched on yet\./)).toBeInTheDocument()
  })

  it("tells the user the step is optional", () => {
    renderPage(<RehearsePage />)
    expect(screen.getByText(/This step is optional\./)).toBeInTheDocument()
    expect(screen.getByText(/doesn.t leave a hole in anything/)).toBeInTheDocument()
  })

  it("labels the preview as an example, not the user's own answers", () => {
    renderPage(<RehearsePage />)
    expect(
      screen.getByText(/Example only — not your answers, and not switched on yet\./)
    ).toBeInTheDocument()
  })

  it("keeps the answer box inert while there is no backend", () => {
    renderPage(<RehearsePage />)
    expect(screen.getByLabelText("Your answer")).toBeDisabled()
    expect(screen.getByRole("button", { name: /Try this answer/ })).toBeDisabled()
  })

  it("marks the stage skipped — not complete — when the user passes on it", () => {
    renderPage(<RehearsePage />)
    fireEvent.click(screen.getByRole("button", { name: /Skip this step/ }))
    expect(mockAdvanceMutate).toHaveBeenCalledWith(
      { stageId: "12", state: "skipped" },
      expect.anything()
    )
  })

  it("sends the user back to the prep sheet, which does have the questions", () => {
    renderPage(<RehearsePage />)
    fireEvent.click(screen.getByRole("button", { name: /Back to interview prep/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/interview")
  })
})
