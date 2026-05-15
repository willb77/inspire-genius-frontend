/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"

// Mock recharts to avoid canvas issues in jsdom
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}))

jest.mock("../DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => <div data-testid={`data-card-${title}`}>{children}</div>,
}))

import CostDashboard from "../CostDashboard"

const MOCK_KPIS = [
  { label: "Total Cost", value: "$45,678", change: "+12.3%", changeColor: "text-[#10B981]" },
  { label: "Active Users", value: "12,847", change: "+8.2%", changeColor: "text-[#10B981]" },
]

describe("CostDashboard", () => {
  it("renders KPI cards", () => {
    render(<CostDashboard level="platform" kpis={MOCK_KPIS} />)
    expect(screen.getByText("Total Cost")).toBeInTheDocument()
    expect(screen.getByText("$45,678")).toBeInTheDocument()
    expect(screen.getByText("Active Users")).toBeInTheDocument()
  })

  it("renders the correct level label", () => {
    render(<CostDashboard level="team" kpis={MOCK_KPIS} />)
    expect(screen.getByText("Team Cost Overview")).toBeInTheDocument()
  })

  it("renders date range selector", () => {
    render(<CostDashboard level="platform" kpis={MOCK_KPIS} />)
    expect(screen.getByText("Export")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Last 30 days")).toBeInTheDocument()
  })

  it("renders charts when data provided", () => {
    render(
      <CostDashboard
        level="platform"
        kpis={MOCK_KPIS}
        costByWeek={[{ name: "Wk1", cost: 9500 }]}
        costDistribution={[{ name: "AI", value: 70, color: "#00A3A3" }]}
      />
    )
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument()
  })
})
