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

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: any) => <div data-testid="tabs" {...props}>{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-${value}`}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}))

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}))

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}))

jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
}))

jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: () => <div data-testid="data-table" />,
}))

jest.mock("@/components/shared/Pagination", () => ({
  __esModule: true,
  default: () => <div data-testid="pagination" />,
}))

jest.mock("@/components/shared/LoadingSkeleton", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-skeleton" />,
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

jest.mock("lucide-react", () => ({
  BarChart3: () => <svg />,
  Shield: () => <svg />,
  Activity: () => <svg />,
  Users: () => <svg />,
  FileText: () => <svg />,
  Map: () => <svg />,
  Search: () => <svg />,
  ArrowUpDown: () => <svg />,
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
    data: { data: { total_logs: 100, logs_today: 5, top_actions: [], top_actors: [] } },
    isLoading: false,
  }),
  useAuditLogs: () => ({
    data: { data: { logs: [], total: 0, limit: 15, offset: 0, has_more: false } },
    isLoading: false,
  }),
}))

jest.mock("@/hooks/feedback/useFeedback", () => ({
  useFeedbackStats: () => ({
    data: { data: {} },
    isLoading: false,
  }),
}))

jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useOrganizationManagement: () => ({
    data: { data: { organizations: [{ name: "TestOrg", status: true }], total: 1 } },
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
  it("renders the page title", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByText("Analytics & Logs")).toBeInTheDocument()
  })

  it("renders three tab triggers", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByTestId("tab-analytics")).toBeInTheDocument()
    expect(screen.getByTestId("tab-audit")).toBeInTheDocument()
    expect(screen.getByTestId("tab-project")).toBeInTheDocument()
  })

  it("renders stat cards in analytics tab", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByText("Total Users")).toBeInTheDocument()
    expect(screen.getByText("Feedback Submitted")).toBeInTheDocument()
    expect(screen.getByText("Audit Events Today")).toBeInTheDocument()
  })

  it("renders chart sections in analytics tab", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByTestId("data-card-Agent Usage Distribution")).toBeInTheDocument()
    expect(screen.getByTestId("data-card-Organizations")).toBeInTheDocument()
    expect(screen.getByTestId("data-card-Top Audit Actions")).toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })

  it("shows real org data instead of mock", () => {
    renderWithProviders(<SuperAdminAnalytics />)
    expect(screen.getByText("TestOrg")).toBeInTheDocument()
    expect(screen.getByText("1 total organizations")).toBeInTheDocument()
  })
})
