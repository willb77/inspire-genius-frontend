import React from "react"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import SuperAdminAnalytics from "../Analytics"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
  ),
}))

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}))

jest.mock("@/hooks/super-admin/user-management/useUserManagement", () => ({
  useUserManagement: () => ({
    data: { data: { pagination: { total: 12847 } } },
    isLoading: false,
  }),
}))

jest.mock("@/hooks/super-admin/coach-management/useCoaches", () => ({
  useCoachesList: () => ({
    data: {
      data: {
        agents: [
          { id: "1", name: "Meridian" },
          { id: "2", name: "Aura" },
        ],
      },
    },
    isLoading: false,
  }),
}))

jest.mock("@/hooks/audit/useAudit", () => ({
  useAuditStats: () => ({
    data: { data: { total_logs: 100 } },
    isLoading: false,
  }),
}))

jest.mock("@/hooks/feedback/useFeedback", () => ({
  useFeedbackStats: () => ({
    data: { data: {} },
    isLoading: false,
  }),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe("SuperAdminAnalytics", () => {
  it("renders the page title and description", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByText("Platform Analytics")).toBeInTheDocument()
    expect(screen.getByText(/Platform-wide usage/)).toBeInTheDocument()
  })

  it("renders stat cards", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByText("Total Users")).toBeInTheDocument()
    expect(screen.getByText("Feedback Submitted")).toBeInTheDocument()
    expect(screen.getByText("Audit Events Today")).toBeInTheDocument()
  })

  it("renders chart sections", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByTestId("data-card-Agent Usage Distribution")).toBeInTheDocument()
    expect(screen.getByTestId("data-card-Organization Comparison")).toBeInTheDocument()
    expect(screen.getByTestId("data-card-Top Audit Actions")).toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
