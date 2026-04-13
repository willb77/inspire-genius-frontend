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
  default: ({ title, children }: any) => <div data-testid={`data-card-${title}`}>{children}</div>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));
jest.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children, label: _label }: any) => <div>{children}</div>,
  Cell: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
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

  it("renders charts with fallback data", () => {
    render(<PractitionerAnalytics />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUsePractitionerAnalytics.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<PractitionerAnalytics />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message and retry", () => {
    mockUsePractitionerAnalytics.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<PractitionerAnalytics />);
    expect(screen.getByText(/Failed to load analytics data/)).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders PRISM completion legend", () => {
    render(<PractitionerAnalytics />);
    expect(screen.getByText(/Completed/)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/)).toBeInTheDocument();
    expect(screen.getByText(/Not Started/)).toBeInTheDocument();
  });
});
