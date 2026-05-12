/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"

jest.mock("recharts", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { rechartsMock } = require("../test-support/rechartsMock")
  return rechartsMock
})

import GoalsBreakdownChart from "../GoalsBreakdownChart"

const SEED = [
  { name: "Completed", value: 5 },
  { name: "In Progress", value: 2 },
  { name: "Not Started", value: 1 },
]

describe("GoalsBreakdownChart", () => {
  it("renders the loading skeleton in loading state", () => {
    render(<GoalsBreakdownChart title="Goals" data={undefined} loading />)
    expect(screen.getByTestId("chartkit-loading-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument()
  })

  it("renders an inline error pill when error is set", () => {
    render(
      <GoalsBreakdownChart title="Goals" data={undefined} error="goals failed" />,
    )
    const pill = screen.getByTestId("chartkit-error-pill")
    expect(pill).toHaveTextContent("goals failed")
  })

  it("renders the empty state node when data is empty", () => {
    render(
      <GoalsBreakdownChart
        title="Goals"
        data={[]}
        emptyState={<span>No goals tracked</span>}
      />,
    )
    expect(screen.getByText("No goals tracked")).toBeInTheDocument()
  })

  it("renders the chart with seeded data", () => {
    render(<GoalsBreakdownChart title="Goals" data={SEED} />)
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Goals" })).toBeInTheDocument()
  })
})
