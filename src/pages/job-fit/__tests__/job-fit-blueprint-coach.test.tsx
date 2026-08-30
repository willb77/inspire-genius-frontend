import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import CoachPage from "../CoachPage"
import FitNav from "../FitNav"
import { JOB_FIT_QUESTION_GROUPS, withRole } from "@/constants/job-fit/coachingQuestions"
import { listEntitledVerticals, useEnabledVerticals } from "@/verticals/core"
import type { FitDetail, FitMatch } from "@/types/job-fit"

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

// Coaching now answers INLINE via the fit hooks (not saved-roles → Meridian).
const mockUseFitMatches = jest.fn()
const mockUseFitDetail = jest.fn()
const mockMutateAsync = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({ useFitMatches: () => mockUseFitMatches() }))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({ useFitDetail: (id?: string) => mockUseFitDetail(id) }))
jest.mock("@/hooks/job-fit/useExplainFit", () => ({
  useExplainFit: () => ({ mutateAsync: mockMutateAsync, isPending: false, data: undefined }),
}))

// The vertical registry is populated by importing the manifests barrel for its
// side effect, which a bare component test doesn't do — so the filter is stubbed.
jest.mock("@/verticals/core", () => ({
  ...jest.requireActual("@/verticals/core"),
  useEnabledVerticals: jest.fn(),
  listEntitledVerticals: jest.fn(),
}))

const mockEnabled = useEnabledVerticals as jest.MockedFunction<typeof useEnabledVerticals>
const mockListEntitled = listEntitledVerticals as jest.MockedFunction<typeof listEntitledVerticals>


const MATCH: FitMatch = {
  jobId: "j1", roleTitle: "Director of Operations", department: null,
  tier: "professional", baseTier: "professional", fitBand: "strong",
  totalVariation: 20, behaviorVariation: 8, aptitudeVariation: 6,
  coreTraitVariation: 6, confidence: null,
}
const DETAIL: FitDetail = {
  jobId: "j1", roleTitle: "Director of Operations", tier: "professional",
  baseTier: "professional", totalVariation: 20, fitScore: 91,
  perDimension: [
    { category: "behavior", dimensionId: 4, dimensionName: "Coordinating", candidateScore: 70, benchmarkScore: 78, gap: -8, coaching: "x" },
  ],
  criticalGaps: [], coachingGaps: [{ dimensionName: "Coordinating", category: "behavior", gap: -8 }],
  overdoneFlags: [], interviewSelfAdvocacy: [], methodologyNote: "",
}

const withMatches = (list: FitMatch[]) =>
  mockUseFitMatches.mockReturnValue({ data: list, isLoading: false, isError: false })

const renderPage = () =>
  render(
    <MemoryRouter>
      <CoachPage />
    </MemoryRouter>
  )

beforeEach(() => {
  mockEnabled.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useEnabledVerticals>)
  mockListEntitled.mockReturnValue([])
  // default: role loaded only when an id is passed
  mockUseFitDetail.mockImplementation((id?: string) => ({
    data: id ? DETAIL : undefined, isLoading: false, isError: false,
  }))
})
afterEach(() => jest.clearAllMocks())

// ── The question library ─────────────────────────────────────────────

describe("Job-Fit coaching questions", () => {
  test("has the five requested categories", () => {
    expect(JOB_FIT_QUESTION_GROUPS.map((g) => g.key)).toEqual([
      "fit", "gaps", "closing", "goals", "interview",
    ])
  })

  test("ten questions per category", () => {
    for (const g of JOB_FIT_QUESTION_GROUPS) {
      expect(g.questions).toHaveLength(10)
    }
  })

  test("every question is anchored to the selected role", () => {
    for (const g of JOB_FIT_QUESTION_GROUPS) {
      for (const q of g.questions) {
        expect(q).toContain("{role}")
      }
    }
  })

  test("withRole interpolates every occurrence", () => {
    expect(withRole("Is {role} right, and why {role}?", "CIO")).toBe("Is CIO right, and why CIO?")
  })

  test("withRole degrades readably when no role is chosen", () => {
    expect(withRole("Am I ready for {role}?", "  ")).toBe("Am I ready for this role?")
  })
})

// ── The page (now answers INLINE) ─────────────────────────────────────

describe("CoachPage", () => {
  test("points to matches when the user has no matched roles", () => {
    withMatches([])
    renderPage()
    expect(screen.getByText("No matched roles yet.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /See your role matches/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/job-fit/matches")
  })

  test("picking a question answers it INLINE (not by navigating away)", async () => {
    withMatches([MATCH])
    renderPage()
    fireEvent.change(screen.getByLabelText("Which role are we talking about?"), {
      target: { value: "j1" },
    })
    const first = JOB_FIT_QUESTION_GROUPS[0].questions[0]
    mockMutateAsync.mockResolvedValueOnce({
      overview: "", gaps: [], closingActions: [], answer: "Here's how you line up.", fitScore: 91, disclaimer: "",
    })
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: first } })

    // answer renders inline; no navigation to Meridian
    await waitFor(() => expect(screen.getByText("Here's how you line up.")).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalledWith("/meridian/chat", expect.anything())
    // the interpolated question is echoed on-page (appears both as the <option>
    // and in the answer history → at least two matches)
    expect(screen.getAllByText(withRole(first, "Director of Operations")).length).toBeGreaterThanOrEqual(2)
  })

  test("questions stay disabled until a role is chosen", () => {
    withMatches([MATCH])
    renderPage()
    expect(screen.getByLabelText("Question")).toBeDisabled()
  })

  test("a custom question is answered inline about the selected role", async () => {
    withMatches([MATCH])
    renderPage()
    fireEvent.change(screen.getByLabelText("Which role are we talking about?"), {
      target: { value: "j1" },
    })
    mockMutateAsync.mockResolvedValueOnce({
      overview: "", gaps: [], closingActions: [], answer: "Surprising strength: coordination.", fitScore: 91, disclaimer: "",
    })
    fireEvent.change(screen.getByLabelText("Or ask your own"), {
      target: { value: "What would surprise me about {role}?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Answer here/ }))
    await waitFor(() =>
      expect(screen.getByText("Surprising strength: coordination.")).toBeInTheDocument()
    )
  })

  test("Open in Meridian remains as a secondary path", () => {
    withMatches([MATCH])
    renderPage()
    fireEvent.change(screen.getByLabelText("Which role are we talking about?"), {
      target: { value: "j1" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Open in Meridian/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/meridian/chat", expect.objectContaining({
      state: expect.objectContaining({ autoSubmit: true }),
    }))
  })

  test("switching category swaps the question set", () => {
    withMatches([MATCH])
    renderPage()
    fireEvent.change(screen.getByLabelText("What do you want to work on?"), {
      target: { value: "interview" },
    })
    expect(screen.getByText("Getting ready to be asked about it out loud.")).toBeInTheDocument()
  })
})

// ── Navigation (item #5) ─────────────────────────────────────────────

describe("FitNav", () => {
  const renderNav = () =>
    render(
      <MemoryRouter>
        <FitNav />
      </MemoryRouter>
    )

  test("links every Job-Fit tool", () => {
    renderNav()
    for (const label of ["My fit", "Gaps", "Pathway", "Blueprint a role", "Coaching"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument()
    }
  })

  test("no longer shows the cross-vertical row (removed per request)", () => {
    // Even when the user is entitled to other verticals, the "Back to Inspire
    // Genius" / "or switch to <vertical>" row is gone; the pills are all that
    // remain.
    mockEnabled.mockReturnValue({
      data: ["job-fit", "lumen"],
    } as unknown as ReturnType<typeof useEnabledVerticals>)
    mockListEntitled.mockReturnValue([
      { key: "lumen", title: "Lumen", routePrefix: "/vertical/lumen", homePath: "/vertical/lumen/dashboard" },
    ] as unknown as ReturnType<typeof listEntitledVerticals>)
    renderNav()
    expect(screen.queryByRole("button", { name: /Back to Inspire Genius/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/or switch to/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Lumen" })).not.toBeInTheDocument()
  })
})
