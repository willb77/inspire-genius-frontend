import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import CoachPage from "../CoachPage"
import FitNav from "../FitNav"
import { JOB_FIT_QUESTION_GROUPS, withRole } from "@/constants/job-fit/coachingQuestions"
import { useSavedRoles } from "@/hooks/knowledge-continuity/useSavedRoles"
import { listEntitledVerticals, useEnabledVerticals } from "@/verticals/core"

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))
jest.mock("@/hooks/knowledge-continuity/useSavedRoles")
// The vertical registry is populated by importing the manifests barrel for its
// side effect, which a bare component test doesn't do — so the filter is stubbed
// rather than relying on registration order.
jest.mock("@/verticals/core", () => ({
  ...jest.requireActual("@/verticals/core"),
  useEnabledVerticals: jest.fn(),
  listEntitledVerticals: jest.fn(),
}))

const mockSavedRoles = useSavedRoles as jest.MockedFunction<typeof useSavedRoles>
const mockEnabled = useEnabledVerticals as jest.MockedFunction<typeof useEnabledVerticals>
const mockListEntitled = listEntitledVerticals as jest.MockedFunction<typeof listEntitledVerticals>

const VERTICALS = [
  { key: "job-fit", title: "Job Fit", routePrefix: "/vertical/job-fit", homePath: "/vertical/job-fit/matches" },
  { key: "lumen", title: "Lumen", routePrefix: "/vertical/lumen", homePath: "/vertical/lumen/dashboard" },
] as unknown as ReturnType<typeof listEntitledVerticals>

const withRoles = (titles: string[]) =>
  mockSavedRoles.mockReturnValue({
    data: titles.map((t) => ({ role_title: t, node_count: 12 })),
  } as unknown as ReturnType<typeof useSavedRoles>)

const renderPage = () =>
  render(
    <MemoryRouter>
      <CoachPage />
    </MemoryRouter>
  )

beforeEach(() => {
  mockEnabled.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useEnabledVerticals>)
  mockListEntitled.mockReturnValue([])
})
afterEach(() => jest.clearAllMocks())

// ── The question library ─────────────────────────────────────────────

describe("Job-Fit coaching questions", () => {
  test("has the five requested categories", () => {
    expect(JOB_FIT_QUESTION_GROUPS.map((g) => g.key)).toEqual([
      "fit",
      "gaps",
      "closing",
      "goals",
      "interview",
    ])
  })

  test("ten questions per category", () => {
    for (const g of JOB_FIT_QUESTION_GROUPS) {
      expect(g.questions).toHaveLength(10)
    }
  })

  test("every question is anchored to the selected role", () => {
    // The whole point of Job-Fit coaching is that it is about YOU against ONE
    // role — a question without {role} would drift into generic coaching.
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

// ── The page ─────────────────────────────────────────────────────────

describe("CoachPage", () => {
  test("sends you to blueprint a role when none are saved", () => {
    withRoles([])
    renderPage()
    expect(screen.getByText("No saved roles yet.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Blueprint a role first/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/job-fit/blueprint")
  })

  test("picking a question injects it and auto-submits into Meridian", () => {
    withRoles(["Director of Operations"])
    renderPage()
    fireEvent.change(screen.getByLabelText("Which role are we talking about?"), {
      target: { value: "Director of Operations" },
    })
    const first = JOB_FIT_QUESTION_GROUPS[0].questions[0]
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: first } })

    expect(mockNavigate).toHaveBeenCalledWith("/meridian/chat", {
      state: {
        prefillPrompt: withRole(first, "Director of Operations"),
        autoSubmit: true,
      },
    })
  })

  test("questions stay disabled until a role is chosen", () => {
    withRoles(["CIO"])
    renderPage()
    expect(screen.getByLabelText("Question")).toBeDisabled()
  })

  test("a custom question is asked about the selected role too", () => {
    withRoles(["CIO"])
    renderPage()
    fireEvent.change(screen.getByLabelText("Which role are we talking about?"), {
      target: { value: "CIO" },
    })
    fireEvent.change(screen.getByLabelText("Or ask your own"), {
      target: { value: "What would surprise me about {role}?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Ask Meridian/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/meridian/chat", {
      state: { prefillPrompt: "What would surprise me about CIO?", autoSubmit: true },
    })
  })

  test("switching category swaps the question set", () => {
    withRoles(["CIO"])
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

  test("always offers a way out of the vertical", () => {
    renderNav()
    fireEvent.click(screen.getByRole("button", { name: /Back to Inspire Genius/ }))
    expect(mockNavigate).toHaveBeenCalledWith("/home")
  })

  test("offers the other verticals this user is entitled to", () => {
    mockEnabled.mockReturnValue({
      data: ["job-fit", "lumen"],
    } as unknown as ReturnType<typeof useEnabledVerticals>)
    mockListEntitled.mockReturnValue(VERTICALS)
    renderNav()
    expect(screen.getByRole("button", { name: "Lumen" })).toBeInTheDocument()
    // GRANT is not entitled, so the filter never returns it.
    expect(screen.queryByRole("button", { name: "GRANT" })).not.toBeInTheDocument()
  })

  test("does not offer the vertical you are already in", () => {
    mockEnabled.mockReturnValue({
      data: ["job-fit"],
    } as unknown as ReturnType<typeof useEnabledVerticals>)
    mockListEntitled.mockReturnValue(VERTICALS)
    renderNav()
    // Job Fit is entitled and returned by the registry, but filtered out here —
    // the point of the switcher is getting OUT.
    expect(screen.queryByRole("button", { name: "Job Fit" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Lumen" })).toBeInTheDocument()
  })
})
