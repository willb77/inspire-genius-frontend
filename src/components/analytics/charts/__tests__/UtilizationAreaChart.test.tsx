/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"

jest.mock("recharts", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { rechartsMock } = require("../test-support/rechartsMock")
  return rechartsMock
})

import UtilizationAreaChart from "../UtilizationAreaChart"

const SEED = [
  { week: "W1", booked: 60, available: 40 },
  { week: "W2", booked: 70, available: 30 },
]

describe("UtilizationAreaChart", () => {
  it("renders the loading skeleton in loading state", () => {
    render(
      <UtilizationAreaChart
        title="Utilization"
        data={undefined}
        xKey="week"
        series={[{ key: "booked" }]}
        loading
      />,
    )
    expect(screen.getByTestId("chartkit-loading-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("area-chart")).not.toBeInTheDocument()
  })

  it("renders an inline error pill when error is set", () => {
    render(
      <UtilizationAreaChart
        title="Utilization"
        data={undefined}
        xKey="week"
        series={[{ key: "booked" }]}
        error={new Error("util err")}
      />,
    )
    expect(screen.getByTestId("chartkit-error-pill")).toHaveTextContent("util err")
  })

  it("renders the empty state node when data is empty", () => {
    render(
      <UtilizationAreaChart
        title="Utilization"
        data={[]}
        xKey="week"
        series={[{ key: "booked" }]}
        emptyState={<span>No utilization yet</span>}
      />,
    )
    expect(screen.getByText("No utilization yet")).toBeInTheDocument()
  })

  it("renders the chart stacked with seeded data", () => {
    render(
      <UtilizationAreaChart
        title="Utilization"
        data={SEED}
        xKey="week"
        series={[
          { key: "booked", label: "Booked" },
          { key: "available", label: "Available" },
        ]}
        stacked
      />,
    )
    expect(screen.getByTestId("area-chart")).toBeInTheDocument()
    expect(screen.getAllByTestId("area").length).toBe(2)
  })
})
