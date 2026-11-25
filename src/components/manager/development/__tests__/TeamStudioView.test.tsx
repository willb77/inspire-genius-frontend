/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

/**
 * U5 — the Team view switches between Compare and Scenarios, opens on Compare,
 * and says that runs kept on a person's page stay there (decision D2).
 *
 * Both panels are probes; their behaviour is covered by
 * `tabs/__tests__/TeamView.u5.test.tsx`.
 */
jest.mock("@/components/manager/development/tabs/TeamComparePanel", () => ({
  TeamViewComparePanel: () => <div data-testid="team-view-compare" />,
}))
jest.mock("@/components/manager/development/tabs/TeamScenarioPanel", () => ({
  TeamViewScenarioPanel: () => <div data-testid="team-view-scenarios" />,
}))

import { TeamStudioView } from "../TeamStudioView"

describe("TeamStudioView", () => {
  it("opens on Compare and switches to Scenarios", () => {
    render(<TeamStudioView />)
    expect(screen.getByTestId("team-view-compare")).toBeInTheDocument()
    expect(screen.queryByTestId("team-view-scenarios")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Scenarios" }))
    expect(screen.getByTestId("team-view-scenarios")).toBeInTheDocument()
    expect(screen.queryByTestId("team-view-compare")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Scenarios" })).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(screen.getByRole("button", { name: "Compare" }))
    expect(screen.getByTestId("team-view-compare")).toBeInTheDocument()
  })

  it("states who can be picked and where earlier runs are", () => {
    render(<TeamStudioView />)
    expect(screen.getByText(/Only people who share their/)).toBeInTheDocument()
    expect(
      screen.getByText(/kept on a person's page before this view stay on that person's page/),
    ).toBeInTheDocument()
  })
})
