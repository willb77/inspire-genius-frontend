import { render, screen } from "@testing-library/react"
import RlhfRatingChart from "../RlhfRatingChart"

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}))

import React from "react"

describe("RlhfRatingChart", () => {
  it("renders the chart title", () => {
    render(<RlhfRatingChart stats={null} />)
    expect(screen.getByText("Rating Distribution")).toBeInTheDocument()
  })

  it("renders the bar chart", () => {
    render(<RlhfRatingChart stats={{ total_count: 10, avg_rating: 3.5, rating_distribution: { "1": 1, "5": 9 } }} />)
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
  })

  it("handles null stats gracefully", () => {
    render(<RlhfRatingChart stats={null} />)
    expect(screen.getByText("Rating Distribution")).toBeInTheDocument()
  })
})
