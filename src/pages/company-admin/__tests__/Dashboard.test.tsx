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

  it("renders placeholder data notice", () => {
    render(<CompanyAdminDashboard />);
    expect(
      screen.getByText("admin:companyAdmin.placeholder")
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

  it("renders department data cards", () => {
    render(<CompanyAdminDashboard />);
    // Department names appear in departments cards and teams table
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sales").length).toBeGreaterThan(0);
  });

  it("renders teams table with fallback data", () => {
    render(<CompanyAdminDashboard />);
    expect(screen.getByText("Frontend Team")).toBeInTheDocument();
    expect(screen.getByText("Backend Team")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Sales")).toBeInTheDocument();
  });

  it("renders training progress bars", () => {
    render(<CompanyAdminDashboard />);
    expect(screen.getAllByTestId("progress-bar").length).toBeGreaterThan(0);
  });

  it("renders organization health metrics", () => {
    render(<CompanyAdminDashboard />);
    expect(screen.getByText("Employee Engagement")).toBeInTheDocument();
    expect(screen.getByText("Retention Rate")).toBeInTheDocument();
    expect(screen.getByText("PRISM Alignment")).toBeInTheDocument();
  });

  it("navigates on stat card click", () => {
    render(<CompanyAdminDashboard />);
    const totalEmployeesCard = screen.getByText(
      "admin:companyAdmin.totalEmployees"
    );
    totalEmployeesCard.closest("button")?.click();
    expect(mockNavigate).toHaveBeenCalledWith("/company-admin/users");
  });
});
