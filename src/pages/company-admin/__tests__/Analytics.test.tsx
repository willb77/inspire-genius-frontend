/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminAnalytics from "../Analytics";
import { useCompanyAnalytics as useCompanyAnalyticsHookMock } from "@/hooks/analytics/useAnalytics";

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="company-admin-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) => (
    <div data-testid={`data-card-${title}`} className={className}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...rest }: { children: React.ReactNode; onClick?: () => void } & Record<string, unknown>) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Mock recharts so ChartKit renders without needing canvas
jest.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/analytics/useAnalytics", () => ({
  useCompanyAnalytics: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => "blob:mock");
global.URL.revokeObjectURL = jest.fn();

describe("CompanyAdminAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminAnalytics />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<CompanyAdminAnalytics />);
    expect(screen.getByText("Company Analytics")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Organization-level engagement, training, and cost metrics."
      )
    ).toBeInTheDocument();
  });

  it("renders placeholder data notice", () => {
    render(<CompanyAdminAnalytics />);
    expect(
      screen.getByText(
        "Analytics data is currently placeholder. Live metrics and reporting are in progress."
      )
    ).toBeInTheDocument();
  });

  it("renders ChartKit chart cards via DataCard titles", () => {
    render(<CompanyAdminAnalytics />);
    expect(
      screen.getByTestId("data-card-Department Comparison")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("data-card-Company Engagement Trend")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("data-card-License Utilization")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("data-card-Cost per User Trend")
    ).toBeInTheDocument();
  });

  it("renders export buttons", () => {
    render(<CompanyAdminAnalytics />);
    expect(screen.getByText("JSON")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("shows error message with retry on error", () => {
    (useCompanyAnalyticsHookMock as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<CompanyAdminAnalytics />);
    // Two error surfaces: the page-level retry banner + each chart's ErrorPill
    expect(
      screen.getAllByText(/Failed to load analytics data/i).length
    ).toBeGreaterThan(0);
  });

  it("shows ChartKit loading skeletons when loading", () => {
    (useCompanyAnalyticsHookMock as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<CompanyAdminAnalytics />);
    expect(
      screen.getAllByTestId("chartkit-loading-skeleton").length
    ).toBeGreaterThan(0);
  });
});
