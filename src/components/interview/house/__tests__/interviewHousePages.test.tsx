/**
 * House style, interview area — the interviewer pages' links, the Studio
 * address, the practice page's chrome and the guide film's title.
 *
 * Each ON case sits beside an OFF case that asserts today's behaviour.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"

const studioProps = jest.fn()
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="user-layout">{children}</div>,
}))
jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ role, children }: { role: string; children: ReactNode }) => (
    <div data-testid={`unified-layout-${role}`}>{children}</div>
  ),
}))
jest.mock("@/components/interview/LiveInterviewBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">interview-live</div>,
}))
jest.mock("@/components/task-agents/InterviewPrepBody", () => ({
  __esModule: true,
  default: () => <div data-testid="body">interview-prep</div>,
}))
jest.mock("@/components/interview/StudioInterviewBody", () => ({
  __esModule: true,
  default: (p: { openSessionId?: string }) => {
    studioProps(p)
    return <div data-testid="body">interview-studio</div>
  },
}))
// S4b: with the switch on, the interviewer pages render the one interview build.
const runProps = jest.fn()
jest.mock("@/components/interview/house/run/InterviewRunBody", () => ({
  __esModule: true,
  default: (p: { initialKind: string }) => {
    runProps(p)
    return <div data-testid="body">interview-run {p.initialKind}</div>
  },
}))
let mockRole: string | undefined = "manager"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: mockRole ? { role: mockRole } : null }),
}))

import WorkspaceInterviewLivePage from "@/pages/workspace/InterviewLivePage"
import WorkspaceInterviewPrepPage from "@/pages/workspace/InterviewPrepPage"
import WorkspaceInterviewStudioPage from "@/pages/workspace/InterviewStudioPage"
import RolePracticeChrome from "../RolePracticeChrome"
import { interviewLinksFor } from "../interviewHouseRoutes"
import { INTERVIEW_GUIDE_LABEL, PRACTICE_RESULTS_TITLE, practiceIntro } from "../practiceWords"

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  window.history.replaceState(null, "", "/")
  mockRole = "manager"
})

describe("interviewer pages — links to the sibling pages", () => {
  it("OFF: no link row on Studio, Live or Prep, and Studio is handed no session", () => {
    window.history.replaceState(null, "", "/manager/interview-studio?session=s-9")
    for (const Page of [WorkspaceInterviewStudioPage, WorkspaceInterviewLivePage, WorkspaceInterviewPrepPage]) {
      const { unmount } = render(<Page audience="manager" />)
      expect(screen.queryByRole("navigation", { name: "Interview pages" })).not.toBeInTheDocument()
      unmount()
    }
    // Today's Studio body, handed nothing new.
    expect(studioProps).toHaveBeenCalledWith({})
    expect(runProps).not.toHaveBeenCalled()
  })

  it("ON: a manager's Studio page links to the list and to Prepare questions", () => {
    localStorage.setItem("house_style_interview", "true")
    inRouter(<WorkspaceInterviewStudioPage audience="manager" />)
    expect(screen.getByRole("link", { name: "Past interviews" })).toHaveAttribute("href", "/manager/interviews")
    expect(screen.getByRole("link", { name: "Prepare questions" })).toHaveAttribute("href", "/manager/interview-prep")
  })

  it("ON (S4b): Studio's address renders the one build, starting on Your own questions", () => {
    localStorage.setItem("house_style_interview", "true")
    inRouter(<WorkspaceInterviewStudioPage audience="practitioner" />)
    expect(runProps).toHaveBeenCalledWith({ initialKind: "own" })
    expect(studioProps).not.toHaveBeenCalled()
  })

  it("ON: a practitioner's Prep page links back to running an interview, and there is no list link", () => {
    localStorage.setItem("house_style_interview", "true")
    inRouter(<WorkspaceInterviewPrepPage audience="practitioner" />)
    expect(screen.getByRole("link", { name: "Run an interview" })).toHaveAttribute(
      "href",
      "/practitioner/interview-studio",
    )
    expect(screen.queryByRole("link", { name: "Past interviews" })).not.toBeInTheDocument()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })

  it("ON (S4b): Live's address renders the one build, starting on Hiring, with the links", () => {
    localStorage.setItem("house_style_interview", "true")
    inRouter(<WorkspaceInterviewLivePage audience="practitioner" />)
    expect(screen.getByRole("link", { name: "Prepare questions" })).toHaveAttribute(
      "href",
      "/practitioner/interview-prep",
    )
    expect(screen.getByTestId("body")).toHaveTextContent("interview-run hiring")
  })

  it("lists links per audience and page", () => {
    expect(interviewLinksFor("manager", "prep").map((l) => l.label)).toEqual(["Past interviews", "Run an interview"])
    expect(interviewLinksFor("practitioner", "live").map((l) => l.to)).toEqual(["/practitioner/interview-prep"])
  })
})

describe("practice page chrome — each role keeps its own menu", () => {
  it.each([
    ["manager", "unified-layout-manager"],
    ["practitioner", "unified-layout-practitioner"],
    ["company-admin", "unified-layout-company-admin"],
    ["distributor", "unified-layout-distributor"],
    ["user", "user-layout"],
    ["super-admin", "user-layout"],
  ])("%s gets %s", (role, testId) => {
    mockRole = role
    render(<RolePracticeChrome>x</RolePracticeChrome>)
    expect(screen.getByTestId(testId)).toHaveTextContent("x")
  })

  it("an unknown or missing role gets the user chrome", () => {
    mockRole = "not-a-role"
    const { unmount } = render(<RolePracticeChrome>x</RolePracticeChrome>)
    expect(screen.getByTestId("user-layout")).toBeInTheDocument()
    unmount()
    mockRole = undefined
    render(<RolePracticeChrome>x</RolePracticeChrome>)
    expect(screen.getByTestId("user-layout")).toBeInTheDocument()
  })
})

describe("practice words", () => {
  it("promises no score only when there is none", () => {
    expect(practiceIntro(false)).toMatch(/There is no score/)
    expect(practiceIntro(true)).not.toMatch(/no score/i)
    expect(practiceIntro(true)).toMatch(/practice result at the end/)
  })

  it("titles the read-out and the film plainly", () => {
    expect(PRACTICE_RESULTS_TITLE).toBe("How it went")
    expect(INTERVIEW_GUIDE_LABEL).toBe("Watch: Interviews guide")
  })
})
