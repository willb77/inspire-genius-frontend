/**
 * Milestones, self-scoped and READ-ONLY.
 *
 * Read-only is a fact about the backend: `GET /v1/growth/me/milestones` exists
 * and there is no self-scoped POST or PATCH. So the empty state says who CAN
 * put one here rather than offering a control that cannot save, and the test
 * asserts no such control appears.
 */
import { render, screen } from "@testing-library/react"
import type { Milestone } from "@/types/development"

const useMyMilestones = jest.fn()
jest.mock("@/hooks/me/useMyDevelopment", () => ({
  useMyMilestones: () => useMyMilestones(),
}))

import MyMilestonesSection from "../MyMilestonesSection"

const milestone = (over: Partial<Milestone> = {}): Milestone => ({
  milestoneId: "m1",
  goalId: "g1",
  title: "Run a review unaided",
  horizon: "d30",
  sequence: 1,
  status: "planned",
  ...over,
})

function query(over: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  useMyMilestones.mockReturnValue(query({ data: [] }))
})

it("says a milestone is set with a coach, because nothing here can add one", () => {
  render(<MyMilestonesSection />)
  expect(screen.getByText("No milestones on your roadmap yet.")).toBeInTheDocument()
  expect(screen.getByText(/no way to add one from this page/i)).toBeInTheDocument()
  // No control that cannot save — the failure this lane has shipped before.
  expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument()
})

it("distinguishes a failed read from an empty roadmap", () => {
  useMyMilestones.mockReturnValue(query({ isError: true, error: new Error("boom") }))
  render(<MyMilestonesSection />)
  expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this section/i)
  expect(screen.queryByText("No milestones on your roadmap yet.")).not.toBeInTheDocument()
})

it("groups by horizon in the canonical order, and omits an empty lane", () => {
  useMyMilestones.mockReturnValue(
    query({
      data: [
        milestone({ milestoneId: "m2", horizon: "d90", title: "Later thing" }),
        milestone({ milestoneId: "m1", horizon: "d30", title: "Sooner thing" }),
      ],
    }),
  )
  const { container } = render(<MyMilestonesSection />)
  const text = container.textContent ?? ""
  expect(text.indexOf("30 days")).toBeGreaterThan(-1)
  expect(text.indexOf("30 days")).toBeLessThan(text.indexOf("90 days"))
  // Five empty lanes would read as five things going wrong.
  expect(screen.queryByText("60 days")).not.toBeInTheDocument()
  expect(screen.queryByText("12 months+")).not.toBeInTheDocument()
})

it("orders within a lane by the server's sequence, not by arrival", () => {
  useMyMilestones.mockReturnValue(
    query({
      data: [
        milestone({ milestoneId: "b", sequence: 2, title: "Second" }),
        milestone({ milestoneId: "a", sequence: 1, title: "First" }),
      ],
    }),
  )
  const { container } = render(<MyMilestonesSection />)
  const text = container.textContent ?? ""
  expect(text.indexOf("First")).toBeLessThan(text.indexOf("Second"))
})

it("gives the reason a milestone is blocked, not just the badge", () => {
  useMyMilestones.mockReturnValue(
    query({
      data: [milestone({ status: "blocked", blockedReason: "Waiting on a budget decision" })],
    }),
  )
  render(<MyMilestonesSection />)
  expect(screen.getByText("Blocked")).toBeInTheDocument()
  // "Blocked" alone tells the person nothing they can act on.
  expect(screen.getByText(/Waiting on a budget decision/)).toBeInTheDocument()
})
