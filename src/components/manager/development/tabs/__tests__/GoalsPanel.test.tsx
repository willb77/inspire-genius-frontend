/** @jest-environment jsdom */
/**
 * Goals tab — the three share states (none of them the empty list), the
 * review form's success contract, and audience parity.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { GoalsPanel, formatShareDate } from "../GoalsPanel"
import type { SummitGoal } from "@/types/development"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { toast } from "sonner"

const goalsState: { data: unknown; isLoading: boolean } = { data: undefined, isLoading: false }
const reviewsState: { data: unknown } = { data: undefined }
const ratifyMutate = jest.fn()
const noteMutate = jest.fn()
const sessionMutate = jest.fn()

jest.mock("@/hooks/manager/development", () => ({
  useDevelopmentGoals: () => goalsState,
  useGoalSession: () => ({ mutate: sessionMutate, isPending: false }),
  useRatifyGoal: () => ({ mutate: ratifyMutate, isPending: false }),
  useCreateCoachingNote: () => ({ mutate: noteMutate, isPending: false }),
  useGoalReviews: () => reviewsState,
}))

const goal: SummitGoal = {
  goalId: "g1",
  memberId: "m1",
  title: "Run a weekly ops cadence",
  category: "current_job",
  horizon: "long",
  motivation: "Fewer surprises",
  prismAlignment: { kind: "leverages", dimensions: [1], quadrant: 1 },
  executionStyle: "Stepwise",
  successMetric: "Four in a row",
  firstStep: "Book the first one",
  ownerCoach: "Echo",
  status: "confirmed",
  provenanceQuotes: [],
}

function renderAt(path: string, name = "Mark Tully") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <GoalsPanel memberId="m1" memberName={name} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  goalsState.isLoading = false
  goalsState.data = undefined
  reviewsState.data = undefined
})

describe("the three share states", () => {
  it("not shared: says so, and never the invite-to-Summit empty state", () => {
    goalsState.data = { goals: [], coverage: [], goalsNotShared: true, goalsNoAccount: false }
    renderAt("/manager/development/m1")
    expect(screen.getByTestId("goals-state-not-shared")).toBeInTheDocument()
    expect(screen.getByText(/Mark Tully has not shared their goals with you/)).toBeInTheDocument()
    expect(screen.queryByText(/No goals discovered yet/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Invite/ })).not.toBeInTheDocument()
  })

  it("no IG account: a distinct sentence, no dead 'ask them' button", () => {
    goalsState.data = { goals: [], coverage: [], goalsNotShared: true, goalsNoAccount: true }
    renderAt("/manager/development/m1")
    expect(screen.getByTestId("goals-state-no-account")).toBeInTheDocument()
    expect(screen.getByText(/has no Inspires Genius account/)).toBeInTheDocument()
    expect(screen.queryByTestId("goals-state-not-shared")).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shared: shows the expiry and the goals", () => {
    goalsState.data = { goals: [goal], coverage: [], goalsSharedUntil: "2027-09-04T14:29:20Z" }
    renderAt("/manager/development/m1")
    expect(screen.getByTestId("goals-state-shared")).toHaveTextContent(
      `Shared with you until ${formatShareDate("2027-09-04T14:29:20Z")}.`,
    )
    expect(screen.getByText("Run a weekly ops cadence")).toBeInTheDocument()
  })

  it("shared with no goals yet keeps the invite state, still labelled shared", () => {
    goalsState.data = { goals: [], coverage: [], goalsPending: true, goalsSharedUntil: null }
    renderAt("/manager/development/m1")
    expect(screen.getByTestId("goals-state-shared")).toHaveTextContent("Shared with you.")
    expect(screen.getByTestId("goals-state-pending")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Invite to Summit session/ }))
    expect(sessionMutate).toHaveBeenCalledWith("invite")
  })
})

describe("reviews and the review form", () => {
  beforeEach(() => {
    goalsState.data = { goals: [goal], coverage: [], goalsSharedUntil: "2027-01-01T00:00:00Z" }
  })

  it("renders the reviews under the goal, newest list as given", () => {
    reviewsState.data = {
      memberId: "m1",
      reviews: [
        { id: "r1", goalId: "g1", memberId: "m1", reviewerSub: "c1", reviewerName: "Dana", ratified: true, comment: "Strong.", createdAt: "2026-09-04T00:00:00Z" },
        { id: "r2", goalId: "other", memberId: "m1", reviewerSub: "c1", ratified: false, comment: "Not this one." },
      ],
    }
    renderAt("/manager/development/m1")
    expect(screen.getByText("Dana")).toBeInTheDocument()
    expect(screen.getByText("Strong.")).toBeInTheDocument()
    expect(screen.queryByText("Not this one.")).not.toBeInTheDocument()
  })

  it("does not toast success until the mutation settles", () => {
    renderAt("/manager/development/m1")
    fireEvent.change(screen.getByLabelText("Review comment"), { target: { value: "Good first step" } })
    fireEvent.click(screen.getByRole("button", { name: /Send review/ }))
    expect(ratifyMutate).toHaveBeenCalledTimes(1)
    const [vars, opts] = ratifyMutate.mock.calls[0]
    expect(vars).toEqual({ goalId: "g1", ratified: true, comment: "Good first step" })
    expect(toast.success).not.toHaveBeenCalled()
    opts.onSuccess()
    expect(toast.success).toHaveBeenCalledWith("Review sent — goal ratified.")
  })

  it("an un-ratifying review is sent as such, and an error toasts an error", () => {
    renderAt("/manager/development/m1")
    fireEvent.click(screen.getByLabelText("Ratify this goal"))
    fireEvent.click(screen.getByRole("button", { name: /Send review/ }))
    const [vars, opts] = ratifyMutate.mock.calls[0]
    expect(vars.ratified).toBe(false)
    opts.onError(new Error("boom"))
    expect(toast.error).toHaveBeenCalledWith("boom")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("a note about this goal goes to the notes store with goalId set", () => {
    renderAt("/manager/development/m1")
    fireEvent.click(screen.getByRole("button", { name: /Note about this goal/ }))
    fireEvent.click(screen.getByRole("radio", { name: "Plan" }))
    fireEvent.change(screen.getByLabelText("Note body"), { target: { value: "Try a 1:1 cadence" } })
    fireEvent.click(screen.getByRole("button", { name: /Save note/ }))
    const [vars, opts] = noteMutate.mock.calls[0]
    expect(vars).toEqual({ goalId: "g1", kind: "plan", body: "Try a 1:1 cadence", source: "manual" })
    expect(toast.success).not.toHaveBeenCalled()
    opts.onSuccess()
    expect(toast.success).toHaveBeenCalledWith("Note saved.")
  })
})

describe("audience parity", () => {
  it("renders identically for the same data under the manager and practitioner routes", () => {
    goalsState.data = { goals: [goal], coverage: [], goalsSharedUntil: "2027-01-01T00:00:00Z" }
    const a = renderAt("/manager/development/m1").container.innerHTML
    const b = renderAt("/practitioner/development/m1").container.innerHTML
    expect(a).toEqual(b)
  })
})

describe("formatShareDate", () => {
  it("is empty for nothing and for junk", () => {
    expect(formatShareDate(null)).toBe("")
    expect(formatShareDate("not a date")).toBe("")
  })
})
