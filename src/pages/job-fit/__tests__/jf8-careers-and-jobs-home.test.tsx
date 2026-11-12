/**
 * JF-8 — the Careers and Jobs page: fields (D4) → favorites → jobs → Pathway →
 * Learning and Education, and what it does for an account without Discovery.
 */
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import JobFitHome from "../JobFitHome"

let mockDiscoveryAccess = true
jest.mock("@/verticals/core", () => ({
  useVerticalAccess: () => ({ hasAccess: mockDiscoveryAccess, isLoading: false, enabledVerticals: [] }),
}))

// CX-5 link: the exercise link reads the `career_exercise` switch; off here, so
// this suite sees JF-8's page unchanged (cx5-link-careers-and-jobs.test.tsx covers on).
jest.mock("@/hooks/career-exercise/useCounselorCareerExercise", () => ({
  useCareerExerciseSwitch: () => "off",
}))

jest.mock("../MatchesPage", () => ({ __esModule: true, default: () => <p>JOBS-LIST</p> }))
jest.mock("../FavoritesList", () => ({ FavoritesList: () => <p>FAVORITES</p> }))

type Q = { data?: unknown; isLoading?: boolean; isError?: boolean; error?: unknown }
let mockStatus: Q
let mockJourney: Q
let mockCareers: Q
const mockStatusCalled = jest.fn()
const mockJourneyEnabled = jest.fn()
const mockCareersEnabled = jest.fn()
jest.mock("@/hooks/career-discovery/useCareerDiscovery", () => ({
  discoveryErrorMessage: () => "Discovery could not load.",
  useDiscoveryStatus: () => {
    mockStatusCalled()
    return mockStatus
  },
  useDiscoveryJourney: (enabled: boolean) => {
    mockJourneyEnabled(enabled)
    return mockJourney
  },
  useDiscoveryCareers: (enabled: boolean) => {
    mockCareersEnabled(enabled)
    return mockCareers
  },
}))

const FAMILIES = {
  families: [
    { family: "People & Care", affinity: 82.4 },
    { family: "Research & Analysis", affinity: 71 },
  ],
}

function renderHome() {
  return render(
    <MemoryRouter>
      <JobFitHome />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDiscoveryAccess = true
  mockStatus = { data: { enabled: true } }
  mockJourney = { data: { mayProceed: true } }
  mockCareers = { data: FAMILIES }
})

describe("JF-8 — Careers and Jobs page", () => {
  it("puts fields, favorites, jobs, then Pathway and Learning and Education in that order", () => {
    renderHome()
    expect(screen.getByRole("heading", { level: 1, name: "Careers and Jobs" })).toBeInTheDocument()
    const text = document.body.textContent ?? ""
    const order = ["Fields that suit you", "FAVORITES", "JOBS-LIST", "Career Pathway", "Learning and Education"]
    const at = order.map((s) => text.indexOf(s))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it("lists today's Career areas as the fields, ranked, with their natural fit", () => {
    renderHome()
    const list = screen.getByRole("list", { name: "Fields that suit you" })
    const items = within(list).getAllByRole("listitem").map((li) => li.textContent)
    expect(items).toEqual(["1. People & Care · 82% natural fit", "2. Research & Analysis · 71% natural fit"])
    expect(mockCareersEnabled).toHaveBeenLastCalledWith(true)
  })

  it("links to Pathway and to Discovery's Learning and Education", () => {
    renderHome()
    const steps = screen.getByRole("navigation", { name: "Next steps" })
    const hrefs = within(steps).getAllByRole("link").map((a) => a.getAttribute("href"))
    expect(hrefs).toEqual(["/vertical/job-fit/pathway", "/vertical/career-discovery/education"])
  })

  it("without the career-discovery entitlement: no fields, no Discovery call, no Learning link", () => {
    mockDiscoveryAccess = false
    renderHome()
    expect(screen.queryByText("Fields that suit you")).not.toBeInTheDocument()
    expect(mockStatusCalled).not.toHaveBeenCalled()
    expect(mockJourneyEnabled).not.toHaveBeenCalled()
    expect(screen.queryByText("Learning and Education")).not.toBeInTheDocument()
    expect(screen.getByText("Career Pathway")).toBeInTheDocument()
    expect(screen.getByText("JOBS-LIST")).toBeInTheDocument()
  })

  it("Discovery switched off for the tier: no fields section, and no stage read", () => {
    mockStatus = { data: { enabled: false } }
    mockJourney = {}
    renderHome()
    expect(screen.queryByText("Fields that suit you")).not.toBeInTheDocument()
    expect(mockJourneyEnabled).toHaveBeenLastCalledWith(false)
    expect(mockCareersEnabled).toHaveBeenLastCalledWith(false)
  })

  it("before Discovery's first step: says so and links to it, without reading careers", () => {
    mockJourney = { data: { mayProceed: false } }
    mockCareers = {}
    renderHome()
    expect(screen.getByText(/Answer the first step/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to the first step" })).toHaveAttribute(
      "href",
      "/vertical/career-discovery/journey",
    )
    expect(mockCareersEnabled).toHaveBeenLastCalledWith(false)
  })

  it.each([
    ["status", () => (mockStatus = { isError: true, error: new Error("x") })],
    ["journey", () => (mockJourney = { isError: true, error: new Error("x") })],
    ["careers", () => (mockCareers = { isError: true, error: new Error("x") })],
  ])("a failed %s read is said out loud, never an empty list", (_name, fail) => {
    fail()
    renderHome()
    expect(screen.getByRole("alert")).toHaveTextContent("Discovery could not load.")
    expect(screen.queryByRole("list", { name: "Fields that suit you" })).not.toBeInTheDocument()
  })

  it("no fields yet: shows the server's note", () => {
    mockCareers = { data: { families: [], note: "Add your PRISM first." } }
    renderHome()
    expect(screen.getByText("Add your PRISM first.")).toBeInTheDocument()
  })

  it("loading states are announced, not blank", () => {
    mockJourney = { isLoading: true }
    const { unmount } = renderHome()
    expect(screen.getByRole("status")).toHaveTextContent("Loading your fields")
    unmount()
    mockJourney = { data: { mayProceed: true } }
    mockCareers = { isLoading: true }
    renderHome()
    expect(screen.getByRole("status")).toHaveTextContent("Ranking the fields")
  })
})
