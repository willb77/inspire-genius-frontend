import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SuperAdminDashboard from "../Dashboard";

// ---------- MOCK LAYOUT ----------
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}));

// ---------- MOCK RADIX SELECT (portal-based) ----------
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
}));

// ---------- MOCK HOOKS ----------
jest.mock("@/hooks/super-admin/dashboard/useDashboardSystem", () => ({
  useDashboardSystem: () => ({
    data: {
      data: {
        organization_statistics: { total: 48, active: 42, inactive: 6 },
        business_statistics: { total: 120, active: 100, inactive: 20, by_type: { corporate: 80, education: 40 } },
      },
    },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/super-admin/user-management/useUserManagement", () => ({
  useUserManagement: () => ({
    data: {
      data: {
        users: [{ user_id: "1", full_name: "Test User", email: "test@test.com", role: "user", is_active: true, created_at: "2026-04-08T00:00:00Z" }],
        pagination: { total: 100, page: 1, limit: 5 },
      },
    },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/super-admin/coach-management/useCoaches", () => ({
  useCoachesList: () => ({
    data: { data: { agents: [{ id: "1", name: "Meridian", status: "active" }] } },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/audit/useAudit", () => ({
  useAuditStats: () => ({
    data: { data: { total_logs: 500, logs_today: 12 } },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/feedback/useFeedback", () => ({
  useFeedbackStats: () => ({
    data: { data: { total_count: 200, avg_rating: 4.3 } },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useCostDashboard: () => ({
    data: { data: { total_cost: 45678, cost_per_user: 3.55, total_sessions: 84320, breakdown: [], agent_costs: [] } },
    isLoading: false,
  }),
}));

// ---------- HELPERS ----------
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// ---------- TESTS ----------
describe("SuperAdminDashboard", () => {
  it("renders within SuperAdminLayout", () => {
    renderWithProviders(<SuperAdminDashboard />);
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument();
  });

  it("renders the page title", () => {
    renderWithProviders(<SuperAdminDashboard />);
    expect(screen.getByText("Platform Dashboard")).toBeInTheDocument();
  });

  it("renders the welcome banner", () => {
    renderWithProviders(<SuperAdminDashboard />);
    expect(screen.getByText("Inspire Genius Platform Overview")).toBeInTheDocument();
  });

  it("renders KPI stat cards with real data", () => {
    renderWithProviders(<SuperAdminDashboard />);
    expect(screen.getAllByText("Total Users").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Active Organizations").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Active Mentors/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Feedback Received")).toBeInTheDocument();
    expect(screen.getByText("Platform Cost (MTD)")).toBeInTheDocument();
  });

  it("renders the three tab triggers", () => {
    renderWithProviders(<SuperAdminDashboard />);
    expect(screen.getAllByText("Overview").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Organizations").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cost Analysis")).toBeInTheDocument();
  });

  it("renders Platform Summary on Overview tab", () => {
    renderWithProviders(<SuperAdminDashboard />);
    expect(screen.getByText("Platform Summary")).toBeInTheDocument();
  });

  it("renders Platform Health metrics", () => {
    renderWithProviders(<SuperAdminDashboard />);
    expect(screen.getByText("Platform Health")).toBeInTheDocument();
    expect(screen.getByText("Feedback Score")).toBeInTheDocument();
    expect(screen.getByText("Events Today")).toBeInTheDocument();
  });
});
