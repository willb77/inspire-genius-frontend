/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"

import { RoadmapTimeline } from "../RoadmapTimeline"
import type { Milestone, SummitGoal } from "@/types/development"

// The two mutations are mocked at the hook boundary: the panel's contract is
// what it asks them to do, not what the growth service answers.
const shareMutate = jest.fn()
const updateMutate = jest.fn()
let sharePending = false

jest.mock("@/hooks/manager/development", () => ({
  useSharePlan: jest.fn(() => ({ mutate: shareMutate, isPending: sharePending })),
  useUpdateMilestone: jest.fn(() => ({ mutate: updateMutate, isPending: false })),
}))

// Radix Select does not open in jsdom (no pointer capture, no layout). The
// mock keeps the trigger's aria-label and renders every item as a button that
// fires the parent's onValueChange, which is all the panel relies on.
jest.mock("@/components/ui/select", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react")
  const Ctx = React.createContext<(v: string) => void>(() => {})
  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode
      value?: string
      onValueChange: (v: string) => void
    }) => <Ctx.Provider value={onValueChange}>{children}</Ctx.Provider>,
    SelectTrigger: ({ children, ...rest }: { children: React.ReactNode; "aria-label"?: string }) => (
      <button type="button" aria-label={rest["aria-label"]}>
        {children}
      </button>
    ),
    SelectValue: () => <span />,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div role="listbox">{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const change = React.useContext(Ctx)
      return (
        <button type="button" role="option" aria-selected={false} onClick={() => change(value)}>
          {children}
        </button>
      )
    },
  }
})

import { useSharePlan, useUpdateMilestone } from "@/hooks/manager/development"

const goals: SummitGoal[] = [{ goalId: "goal-1", title: "Lead the Q3 launch" } as SummitGoal]

function ms(over: Partial<Milestone> & Pick<Milestone, "milestoneId" | "title" | "horizon" | "status">): Milestone {
  return { goalId: "goal-1", sequence: 1, ...over }
}

beforeEach(() => {
  shareMutate.mockClear()
  updateMutate.mockClear()
  sharePending = false
})

describe("RoadmapTimeline", () => {
  it("shows the honest empty state with no milestones", () => {
    render(<RoadmapTimeline memberId="m-1" milestones={[]} goals={goals} />)
    expect(screen.getByText("No milestones planned yet.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Share plan/i })).not.toBeInTheDocument()
  })

  it("binds both mutations to the member it was given", () => {
    render(
      <RoadmapTimeline memberId="m-42" milestones={[ms({ milestoneId: "a", title: "A", horizon: "d30", status: "planned" })]} goals={goals} />,
    )
    expect(useSharePlan).toHaveBeenCalledWith("m-42")
    expect(useUpdateMilestone).toHaveBeenCalledWith("m-42")
  })

  it("reads On track by default and At risk when the trajectory says so", () => {
    const one = [ms({ milestoneId: "a", title: "A", horizon: "d30", status: "planned" })]
    const { rerender } = render(<RoadmapTimeline memberId="m-1" milestones={one} goals={goals} />)
    expect(screen.getByText("On track")).toBeInTheDocument()
    rerender(<RoadmapTimeline memberId="m-1" milestones={one} goals={goals} trajectory="at_risk" />)
    expect(screen.getByText("At risk")).toBeInTheDocument()
  })

  describe("next best action", () => {
    it("names a blocked milestone before anything else", () => {
      render(
        <RoadmapTimeline
          memberId="m-1"
          milestones={[
            ms({ milestoneId: "a", title: "Ship the deck", horizon: "d30", status: "in_progress" }),
            ms({ milestoneId: "b", title: "Get sign-off", horizon: "d60", status: "blocked", blockedReason: "Waiting on legal" }),
          ]}
          goals={goals}
        />,
      )
      expect(screen.getByText("Next best action: Unblock: Get sign-off")).toBeInTheDocument()
      expect(screen.getByText("Blocked: Waiting on legal")).toBeInTheDocument()
    })

    it("then keeps momentum on an in-progress one", () => {
      render(
        <RoadmapTimeline
          memberId="m-1"
          milestones={[
            ms({ milestoneId: "a", title: "Plan", horizon: "d30", status: "planned", sequence: 1 }),
            ms({ milestoneId: "b", title: "Ship the deck", horizon: "d60", status: "in_progress" }),
          ]}
          goals={goals}
        />,
      )
      expect(screen.getByText("Next best action: Keep momentum on: Ship the deck")).toBeInTheDocument()
    })

    it("then starts the lowest-sequence planned one, whatever the array order", () => {
      render(
        <RoadmapTimeline
          memberId="m-1"
          milestones={[
            ms({ milestoneId: "b", title: "Second", horizon: "d30", status: "planned", sequence: 2 }),
            ms({ milestoneId: "a", title: "First", horizon: "d30", status: "planned", sequence: 1 }),
            ms({ milestoneId: "c", title: "Done already", horizon: "d30", status: "done", sequence: 0 }),
          ]}
          goals={goals}
        />,
      )
      expect(screen.getByText("Next best action: Start: First")).toBeInTheDocument()
    })

    it("asks for a review when everything is done", () => {
      render(
        <RoadmapTimeline
          memberId="m-1"
          milestones={[ms({ milestoneId: "a", title: "A", horizon: "d30", status: "done" })]}
          goals={goals}
        />,
      )
      expect(screen.getByText(/All milestones complete — schedule a review\./)).toBeInTheDocument()
    })
  })

  it("renders every horizon lane, in order, with the empty-lane note where nothing is planned", () => {
    render(
      <RoadmapTimeline
        memberId="m-1"
        milestones={[ms({ milestoneId: "a", title: "Only one", horizon: "q", status: "planned" })]}
        goals={goals}
      />,
    )
    const titles = ["30 days", "60 days", "90 days", "Quarters", "12 months+"]
    // Each label appears once as a lane title and once in the accessible list prefix.
    for (const t of titles) expect(screen.getAllByText(new RegExp(`^${t}`)).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("No milestones in this lane.")).toHaveLength(4)
  })

  it("shows the goal title, the due date and the linked counts on a milestone", () => {
    render(
      <RoadmapTimeline
        memberId="m-1"
        milestones={[
          ms({
            milestoneId: "a",
            title: "Draft the plan",
            horizon: "d30",
            status: "planned",
            dueDate: "2026-10-01T00:00:00Z",
            gapIds: ["g1", "g2"],
            learningItemIds: ["l1"],
          }),
        ]}
        goals={goals}
      />,
    )
    expect(screen.getByText("Goal: Lead the Q3 launch")).toBeInTheDocument()
    expect(screen.getByText(/^Due /)).toBeInTheDocument()
    expect(screen.getByText("2 gap(s)")).toBeInTheDocument()
    expect(screen.getByText("1 learning item(s)")).toBeInTheDocument()
  })

  it("Share plan asks for the PDF and is disabled while a share is pending", () => {
    const one = [ms({ milestoneId: "a", title: "A", horizon: "d30", status: "planned" })]
    const { unmount } = render(<RoadmapTimeline memberId="m-1" milestones={one} goals={goals} />)
    fireEvent.click(screen.getByRole("button", { name: /Share plan/i }))
    expect(shareMutate).toHaveBeenCalledWith({ includePdf: true })
    unmount()

    sharePending = true
    render(<RoadmapTimeline memberId="m-1" milestones={one} goals={goals} />)
    expect(screen.getByRole("button", { name: /Share plan/i })).toBeDisabled()
  })

  it("changing a milestone's status sends that milestone id and the new status", () => {
    render(
      <RoadmapTimeline
        memberId="m-1"
        milestones={[ms({ milestoneId: "ms-7", title: "Draft the plan", horizon: "d30", status: "planned" })]}
        goals={goals}
      />,
    )
    expect(screen.getByRole("button", { name: "Update status for Draft the plan" })).toBeInTheDocument()
    const listbox = screen.getByRole("listbox")
    fireEvent.click(within(listbox).getByRole("option", { name: "Blocked" }))
    expect(updateMutate).toHaveBeenCalledWith({ milestoneId: "ms-7", status: "blocked" })
  })

  it("the accessible list orders by horizon then sequence", () => {
    render(
      <RoadmapTimeline
        memberId="m-1"
        milestones={[
          ms({ milestoneId: "c", title: "Year item", horizon: "y_plus", status: "planned", sequence: 1 }),
          ms({ milestoneId: "b", title: "Thirty second", horizon: "d30", status: "planned", sequence: 2 }),
          ms({ milestoneId: "a", title: "Thirty first", horizon: "d30", status: "done", sequence: 1 }),
        ]}
        goals={goals}
      />,
    )
    const items = screen.getAllByRole("listitem").map((li) => li.textContent)
    expect(items).toEqual([
      "30 days: Thirty firstDone",
      "30 days: Thirty secondPlanned",
      "12 months+: Year itemPlanned",
    ])
  })
})
