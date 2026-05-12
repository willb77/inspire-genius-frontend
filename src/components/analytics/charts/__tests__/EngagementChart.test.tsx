/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"

jest.mock("recharts", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { rechartsMock } = require("../test-support/rechartsMock")
  return rechartsMock
})

import EngagementChart from "../EngagementChart"

const SEED = [
  { name: "Alex", sessions: 12 },
  { name: "Maria", sessions: 9 },
]

describe("EngagementChart", () => {
  it("renders the loading skeleton in loading state", () => {
    render(
      <EngagementChart
        title="Engagement"
        data={undefined}
        xKey="name"
        valueKey="sessions"
        loading
      />,
    )
    expect(screen.getByTestId("chartkit-loading-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
  })

  it("renders an inline error pill when error is set", () => {
    render(
      <EngagementChart
        title="Engagement"
        data={undefined}
        xKey="name"
        valueKey="sessions"
        error={new Error("boom")}
      />,
    )
    const pill = screen.getByTestId("chartkit-error-pill")
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveTextContent("boom")
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
  })

  it("renders the empty state node when data is empty", () => {
    render(
      <EngagementChart
        title="Engagement"
        data={[]}
        xKey="name"
        valueKey="sessions"
        emptyState={<span>No engagement yet</span>}
      />,
    )
    expect(screen.getByText("No engagement yet")).toBeInTheDocument()
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
  })

  it("renders the chart with seeded data", () => {
    render(
      <EngagementChart
        title="Engagement"
        subtitle="Sessions per member"
        data={SEED}
        xKey="name"
        valueKey="sessions"
      />,
    )
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
    expect(screen.getByText("Sessions per member")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Engagement" })).toBeInTheDocument()
  })
})
