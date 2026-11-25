/**
 * @jest-environment jsdom
 *
 * NP3 — the frontend halves of NP1 (no-PRISM reason, coded 404) and NP2 (the
 * Coach's `degraded` flag). Walk finding F-W3-1: a job-fit user with no PRISM
 * was told "No published roles are available…" with no route to PRISM.
 *
 * Tries to disprove:
 *  - a no-PRISM person still sees the "no published roles" text on the Jobs
 *    list, Growth areas or the Coach, or gets no link to PRISM;
 *  - an empty list WITHOUT the reason (older server, no roles) loses today's text;
 *  - a coded 404 on a job page still says "try again", or the two codes swap;
 *  - an older server's 404 (string detail) or a 5xx changes from today's text;
 *  - a degraded Coach answer is shown as an answer, or shown without role=alert.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { FitDetail, FitMatch } from "@/types/job-fit"

const mockUseFitMatches = jest.fn()
const mockUseFitDetail = jest.fn()
const mockMutateAsync = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  useFitMatches: (...args: unknown[]) => mockUseFitMatches(...args),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({ useFitDetail: (id?: string) => mockUseFitDetail(id) }))
jest.mock("@/hooks/job-fit/useExplainFit", () => ({
  useExplainFit: () => ({ mutateAsync: mockMutateAsync, isPending: false, data: undefined }),
}))
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useFitHistory: () => ({ data: [], isLoading: false, isError: false }),
  useSaveFitReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useFitSnapshot: () => ({ data: undefined, isLoading: false, isError: false }),
}))
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar" />,
}))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { id: "me", role: "user" } }) }))

import MatchesPage from "../MatchesPage"
import GapsPage from "../GapsPage"
import FitDetailPage from "../FitDetailPage"
import CoachPage from "../CoachPage"
import { FitFollowUpCard } from "../FitFollowUpCard"

const NO_ROLES = "No published roles are available to match against yet"
const NO_PRISM_MATCHES = "Your matches appear once your PRISM is on file"
const LOAD_ERROR = "We couldn't load this role's breakdown. Please try again shortly."
const NOT_FOUND = "This job isn't available to you."
const DEGRADED = "The coach couldn't answer just now."

const MATCH: FitMatch = {
  jobId: "j1", roleTitle: "Operations Lead", department: null,
  tier: "strong-fit", baseTier: "strong-fit", fitBand: "strong",
  totalVariation: 20, behaviorVariation: 8, aptitudeVariation: 6,
  coreTraitVariation: 6, confidence: null,
}
const DETAIL: FitDetail = {
  jobId: "j1", roleTitle: "Operations Lead", tier: "strong-fit",
  baseTier: "strong-fit", totalVariation: 20, fitScore: 91,
  perDimension: [
    { category: "behavior", dimensionId: 4, dimensionName: "Coordinating", candidateScore: 70, benchmarkScore: 78, gap: -8, coaching: "x" },
  ],
  criticalGaps: [], coachingGaps: [{ dimensionName: "Coordinating", category: "behavior", gap: -8 }],
  overdoneFlags: [], interviewSelfAdvocacy: [], methodologyNote: "",
}

function matches(list: FitMatch[], emptyReason: "no_prism" | null) {
  mockUseFitMatches.mockReturnValue({
    data: list, isLoading: false, isError: false, gated: false, emptyReason,
  })
}

function renderAt(ui: React.ReactNode, path = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

function prismLink() {
  return screen.getByRole("link", { name: /Go to PRISM/ })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseFitDetail.mockImplementation((id?: string) => ({
    data: id ? DETAIL : undefined, isLoading: false, isError: false, error: null,
  }))
})

describe("Jobs list (MatchesPage, also the Careers and Jobs home)", () => {
  test("no PRISM: says so and links to PRISM; never 'no published roles'", () => {
    matches([], "no_prism")
    const { container } = renderAt(<MatchesPage />)
    expect(container.textContent).toContain(NO_PRISM_MATCHES)
    expect(container.textContent).not.toContain(NO_ROLES)
    expect(prismLink()).toHaveAttribute("href", "/prism-assessment")
  })

  test("empty with no reason (older server, or no roles): today's text, no PRISM link", () => {
    matches([], null)
    const { container } = renderAt(<MatchesPage />)
    expect(container.textContent).toContain(NO_ROLES)
    expect(screen.queryByRole("link", { name: /Go to PRISM/ })).toBeNull()
  })

  test("a non-empty list shows rows, never the no-PRISM state", () => {
    matches([MATCH], null)
    const { container } = renderAt(<MatchesPage />)
    expect(screen.getByText("Operations Lead")).toBeInTheDocument()
    expect(container.textContent).not.toContain(NO_PRISM_MATCHES)
  })
})

describe("Growth areas (GapsPage)", () => {
  test("no PRISM: says so and links to PRISM", () => {
    matches([], "no_prism")
    const { container } = renderAt(<GapsPage />)
    expect(container.textContent).toContain("Growth areas come from your PRISM")
    expect(container.textContent).not.toContain("once roles are available to match against")
    expect(prismLink()).toHaveAttribute("href", "/prism-assessment")
  })

  test("empty with no reason: today's text", () => {
    matches([], null)
    const { container } = renderAt(<GapsPage />)
    expect(container.textContent).toContain("once roles are available to match against")
    expect(screen.queryByRole("link", { name: /Go to PRISM/ })).toBeNull()
  })
})

describe("Job page (FitDetailPage)", () => {
  const at = () =>
    renderAt(
      <Routes>
        <Route path="/vertical/job-fit/fit/:jobId" element={<FitDetailPage />} />
      </Routes>,
      "/vertical/job-fit/fit/j1"
    )
  const failWith = (error: unknown) =>
    mockUseFitDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true, error })
  const http = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } })

  test("404 no_prism: the PRISM state with a link, no 'try again'", () => {
    failWith(http(404, { detail: { code: "no_prism", message: "m" } }))
    const { container } = at()
    expect(container.textContent).toContain("We need your PRISM to show your fit for this job.")
    expect(prismLink()).toHaveAttribute("href", "/prism-assessment")
    expect(container.textContent).not.toContain(LOAD_ERROR)
  })

  test("404 not_found: not available to you, a way back, no PRISM link", () => {
    failWith(http(404, { detail: { code: "not_found", message: "m" } }))
    const { container } = at()
    expect(container.textContent).toContain(NOT_FOUND)
    expect(screen.getByRole("link", { name: "Back to Careers and Jobs" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Go to PRISM/ })).toBeNull()
    expect(container.textContent).not.toContain(LOAD_ERROR)
  })

  test.each([
    ["an older server's string 404", http(404, { detail: "Blueprint not found, not published, or no PRISM assessment on file" })],
    ["an unknown code", http(404, { detail: { code: "something_else" } })],
    ["a 500", http(500, { detail: { code: "no_prism" } })],
    ["a network error", new Error("Network Error")],
  ])("%s keeps today's 'try again' text", (_name, error) => {
    failWith(error)
    const { container } = at()
    expect(container.textContent).toContain(LOAD_ERROR)
    expect(container.textContent).not.toContain(NOT_FOUND)
  })
})

describe("Coach (CoachPage)", () => {
  test("no PRISM: says so and links to PRISM instead of 'No matched roles yet'", () => {
    matches([], "no_prism")
    const { container } = renderAt(<CoachPage />)
    expect(container.textContent).toContain("your fit needs your PRISM")
    expect(container.textContent).not.toContain("No matched roles yet.")
    expect(prismLink()).toHaveAttribute("href", "/prism-assessment")
  })

  test("no roles and no reason: today's text", () => {
    matches([], null)
    renderAt(<CoachPage />)
    expect(screen.getByText("No matched roles yet.")).toBeInTheDocument()
  })

  async function askCustom(res: unknown) {
    matches([MATCH], null)
    renderAt(<CoachPage />)
    fireEvent.change(screen.getByLabelText("Which role are we talking about?"), { target: { value: "j1" } })
    mockMutateAsync.mockResolvedValueOnce(res)
    fireEvent.change(screen.getByLabelText("Or ask your own"), { target: { value: "Where do I start?" } })
    fireEvent.click(screen.getByRole("button", { name: /Answer here/ }))
  }

  test("degraded: an alert, and nothing added to the answers", async () => {
    await askCustom({
      overview: "Canned overview.", gaps: [], closingActions: [], answer: null,
      fitScore: 91, disclaimer: "", degraded: true,
    })
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(DEGRADED)
    expect(screen.queryByText("Canned overview.")).toBeNull()
  })

  test("not degraded: the answer shows, no alert", async () => {
    await askCustom({
      overview: "", gaps: [], closingActions: [], answer: "Start with coordination.",
      fitScore: 91, disclaimer: "", degraded: false,
    })
    expect(await screen.findByText("Start with coordination.")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  test("an older server (no degraded field): today's answer path", async () => {
    await askCustom({
      overview: "", gaps: [], closingActions: [], answer: "Old server answer.", fitScore: 91, disclaimer: "",
    })
    expect(await screen.findByText("Old server answer.")).toBeInTheDocument()
  })

  test("a thrown request: today's error text, as an alert", async () => {
    matches([MATCH], null)
    renderAt(<CoachPage />)
    fireEvent.change(screen.getByLabelText("Which role are we talking about?"), { target: { value: "j1" } })
    mockMutateAsync.mockRejectedValueOnce(new Error("429"))
    fireEvent.change(screen.getByLabelText("Or ask your own"), { target: { value: "Where do I start?" } })
    fireEvent.click(screen.getByRole("button", { name: /Answer here/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't go through")
  })
})

describe("Follow-up card (FitFollowUpCard)", () => {
  async function ask(res: unknown) {
    renderAt(<FitFollowUpCard data={DETAIL} />)
    mockMutateAsync.mockResolvedValueOnce(res)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "What next?" } })
    fireEvent.click(screen.getByRole("button", { name: /Ask/ }))
  }

  test("degraded: an alert, no canned answer, the question kept for a retry", async () => {
    await ask({
      overview: "Canned overview.", gaps: [], closingActions: [], answer: null,
      fitScore: 91, disclaimer: "", degraded: true,
    })
    expect(await screen.findByRole("alert")).toHaveTextContent(DEGRADED)
    expect(screen.queryByText("Canned overview.")).toBeNull()
    expect(screen.getByRole("textbox")).toHaveValue("What next?")
  })

  test("a real answer shows and clears the box", async () => {
    await ask({
      overview: "", gaps: [], closingActions: [], answer: "Practise structured analysis.",
      fitScore: 91, disclaimer: "", degraded: false,
    })
    await waitFor(() => expect(screen.getByText("Practise structured analysis.")).toBeInTheDocument())
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByRole("textbox")).toHaveValue("")
  })

  test("a thrown request: today's error text, as an alert", async () => {
    renderAt(<FitFollowUpCard data={DETAIL} />)
    mockMutateAsync.mockRejectedValueOnce(new Error("boom"))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "What next?" } })
    fireEvent.click(screen.getByRole("button", { name: /Ask/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't go through")
  })
})
