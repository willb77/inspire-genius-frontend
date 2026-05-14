/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerAnalytics from "../Analytics";
import { useManagerAnalytics as useManagerAnalyticsMock } from "@/hooks/analytics/useAnalytics";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
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

jest.mock("@/components/dashboard/PlaceholderBanner", () => ({
  __esModule: true,
  default: () => <div data-testid="placeholder-banner" />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Wave 1 Lane 1.A — page now uses ChartKit; mock recharts so the kit
// renders without canvas.
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

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/analytics/useAnalytics", () => ({
  useManagerAnalytics: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("ManagerAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerAnalytics />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerAnalytics />);
    expect(
      screen.getByText("Team Analytics (TODO: translate)")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track coaching engagement, goals, training, and hiring metrics."
      )
    ).toBeInTheDocument();
  });

  it("renders ChartKit chart cards via DataCard titles", () => {
    render(<ManagerAnalytics />);
    expect(
      screen.getByTestId("data-card-admin:manager.coachingEngagement")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("data-card-admin:manager.goalCompletion")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("data-card-admin:manager.memberPerformance")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("data-card-admin:manager.candidatesByStage")
    ).toBeInTheDocument();
    // Time to Hire still uses direct recharts (no kit horizontal-bar yet)
    expect(
      screen.getByTestId("data-card-admin:manager.timeToHire")
    ).toBeInTheDocument();
  });

  it("renders chart components", () => {
    render(<ManagerAnalytics />);
    expect(screen.getAllByTestId("bar-chart").length).toBeGreaterThan(0);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("shows error message with retry on error", () => {
    (useManagerAnalyticsMock as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerAnalytics />);
    expect(
      screen.getAllByText(/Failed to load analytics data/).length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows ChartKit loading skeletons when loading", () => {
    (useManagerAnalyticsMock as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerAnalytics />);
    // ChartKit skeleton on the 4 kit charts; plain Skeleton on the
    // still-direct Time to Hire card.
    expect(
      screen.getAllByTestId("chartkit-loading-skeleton").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
