import { render, screen } from "@testing-library/react"
import RlhfMetricCards from "../RlhfMetricCards"

describe("RlhfMetricCards", () => {
  const mockStats = {
    total_count: 150,
    avg_rating: 4.2,
    rating_distribution: { "1": 5, "2": 10, "3": 25, "4": 50, "5": 60 },
  }

  it("renders all four metric cards", () => {
    render(<RlhfMetricCards stats={mockStats} />)
    expect(screen.getByText("Total Feedback")).toBeInTheDocument()
    expect(screen.getByText("Average Rating")).toBeInTheDocument()
    expect(screen.getByText("5-Star Ratings")).toBeInTheDocument()
    expect(screen.getByText("1-Star Ratings")).toBeInTheDocument()
  })

  it("displays correct values from stats", () => {
    render(<RlhfMetricCards stats={mockStats} />)
    expect(screen.getByText("150")).toBeInTheDocument()
    expect(screen.getByText("4.2")).toBeInTheDocument()
    expect(screen.getByText("60")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("shows loading indicators when isLoading is true", () => {
    render(<RlhfMetricCards stats={null} isLoading={true} />)
    const loadingEls = screen.getAllByText("...")
    expect(loadingEls.length).toBe(4)
  })

  it("shows defaults when stats is null", () => {
    render(<RlhfMetricCards stats={null} />)
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1)
  })

  it("shows dash for avg_rating when not available", () => {
    render(<RlhfMetricCards stats={{ total_count: 0, avg_rating: 0, rating_distribution: {} }} />)
    // avg_rating = 0 is falsy, so shows "—"
    expect(screen.getByText("\u2014")).toBeInTheDocument()
  })
})
