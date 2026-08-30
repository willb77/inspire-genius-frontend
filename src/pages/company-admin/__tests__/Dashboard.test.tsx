/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminDashboard from "../Dashboard";

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="company-admin-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/WelcomeBanner", () => ({
  __esModule: true,
  default: ({ title, subtitle, children }: any) => (
    <div data-testid="welcome-banner">
      <span>{title}</span>
      <span>{subtitle}</span>
      {children}
    </div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
  ),
}));

jest.mock("@/components/dashboard/ProgressBar", () => ({
  __esModule: true,
  default: ({ label }: any) => <div data-testid="progress-bar">{label}</div>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { organizationName: "Acme Corp" },
  }),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/company-admin/useCompanyAdmin", () => ({
  useCompanyDepartments: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
  useCompanyAnalytics: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
}));

type RollupHookReturn = {
  data: {
    coverage_percent: number;
    active_today: number;
    avg_sessions_per_user: number;
    monthly_llm_cost_usd: number;
  } | null;
  isLoading: boolean;
  error: unknown;
};

const mockUseObservabilityRollup = jest.fn<RollupHookReturn, []>(() => ({
  data: null,
  isLoading: false,
  error: null,
}));
jest.mock("@/hooks/company-admin/useObservabilityRollup", () => ({
  useObservabilityRollup: () => mockUseObservabilityRollup(),
}));

describe("CompanyAdminDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminDashboard />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders welcome banner with org name", () => {
    render(<CompanyAdminDashboard />);
    expect(screen.getByTestId("welcome-banner")).toBeInTheDocument();
    expect(
      screen.getByText(/Acme Corp.*admin:companyAdmin.dashboard/)
    ).toBeInTheDocument();
  });

  it("renders stat cards with translated labels", () => {
    render(<CompanyAdminDashboard />);
    expect(
      screen.getByText("admin:companyAdmin.totalEmployees")
    ).toBeInTheDocument();
    expect(
      screen.getByText("admin:companyAdmin.activeTeams")
    ).toBeInTheDocument();
    expect(
      screen.getByText("admin:companyAdmin.trainingCompletion")
    ).toBeInTheDocument();
    expect(
      screen.getByText("admin:companyAdmin.prismAssessed")
    ).toBeInTheDocument();
  });

  it("renders empty-state when no departments returned", () => {
    render(<CompanyAdminDashboard />);
    expect(
      screen.getByText(/No departments yet/)
    ).toBeInTheDocument();
  });

  it("navigates on stat card click", () => {
    render(<CompanyAdminDashboard />);
    const totalEmployeesCard = screen.getByText(
      "admin:companyAdmin.totalEmployees"
    );
    totalEmployeesCard.closest("button")?.click();
    expect(mockNavigate).toHaveBeenCalledWith("/company-admin/users");
  });

  // Surface 4 (wiring plan §4) — Admin Surfaces tile grid + rollups row.
  it("renders the Admin Surfaces tile grid with 8 quick-links", () => {
    render(<CompanyAdminDashboard />);
    expect(
      screen.getByTestId("data-card-Admin Surfaces")
    ).toBeInTheDocument();
    // Each of the 8 surface labels should render as a clickable tile.
    [
      "Users",
      "Organization",
      "Costs",
      "Culture Docs",
      "Observability",
      "Analytics",
      "Bulk Import",
      "Settings",
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("navigates to the right route when an Admin Surfaces tile is clicked", () => {
    render(<CompanyAdminDashboard />);
    screen.getByText("Observability").closest("button")?.click();
    expect(mockNavigate).toHaveBeenCalledWith("/company-admin/observability");

    screen.getByText("Costs").closest("button")?.click();
    expect(mockNavigate).toHaveBeenCalledWith(
      "/company-admin/analytics?tab=costs"
    );
  });

  it("renders the Org Rollups KPI row with zeros when no data", () => {
    render(<CompanyAdminDashboard />);
    const rollupsCard = screen.getByTestId("data-card-Org Rollups");
    expect(rollupsCard).toBeInTheDocument();
    // Scope assertions to the rollups card — the top KPI strip also
    // renders "0%" cells for training/PRISM which would clash with
    // a global getByText.
    const within = (text: string) =>
      Array.from(rollupsCard.querySelectorAll("*")).some(
        (el) => el.textContent === text,
      );
    expect(within("Coverage")).toBe(true);
    expect(within("Active Today")).toBe(true);
    expect(within("Avg Sessions per User")).toBe(true);
    expect(within("Monthly LLM Cost")).toBe(true);
    expect(within("0%")).toBe(true);
    expect(within("0.00")).toBe(true);
    expect(within("$0.00")).toBe(true);
  });

  it("renders rollup values when the hook returns data", () => {
    mockUseObservabilityRollup.mockReturnValueOnce({
      data: {
        coverage_percent: 73,
        active_today: 18,
        avg_sessions_per_user: 4.25,
        monthly_llm_cost_usd: 142.5,
      },
      isLoading: false,
      error: null,
    });
    render(<CompanyAdminDashboard />);
    expect(screen.getByText("73%")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("4.25")).toBeInTheDocument();
    expect(screen.getByText("$142.50")).toBeInTheDocument();
  });

  it("shows skeletons while the rollups hook is loading", () => {
    mockUseObservabilityRollup.mockReturnValueOnce({
      data: null,
      isLoading: true,
      error: null,
    });
    render(<CompanyAdminDashboard />);
    // 4 rollup skeletons should render in the Org Rollups card.
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(4);
  });
});
