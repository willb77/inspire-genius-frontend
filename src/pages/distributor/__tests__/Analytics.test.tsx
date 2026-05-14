/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import DistributorAnalytics from "../Analytics";

jest.mock("@/layouts/DistributorLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="distributor-layout">{children}</div>,
}));
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
  ),
}));
jest.mock("@/components/dashboard/ProgressBar", () => ({
  __esModule: true,
  default: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="progress-bar">{label} {value}%</div>
  ),
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));
// Wave 1 Lane 1.D — page now uses ChartKit; mock recharts so the kit
// renders without canvas.
jest.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

const mockUseDistributorAnalytics = jest.fn();
jest.mock("@/hooks/analytics/useAnalytics", () => ({
  useDistributorAnalytics: () => mockUseDistributorAnalytics(),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("DistributorAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDistributorAnalytics.mockReturnValue(hookDefaults);
  });

  it("renders page title and description", () => {
    render(<DistributorAnalytics />);
    expect(screen.getByText("Territory Analytics")).toBeInTheDocument();
    expect(screen.getByText(/Territory performance, practitioner utilization/)).toBeInTheDocument();
  });

  it("renders inside DistributorLayout", () => {
    render(<DistributorAnalytics />);
    expect(screen.getByTestId("distributor-layout")).toBeInTheDocument();
  });

  it("renders ChartKit chart cards via DataCard titles", () => {
    render(<DistributorAnalytics />);
    expect(screen.getByTestId("data-card-Credits Used by Region")).toBeInTheDocument();
    expect(screen.getByTestId("data-card-Practitioner Utilization")).toBeInTheDocument();
    expect(screen.getByTestId("data-card-Credit Flow (6 months)")).toBeInTheDocument();
  });

  it("renders practitioner utilization progress bars", () => {
    render(<DistributorAnalytics />);
    expect(screen.getAllByTestId("progress-bar").length).toBeGreaterThan(0);
  });

  it("shows loading skeletons (ChartKit + standalone Skeleton in ProgressBar card)", () => {
    mockUseDistributorAnalytics.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<DistributorAnalytics />);
    expect(screen.getAllByTestId("chartkit-loading-skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message and retry", () => {
    mockUseDistributorAnalytics.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<DistributorAnalytics />);
    expect(screen.getAllByText(/Failed to load analytics data/).length).toBeGreaterThan(0);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });
});
