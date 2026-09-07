/**
 * /manager/interviews — the honest board. Package IS-C Lane C, finding IS-F5.
 *
 * This page used to render EIGHT hard-coded candidates behind a
 * PlaceholderBanner, with `completedCount = 12` as a literal and a
 * `// TODO: wire to real endpoint`. It was live on stable. A manager-visible
 * list of people who do not exist is worse than an empty page: it looks like a
 * working product, so nobody reports it.
 *
 * The first test is therefore a NEGATIVE one — the invented names must not
 * come back. It would pass trivially against a blank page, which is why the
 * rest assert the real rows and the counted numbers.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"

const useLiveSessions = jest.fn()
jest.mock("@/hooks/interview/useLiveSessions", () => ({
  useLiveSessions: (...a: unknown[]) => useLiveSessions(...a),
}))

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

jest.mock("react-router-dom", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#s">{children}</a>,
}))

import ManagerInterviews from "../Interviews"

const SESSION = (over: Record<string, unknown> = {}) => ({
  id: "s-1",
  interviewer_sub: "mgr-1",
  candidate_ref: { display_name: "Real Candidate", candidate_hash: "abcdef0123456789" },
  requisition_label: "Regional Manager — North",
  frame: { roleTitle: "Regional Manager", mode: "custom" },
  status: "finalized",
  overall_score: 4.25,
  created_at: "2026-09-01T10:00:00Z",
  finalized_at: "2026-09-01T11:00:00Z",
  ...over,
})

const result = (over: Record<string, unknown> = {}) => ({
  data: { sessions: [], total: 0, limit: 100, offset: 0, org_scope_applied: false, ...over },
  isLoading: false,
  error: null,
  refetch: jest.fn(),
})

beforeEach(() => jest.clearAllMocks())

describe("the invented candidates are gone", () => {
  it("renders none of the eight fabricated people, even with no data", () => {
    useLiveSessions.mockReturnValue(result())
    render(<ManagerInterviews />)
    for (const ghost of ["Sarah Chen", "Marcus Johnson", "David Kim", "Priya Patel",
                         "Elena Rodriguez", "Tom Harris", "Lisa Wang", "Chris Lee"]) {
      expect(screen.queryByText(ghost)).not.toBeInTheDocument()
    }
  })

  it("shows no literal 12 where the completed count used to be", () => {
    // `completedCount = 12` sat beside three derived numbers, which made all
    // four read as equally real.
    useLiveSessions.mockReturnValue(result())
    render(<ManagerInterviews />)
    const completed = screen.getByText("Completed").previousSibling
    expect(completed).toHaveTextContent("0")
  })
})

describe("the empty state is honest", () => {
  it("says what will appear here, rather than showing a fake schedule", () => {
    useLiveSessions.mockReturnValue(result())
    render(<ManagerInterviews />)
    expect(screen.getByText("No interviews yet")).toBeInTheDocument()
    expect(screen.getByText(/interviews you run appear here/i)).toBeInTheDocument()
  })

  it("says the list is yours, not the organisation's, when org scoping is off", () => {
    // The distinction the route reports and the UI has to pass on: an empty
    // list under no org scope means "you have run none", not "nobody here has".
    useLiveSessions.mockReturnValue(result({ org_scope_applied: false }))
    render(<ManagerInterviews />)
    expect(screen.getByText(/it is not\s+organisation-wide/i)).toBeInTheDocument()
  })

  it("drops that caveat when the read WAS org-scoped", () => {
    useLiveSessions.mockReturnValue(result({ org_scope_applied: true }))
    render(<ManagerInterviews />)
    expect(screen.queryByText(/not\s+organisation-wide/i)).not.toBeInTheDocument()
  })
})

describe("real sessions", () => {
  it("groups by status and counts every number from the response", () => {
    useLiveSessions.mockReturnValue(result({
      sessions: [
        SESSION(),
        SESSION({ id: "s-2", status: "in_progress", overall_score: null, finalized_at: null }),
        SESSION({ id: "s-3", status: "abandoned", overall_score: null, finalized_at: null }),
      ],
      total: 3,
    }))
    render(<ManagerInterviews />)

    // Each label appears twice — once as a stat, once as a group heading — so
    // the count is the assertion, not the presence.
    for (const label of ["In progress", "Completed", "Abandoned"]) {
      expect(screen.getAllByText(label)).toHaveLength(2)
    }
    expect(screen.getAllByText("Real Candidate")).toHaveLength(3)
  })

  it("shows a score only for a finalized interview", () => {
    useLiveSessions.mockReturnValue(result({
      sessions: [SESSION(), SESSION({ id: "s-2", status: "in_progress", overall_score: null })],
      total: 2,
    }))
    render(<ManagerInterviews />)
    expect(screen.getByText("4.25 / 5")).toBeInTheDocument()
    // An in-progress interview has no score of record; it must not borrow one.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("falls back to the PII-free hash when no display name was captured", () => {
    useLiveSessions.mockReturnValue(result({
      sessions: [SESSION({ candidate_ref: { candidate_hash: "abcdef0123456789" } })],
      total: 1,
    }))
    render(<ManagerInterviews />)
    expect(screen.getByText("#abcdef01")).toBeInTheDocument()
  })

  it("names the opening the interview was run against", () => {
    useLiveSessions.mockReturnValue(result({ sessions: [SESSION()], total: 1 }))
    render(<ManagerInterviews />)
    expect(screen.getByText("Regional Manager — North")).toBeInTheDocument()
  })
})

describe("failure", () => {
  it("reports a load failure instead of silently showing nothing", async () => {
    const refetch = jest.fn()
    useLiveSessions.mockReturnValue({
      data: undefined, isLoading: false, error: new Error("boom"), refetch,
    })
    render(<ManagerInterviews />)

    expect(screen.getByRole("alert")).toHaveTextContent(/could not load your interviews/i)
    // A failed load must not read as "you have run no interviews".
    expect(screen.queryByText("No interviews yet")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /retry/i }))
    await waitFor(() => expect(refetch).toHaveBeenCalled())
  })
})
