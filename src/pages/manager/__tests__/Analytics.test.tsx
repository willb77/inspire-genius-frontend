/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerAnalytics from "../Analytics";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, className, children }: any) => (
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

// Mock recharts to avoid SVG rendering issues in jsdom
jest.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
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

  it("renders chart data cards", () => {
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
    const { useManagerAnalytics } = require("@/hooks/analytics/useAnalytics");
    (useManagerAnalytics as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerAnalytics />);
    expect(
      screen.getByText("Failed to load analytics data.")
    ).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerAnalytics } = require("@/hooks/analytics/useAnalytics");
    (useManagerAnalytics as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerAnalytics />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
