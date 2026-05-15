/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import PractitionerAnalytics from "../Analytics";

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}));
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
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
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

const mockUsePractitionerAnalytics = jest.fn();
jest.mock("@/hooks/analytics/useAnalytics", () => ({
  usePractitionerAnalytics: () => mockUsePractitionerAnalytics(),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("PractitionerAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePractitionerAnalytics.mockReturnValue(hookDefaults);
  });

  it("renders page title and description", () => {
    render(<PractitionerAnalytics />);
    expect(screen.getByText("Practice Analytics")).toBeInTheDocument();
    expect(screen.getByText(/Client engagement, session frequency/)).toBeInTheDocument();
  });

  it("renders inside PractitionerLayout", () => {
    render(<PractitionerAnalytics />);
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument();
  });

  it("renders ChartKit chart cards via DataCard titles", () => {
    render(<PractitionerAnalytics />);
    expect(screen.getByTestId("data-card-Client Engagement (Top 6)")).toBeInTheDocument();
    expect(screen.getByTestId("data-card-Weekly Session Frequency")).toBeInTheDocument();
    expect(screen.getByTestId("data-card-PRISM Completion Rates")).toBeInTheDocument();
  });

  it("shows ChartKit loading skeletons", () => {
    mockUsePractitionerAnalytics.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<PractitionerAnalytics />);
    expect(screen.getAllByTestId("chartkit-loading-skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message and retry", () => {
    mockUsePractitionerAnalytics.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<PractitionerAnalytics />);
    expect(screen.getAllByText(/Failed to load analytics data/).length).toBeGreaterThan(0);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders PRISM completion legend (only when data is ready)", () => {
    render(<PractitionerAnalytics />);
    expect(screen.getByText(/Completed/)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/)).toBeInTheDocument();
    expect(screen.getByText(/Not Started/)).toBeInTheDocument();
  });
});
