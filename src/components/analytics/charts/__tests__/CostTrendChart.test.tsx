/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"

jest.mock("recharts", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { rechartsMock } = require("../test-support/rechartsMock")
  return rechartsMock
})

import CostTrendChart from "../CostTrendChart"

const SEED = [
  { month: "Jan", cost: 1.2, baseline: 1.0 },
  { month: "Feb", cost: 1.4, baseline: 1.0 },
  { month: "Mar", cost: 1.1, baseline: 1.0 },
]

describe("CostTrendChart", () => {
  it("renders the loading skeleton in loading state", () => {
    render(
      <CostTrendChart
        title="Cost / User"
        data={undefined}
        xKey="month"
        primary={{ key: "cost" }}
        loading
      />,
    )
    expect(screen.getByTestId("chartkit-loading-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument()
  })

  it("renders an inline error pill when error is set", () => {
    render(
      <CostTrendChart
        title="Cost / User"
        data={undefined}
        xKey="month"
        primary={{ key: "cost" }}
        error={new Error("api down")}
      />,
    )
    expect(screen.getByTestId("chartkit-error-pill")).toHaveTextContent("api down")
  })

  it("renders the empty state node when data is empty", () => {
    render(
      <CostTrendChart
        title="Cost / User"
        data={[]}
        xKey="month"
        primary={{ key: "cost" }}
        emptyState={<span>No cost data</span>}
      />,
    )
    expect(screen.getByText("No cost data")).toBeInTheDocument()
  })

  it("renders the chart with seeded data and dual series", () => {
    render(
      <CostTrendChart
        title="Cost / User"
        data={SEED}
        xKey="month"
        primary={{ key: "cost", label: "Cost" }}
        secondary={{ key: "baseline", label: "Baseline" }}
      />,
    )
    expect(screen.getByTestId("line-chart")).toBeInTheDocument()
    expect(screen.getAllByTestId("line").length).toBe(2)
  })
})
