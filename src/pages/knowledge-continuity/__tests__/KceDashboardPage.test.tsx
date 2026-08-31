/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import type { ContinuityAnalytics } from "@/types/knowledge-continuity"

const mockUseContinuityAnalytics = jest.fn()
jest.mock("@/hooks/knowledge-continuity/useContinuityAnalytics", () => ({
  useContinuityAnalytics: (...a: unknown[]) => mockUseContinuityAnalytics(...a),
}))

// Recharts renders nothing measurable in jsdom (ResponsiveContainer needs a real
// layout). Mock it to lightweight DOM so chart assertions stay deterministic.
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}))

import KceDashboardPage from "../KceDashboardPage"

const ANALYTICS: ContinuityAnalytics = {
  org_id: "org-1",
  fresh_days: 90,
  validity_bands: { validated: 12, provisional: 4, needs_review: 2, deprecated: 1 },
  mean_kvi: 0.82,
  coverage: { taxonomy_nodes_total: 40, nodes_with_units: 30, units_total: 120 },
  currency: { fresh_units: 100, stale_units: 20, pct_fresh: 0.83 },
  capture_sessions: { scheduled: 5, in_progress: 2, captured: 10, synthesized: 8, validated: 6 },
  review_queue: { pending_approvals: 3, unresolved_contradictions: 1 },
  curricula: { count: 4 },
  risk_register: {
    by_priority: { urgent: 2, high: 3, medium: 5, low: 1 },
    top_at_risk: [
      {
        id: "r1",
        role_title: "Lead Welder",
        kri: 0.91,
        capture_priority: "urgent",
        capture_status: "not_started",
      },
    ],
    uncaptured_urgent: 2,
  },
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("KceDashboardPage", () => {
  test("renders the loading skeleton state", () => {
    mockUseContinuityAnalytics.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = render(<KceDashboardPage />)
    expect(screen.getByText("Program Health")).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  test("renders a friendly empty state when there is no data and no error", () => {
    mockUseContinuityAnalytics.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    render(<KceDashboardPage />)
    expect(screen.getByText(/No knowledge-capture activity yet/)).toBeInTheDocument()
  })

  test("renders a friendly error state", () => {
    mockUseContinuityAnalytics.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<KceDashboardPage />)
    expect(screen.getByText(/couldn't load Program Health/)).toBeInTheDocument()
  })

  test("renders the key stats, validity bands, and at-risk table from analytics data", () => {
    mockUseContinuityAnalytics.mockReturnValue({ data: ANALYTICS, isLoading: false, isError: false })
    render(<KceDashboardPage />)

    // Stat cards
    expect(screen.getByText("82%")).toBeInTheDocument() // mean KVI
    expect(screen.getByText("30/40 nodes")).toBeInTheDocument() // coverage
    expect(screen.getByText("120 units captured")).toBeInTheDocument()
    expect(screen.getByText("83%")).toBeInTheDocument() // currency pct_fresh
    expect(screen.getByText("3 pending, 1 contradictions")).toBeInTheDocument()

    // Validity bands
    expect(screen.getByText("Validated")).toBeInTheDocument()
    expect(screen.getByText("Provisional")).toBeInTheDocument()
    expect(screen.getByText("Needs review")).toBeInTheDocument()
    expect(screen.getByText("Deprecated")).toBeInTheDocument()

    // Knowledge at risk
    expect(screen.getByText(/2 urgent roles have not been captured yet/)).toBeInTheDocument()
    expect(screen.getByText("Lead Welder")).toBeInTheDocument()
    expect(screen.getByText("0.91")).toBeInTheDocument()
    expect(screen.getByText("urgent")).toBeInTheDocument()
    expect(screen.getByText("not started")).toBeInTheDocument()

    // Charts
    expect(screen.getByText("Validity-band distribution")).toBeInTheDocument()
    expect(screen.getByText("Capture pipeline")).toBeInTheDocument()
    expect(screen.getAllByTestId("bar-chart").length).toBe(2)
  })

  test("renders 'No data yet' for the charts when all counts are zero", () => {
    mockUseContinuityAnalytics.mockReturnValue({
      data: {
        ...ANALYTICS,
        validity_bands: { validated: 0, provisional: 0, needs_review: 0, deprecated: 0 },
        capture_sessions: {
          scheduled: 0,
          in_progress: 0,
          captured: 0,
          synthesized: 0,
          validated: 0,
        },
      },
      isLoading: false,
      isError: false,
    })
    render(<KceDashboardPage />)

    // Both chart cards still render their titles...
    expect(screen.getByText("Validity-band distribution")).toBeInTheDocument()
    expect(screen.getByText("Capture pipeline")).toBeInTheDocument()
    // ...but fall back to the muted empty state instead of a chart.
    expect(screen.getAllByText("No data yet.").length).toBe(2)
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
  })
})
