/**
 * @jest-environment jsdom
 */

/**
 * Student Oversight roster.
 *
 * The assertions here are all about the three states this page must never
 * conflate:
 *
 *   "Not shared"   — the student did not grant it (a permission fact)
 *   "Not recorded" — nobody measured it (a data fact)
 *   an error       — we could not find out (a system fact)
 *
 * A page that renders all three the same way — as "—", or worse as `0` — tells
 * a manager a student is disengaged when the student exercised a right, and
 * that misreading is the whole thing consent is supposed to prevent. Several
 * tests below would pass against a much sloppier page; the ones that would not
 * are the ones asserting these are DIFFERENT strings.
 */

import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import StudentRoster from "../StudentRoster"
import type { StudentRoster as Roster } from "@/types/manager/studentRoster"

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}))

const mockUseStudentRoster = jest.fn()
jest.mock("@/hooks/manager/useStudentRoster", () => ({
  useStudentRoster: () => mockUseStudentRoster(),
  STUDENT_ROSTER_KEY: ["manager", "student-roster"],
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentRoster />
    </MemoryRouter>,
  )
}

/** Assertions about cell contents must be scoped to the table.
 *
 *  The page's own intro paragraph explains what "Not shared" means, so a bare
 *  `queryByText("Not shared")` matches the explanation and passes whatever the
 *  rows actually say. That is a test asserting the help text exists. */
function table() {
  return within(screen.getByRole("table"))
}

function ok(data: Partial<Roster>) {
  mockUseStudentRoster.mockReturnValue({
    data: {
      students: [],
      rosterEmptyReason: null,
      viewerProfileResolved: true,
      ...data,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })
}

const GRANTED_ROW = {
  studentUserId: "u-amy",
  name: "Amy Adams",
  email: "amy@example.test",
  consent: {
    state: "granted" as const,
    grantedCategories: ["engagement", "prism"],
    expiresAt: "2026-12-01T00:00:00Z",
    requestedAt: "2026-08-01T00:00:00Z",
    canRequest: false,
  },
  prism: {
    state: "completed" as const,
    at: "2026-05-05T00:00:00Z",
    source: "prism_results" as const,
    disagreement: null,
  },
  engagement: {
    lastLoginAt: "2026-08-28T00:00:00Z",
    lastSeenAt: "2026-08-28T00:00:00Z",
    loginCount: 12,
    visitDays4w: 9,
    cadenceWindowDays: 28,
  },
  attention: { score: 0, reasons: [] },
}

const UNGRANTED_ROW = {
  studentUserId: "u-ben",
  name: "Ben Blake",
  email: "ben@example.test",
  consent: {
    state: "none" as const,
    grantedCategories: [],
    expiresAt: null,
    requestedAt: null,
    canRequest: true,
  },
  prism: { shared: false as const, reason: "not_shared" as const },
  engagement: { shared: false as const, reason: "not_shared" as const },
  attention: { score: 8, reasons: ["No current access — nothing can be seen yet"] },
}

beforeEach(() => jest.clearAllMocks())

describe("the three states are visibly different", () => {
  it("shows 'Not shared' — never a zero — for an ungranted student", () => {
    ok({ students: [UNGRANTED_ROW] })
    renderPage()

    expect(table().getAllByText("Not shared").length).toBe(2)
    // The killer assertion: an ungranted row must not render a visit count at
    // all. "0 days active" would read as a dormant student to every manager
    // who saw it.
    expect(table().queryByText(/0 days active/i)).not.toBeInTheDocument()
    expect(table().queryByText(/Not recorded/i)).not.toBeInTheDocument()
  })

  it("shows 'Not recorded' — not 'Not shared' — when a granted field was never measured", () => {
    ok({
      students: [
        {
          ...GRANTED_ROW,
          engagement: {
            lastLoginAt: null,
            lastSeenAt: null,
            loginCount: null,
            visitDays4w: null,
            cadenceWindowDays: 28,
          },
        },
      ],
    })
    renderPage()

    expect(table().getAllByText("Not recorded").length).toBeGreaterThanOrEqual(1)
    expect(table().queryByText("Not shared")).not.toBeInTheDocument()
  })

  it("shows a real 0 when the student is granted, measured, and inactive", () => {
    ok({
      students: [
        { ...GRANTED_ROW, engagement: { ...GRANTED_ROW.engagement, visitDays4w: 0 } },
      ],
    })
    renderPage()
    expect(table().getByText(/0 days active/i)).toBeInTheDocument()
    expect(table().queryByText("Not recorded")).not.toBeInTheDocument()
  })
})

describe("empty states say which emptiness this is", () => {
  it("distinguishes 'nobody reports to you' from a broken profile", () => {
    ok({ students: [], rosterEmptyReason: "no_direct_reports" })
    renderPage()
    expect(screen.getByText(/No students are assigned to you yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/could not resolve your profile/i)).not.toBeInTheDocument()
  })

  it("says so when the viewer's own profile could not be resolved", () => {
    ok({ students: [], rosterEmptyReason: "no_profile", viewerProfileResolved: false })
    renderPage()
    expect(screen.getByText(/could not resolve your profile/i)).toBeInTheDocument()
    // And it must NOT claim the manager has no students — we do not know that.
    expect(screen.queryByText(/No students are assigned to you yet/i)).not.toBeInTheDocument()
  })

  it("renders a failure as a failure, not as an empty roster", () => {
    mockUseStudentRoster.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: jest.fn(),
    })
    renderPage()
    expect(screen.getByText(/roster could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByText(/no conclusion should be drawn/i)).toBeInTheDocument()
    expect(screen.queryByText(/No students are assigned to you/i)).not.toBeInTheDocument()
  })

  it("shows a loading state that is neither of the above", () => {
    mockUseStudentRoster.mockReturnValue({
      data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn(),
    })
    renderPage()
    expect(screen.getByRole("status", { name: /loading roster/i })).toBeInTheDocument()
    expect(screen.queryByText(/No students are assigned/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument()
  })
})

describe("honesty about the platform's own uncertainty", () => {
  it("surfaces a PRISM source disagreement rather than picking a winner", () => {
    ok({
      students: [
        {
          ...GRANTED_ROW,
          prism: {
            state: "not_started",
            at: null,
            source: null,
            disagreement: "The profile is flagged as survey-submitted but no PRISM result is on file.",
          },
        },
      ],
    })
    renderPage()
    expect(table().getByText(/Sources disagree/i)).toBeInTheDocument()
    // The state is still shown as what the store says — the flag does not
    // silently rewrite it.
    expect(table().getByText(/Not started/i)).toBeInTheDocument()
  })

  it("renders granted data for a student who shared it", () => {
    ok({ students: [GRANTED_ROW] })
    renderPage()
    expect(table().getByText("Amy Adams")).toBeInTheDocument()
    expect(table().getByText(/Completed/i)).toBeInTheDocument()
    expect(table().getByText(/9 days active in 4 weeks/i)).toBeInTheDocument()
    expect(table().queryByText("Not shared")).not.toBeInTheDocument()
  })

  it("labels a declined student without implying an action is available", () => {
    ok({
      students: [
        {
          ...UNGRANTED_ROW,
          consent: { ...UNGRANTED_ROW.consent, state: "declined", canRequest: false },
        },
      ],
    })
    renderPage()
    expect(table().getByText("Declined")).toBeInTheDocument()
  })
})
