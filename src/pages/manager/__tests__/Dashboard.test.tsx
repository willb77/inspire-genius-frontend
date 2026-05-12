/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerDashboard from "../Dashboard";

// ── Layout mock ──
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

// ── Dashboard component mocks ──
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

jest.mock("@/components/dashboard/StatusBadge", () => ({
  __esModule: true,
  default: ({ label }: any) => <span data-testid="status-badge">{label}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// ── Auth mock ──
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { fullName: "Test Manager", name: "Test" },
  }),
}));

// ── Hooks mock ──
const mockRefetch = jest.fn();

jest.mock("@/hooks/manager/useManagerTeam", () => ({
  useManagerTeam: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
  useManagerHiringStats: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
  useManagerInterviews: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

// ── i18n mock ──
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

describe("ManagerDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerDashboard />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders welcome banner with manager title", () => {
    render(<ManagerDashboard />);
    expect(screen.getByTestId("welcome-banner")).toBeInTheDocument();
    expect(screen.getByText("admin:manager.title")).toBeInTheDocument();
  });

  it("renders welcome banner with personalized subtitle", () => {
    render(<ManagerDashboard />);
    expect(
      screen.getByText(/Welcome back, Test Manager/)
    ).toBeInTheDocument();
  });

  it("renders stat cards with translated labels", () => {
    render(<ManagerDashboard />);
    expect(screen.getByText("admin:manager.teamMembers")).toBeInTheDocument();
    expect(screen.getByText("admin:manager.goals")).toBeInTheDocument();
    expect(screen.getByText("admin:manager.prismScore")).toBeInTheDocument();
    expect(screen.getByText("admin:manager.trainingOverview")).toBeInTheDocument();
  });

  it("renders empty-state when no interviews", () => {
    render(<ManagerDashboard />);
    expect(screen.getByText("No interviews scheduled.")).toBeInTheDocument();
  });

  it("renders empty-state when no team members", () => {
    render(<ManagerDashboard />);
    expect(screen.getByText("No direct reports yet.")).toBeInTheDocument();
  });

  it("shows loading skeletons when data is loading", () => {
    const { useManagerTeam, useManagerHiringStats, useManagerInterviews } =
      require("@/hooks/manager/useManagerTeam");

    (useManagerTeam as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    (useManagerHiringStats as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    (useManagerInterviews as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerDashboard />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders action buttons in welcome banner", () => {
    render(<ManagerDashboard />);
    expect(screen.getByText("admin:manager.viewReports")).toBeInTheDocument();
    expect(screen.getByText("admin:manager.schedule1on1")).toBeInTheDocument();
  });
});
