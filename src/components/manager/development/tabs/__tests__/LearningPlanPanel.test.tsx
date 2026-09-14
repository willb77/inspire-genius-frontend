/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

import { LearningPlanPanel } from "../LearningPlanPanel"
import { ROUTES } from "@/constants/routes"
import type { DevelopmentGap, LearningItem, SummitGoal } from "@/types/development"

// The panel is pure props plus `useNavigate`, so the router is the only
// dependency. `useDevSkin` falls back to the classic skin with no provider.

function renderWith(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={["/manager/development/m-1"]}>
      <Routes>
        <Route path="/manager/development/:id" element={ui} />
        <Route path={ROUTES.MANAGER.TRAINING} element={<div>training surface</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const gaps: DevelopmentGap[] = [
  {
    gapId: "gap-1",
    memberId: "m-1",
    competency: "Delegation",
    currentLevel: 2,
    targetLevel: 4,
    severity: "moderate",
    source: "behavioral",
    status: "open",
  },
]

const goals: SummitGoal[] = [
  {
    goalId: "goal-1",
    memberId: "m-1",
    title: "Lead the Q3 launch",
    category: "career",
    horizon: "quarter",
    motivation: "",
    prismAlignment: { quadrant: 1, rationale: "" },
    executionStyle: "",
    successMetric: "",
    firstStep: "",
    ownerCoach: "Alex",
    status: "active",
    provenanceQuotes: [],
  } as unknown as SummitGoal,
]

const items: LearningItem[] = [
  {
    itemId: "li-1",
    memberId: "m-1",
    gapId: "gap-1",
    title: "Delegation for new managers",
    provider: "LinkedIn Learning",
    estHours: 3,
    format: "visual",
    status: "in_progress",
    progress: 40,
    quizScore: 80,
  },
  {
    itemId: "li-2",
    memberId: "m-1",
    goalId: "goal-1",
    title: "Launch playbook",
    provider: "Internal",
    status: "complete",
  },
  {
    itemId: "li-3",
    memberId: "m-1",
    gapId: "gap-unknown",
    title: "Orphaned item",
    provider: "Coursera",
    status: "not_started",
  },
  {
    itemId: "li-4",
    memberId: "m-1",
    title: "Reading list",
    provider: "Library",
    status: "not_started",
  },
]

describe("LearningPlanPanel", () => {
  it("shows the honest empty state when there are no learning items", () => {
    renderWith(<LearningPlanPanel learning={[]} gaps={gaps} goals={goals} />)
    expect(screen.getByText(/No learning items yet\. Close a gap to seed one\./i)).toBeInTheDocument()
    expect(screen.queryByText(/Pacing note/i)).not.toBeInTheDocument()
  })

  it("groups items by gap competency, then goal title, then General", () => {
    renderWith(<LearningPlanPanel learning={items} gaps={gaps} goals={goals} />)
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual([
      "Gap: Delegation",
      "Goal: Lead the Q3 launch",
      "Gap: gap-unknown",
      "General",
    ])
  })

  it("falls back to the raw id when a gap is not in the lookup", () => {
    renderWith(<LearningPlanPanel learning={items} gaps={gaps} goals={goals} />)
    expect(screen.getByText("Gap: gap-unknown")).toBeInTheDocument()
  })

  it("renders provider, hours, format, status, progress and quiz for an item", () => {
    renderWith(<LearningPlanPanel learning={[items[0]]} gaps={gaps} goals={goals} />)
    expect(screen.getByText("Delegation for new managers")).toBeInTheDocument()
    expect(screen.getByText("LinkedIn Learning")).toBeInTheDocument()
    expect(screen.getByText("3h")).toBeInTheDocument()
    expect(screen.getByText("visual")).toBeInTheDocument()
    expect(screen.getByText("In progress")).toBeInTheDocument()
    expect(screen.getByLabelText("Progress 40%")).toBeInTheDocument()
    expect(screen.getByText("Quiz: 80%")).toBeInTheDocument()
  })

  it("omits hours, format, progress and quiz when the item has none", () => {
    renderWith(<LearningPlanPanel learning={[items[1]]} gaps={gaps} goals={goals} />)
    expect(screen.getByText("Complete")).toBeInTheDocument()
    expect(screen.queryByText(/\dh$/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Progress/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Quiz:/)).not.toBeInTheDocument()
  })

  it("always shows the pacing note above a non-empty plan", () => {
    renderWith(<LearningPlanPanel learning={items} gaps={gaps} goals={goals} />)
    expect(screen.getByText(/Pacing note:/i)).toBeInTheDocument()
  })

  it("Assign navigates to the manager training surface", () => {
    renderWith(<LearningPlanPanel learning={[items[0]]} gaps={gaps} goals={goals} />)
    const row = screen.getByText("Delegation for new managers").closest("div.rounded-lg") as HTMLElement
    fireEvent.click(within(row).getByRole("button", { name: "Assign" }))
    expect(screen.getByText("training surface")).toBeInTheDocument()
  })
})
