/**
 * House style, interview area — the manager's interview list.
 *
 * Switch OFF: the classic page renders exactly as before (its own suite,
 * pages/manager/__tests__/Interviews.test.tsx, pins the details; the OFF case
 * here pins that the switch really chooses it). Switch ON: every row opens, in
 * the page that already knows how to open a stored session by id.
 */
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"

const useLiveSessions = jest.fn()
jest.mock("@/hooks/interview/useLiveSessions", () => ({
  useLiveSessions: (...a: unknown[]) => useLiveSessions(...a),
}))
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))

import ManagerInterviews from "@/pages/manager/Interviews"
import { kindLabel, openHref } from "../interviewHouseRoutes"

const SESSION = (over: Record<string, unknown> = {}) => ({
  id: "s-1",
  interviewer_sub: "mgr-1",
  candidate_ref: { display_name: "Real Candidate", candidate_hash: "abcdef0123456789" },
  frame: { roleTitle: "Ops Supervisor", mode: "star" },
  status: "finalized",
  overall_score: 4.25,
  created_at: "2026-11-01T10:00:00Z",
  finalized_at: "2026-11-01T11:00:00Z",
  ...over,
})

const result = (over: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  data: { sessions: [], total: 0, limit: 100, offset: 0, org_scope_applied: true, ...over },
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  ...extra,
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <ManagerInterviews />
    </MemoryRouter>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})

describe("switch OFF — today's page", () => {
  it("renders the classic list: Interview Studio link, counted tiles, no Open links", () => {
    useLiveSessions.mockReturnValue(result({ sessions: [SESSION()], total: 1 }))
    renderPage()
    expect(screen.getByText("Interview Studio")).toBeInTheDocument()
    expect(screen.getByText("Abandoned")).toBeInTheDocument()
    expect(screen.getByText("Live scored")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /open the interview/i })).not.toBeInTheDocument()
    expect(screen.queryByText("Prepare questions")).not.toBeInTheDocument()
    expect(useLiveSessions).toHaveBeenCalledWith({ limit: 100 })
  })

  it("an explicit false keeps the classic page", () => {
    localStorage.setItem("house_style_interview", "false")
    useLiveSessions.mockReturnValue(result())
    renderPage()
    expect(screen.queryByText("Run a scored interview, or look back at one.")).not.toBeInTheDocument()
  })
})

describe("switch ON — every past interview opens", () => {
  beforeEach(() => localStorage.setItem("house_style_interview", "true"))

  it("keeps the same data call", () => {
    useLiveSessions.mockReturnValue(result())
    renderPage()
    expect(useLiveSessions).toHaveBeenCalledWith({ limit: 100 })
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument()
  })

  it("links a finished hiring interview to Live Interview, read by id", () => {
    useLiveSessions.mockReturnValue(result({ sessions: [SESSION()], total: 1 }))
    renderPage()
    const link = screen.getByRole("link", { name: "Open the interview with Real Candidate" })
    expect(link).toHaveAttribute("href", "/manager/interview-live?session=s-1")
    expect(link).toHaveTextContent("Open")
    const past = screen.getByRole("heading", { name: "Past interviews (1)" }).parentElement as HTMLElement
    expect(within(past).getByText("Nov 1, 2026")).toBeInTheDocument()
    expect(within(past).getByText("4.25 / 5")).toBeInTheDocument()
    expect(within(past).getByText("Hiring")).toBeInTheDocument()
  })

  it("links an own-questions interview to Interview Studio and offers Continue when unfinished", () => {
    useLiveSessions.mockReturnValue(
      result({
        sessions: [SESSION({ id: "s/2", status: "in_progress", frame: { roleTitle: "Lead", mode: "custom", kind: "hiring" } })],
        total: 1,
      }),
    )
    renderPage()
    const link = screen.getByRole("link", { name: "Open the interview with Real Candidate" })
    expect(link).toHaveAttribute("href", "/manager/interview-studio?session=s%2F2")
    expect(link).toHaveTextContent("Continue")
    expect(screen.getByRole("heading", { name: "In progress (1)" })).toBeInTheDocument()
    expect(screen.getByText("Not finished")).toBeInTheDocument()
    expect(screen.getByText("Your own questions")).toBeInTheDocument()
  })

  it("shows a stopped interview without a score and never the hash as a name", () => {
    useLiveSessions.mockReturnValue(
      result({ sessions: [SESSION({ status: "abandoned", candidate_ref: { candidate_hash: "abcdef0123456789" } })], total: 1 }),
    )
    renderPage()
    expect(screen.getByText("Stopped")).toBeInTheDocument()
    expect(screen.getByText("Name not recorded")).toBeInTheDocument()
    expect(screen.queryByText(/#abcdef01/)).not.toBeInTheDocument()
  })

  it("makes Prepare questions and New interview reachable", () => {
    useLiveSessions.mockReturnValue(result())
    renderPage()
    expect(screen.getByRole("link", { name: "Prepare questions" })).toHaveAttribute("href", "/manager/interview-prep")
    for (const l of screen.getAllByRole("link", { name: "New interview" })) {
      expect(l).toHaveAttribute("href", "/manager/interview-studio")
    }
  })

  it("says empty honestly when there is nothing", () => {
    useLiveSessions.mockReturnValue(result())
    renderPage()
    expect(screen.getByText("No interviews yet")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows a failed load as an error with Try again, never as empty", () => {
    const refetch = jest.fn()
    useLiveSessions.mockReturnValue({ data: undefined, isLoading: false, error: new Error("raw 500"), refetch })
    renderPage()
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your interviews.")
    expect(screen.queryByText("No interviews yet")).not.toBeInTheDocument()
    expect(screen.queryByText(/raw 500/)).not.toBeInTheDocument()
    screen.getByRole("button", { name: "Try again" }).click()
    expect(refetch).toHaveBeenCalled()
  })

  it("shows the loading outline while loading", () => {
    useLiveSessions.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: jest.fn() })
    renderPage()
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("says the list is only your own when the sign-in carried no organisation", () => {
    useLiveSessions.mockReturnValue(result({ org_scope_applied: false }))
    renderPage()
    expect(screen.getByText(/does not include your colleagues/)).toBeInTheDocument()
  })
})

describe("kind and address helpers", () => {
  it("names the three kinds", () => {
    expect(kindLabel(SESSION() as never)).toBe("Hiring")
    expect(kindLabel(SESSION({ frame: { mode: "custom", kind: "general" } }) as never)).toBe("Development conversation")
    expect(kindLabel(SESSION({ frame: { mode: "custom", kind: "hiring" } }) as never)).toBe("Your own questions")
    expect(kindLabel(SESSION({ frame: undefined }) as never)).toBe("Hiring")
  })

  it("opens a session with no mode in Live Interview, like the classic list's 'Live scored'", () => {
    expect(openHref(SESSION({ frame: {} }) as never)).toBe("/manager/interview-live?session=s-1")
  })
})
