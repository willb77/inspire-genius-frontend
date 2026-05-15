/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"

jest.mock("recharts", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { rechartsMock } = require("../test-support/rechartsMock")
  return rechartsMock
})

import FunnelChart from "../FunnelChart"

const SEED = [
  { name: "Applied", value: 47 },
  { name: "Screening", value: 18 },
  { name: "Interview", value: 8 },
  { name: "Offer", value: 3 },
  { name: "Hired", value: 2 },
]

describe("FunnelChart", () => {
  it("renders the loading skeleton in loading state", () => {
    render(<FunnelChart title="Pipeline" data={undefined} loading />)
    expect(screen.getByTestId("chartkit-loading-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
  })

  it("renders an inline error pill when error is set", () => {
    render(<FunnelChart title="Pipeline" data={undefined} error="pipeline broke" />)
    expect(screen.getByTestId("chartkit-error-pill")).toHaveTextContent("pipeline broke")
  })

  it("renders the empty state node when data is empty", () => {
    render(
      <FunnelChart
        title="Pipeline"
        data={[]}
        emptyState={<span>No candidates</span>}
      />,
    )
    expect(screen.getByText("No candidates")).toBeInTheDocument()
  })

  it("renders the chart with seeded data", () => {
    render(<FunnelChart title="Pipeline" data={SEED} />)
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Pipeline" })).toBeInTheDocument()
  })
})
