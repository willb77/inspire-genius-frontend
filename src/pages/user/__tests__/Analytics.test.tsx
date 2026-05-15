/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

import { render, screen } from "@testing-library/react";
import UserAnalytics from "../Analytics";

const mockToastInfo = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`data-card-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <span>{title}</span>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Mock recharts to avoid SVG rendering issues in jsdom
jest.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

const mockUseUserAnalytics = jest.fn();
jest.mock("@/hooks/analytics/useAnalytics", () => ({
  useUserAnalytics: () => mockUseUserAnalytics(),
}));

const mockRefetch = jest.fn();

function setHookState(state: Partial<{ data: unknown; isLoading: boolean; isSuccess: boolean; error: unknown }>) {
  mockUseUserAnalytics.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isSuccess: state.isSuccess ?? false,
    error: state.error ?? null,
    refetch: mockRefetch,
  });
}

describe("UserAnalytics Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders inside UserLayout", () => {
    setHookState({ isLoading: true });
    render(<UserAnalytics />);
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
  });

  it("renders page title", () => {
    setHookState({ isLoading: true });
    render(<UserAnalytics />);
    expect(screen.getByText("Your Analytics")).toBeInTheDocument();
  });

  it("renders loading skeletons while fetching", () => {
    setHookState({ isLoading: true });
    render(<UserAnalytics />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders charts when data is present", () => {
    setHookState({
      isSuccess: true,
      data: {
        total_sessions: 12,
        session_trends: [
          { period: "2026-01", count: 4 },
          { period: "2026-02", count: 8 },
        ],
        goals_by_status: { completed: 3, in_progress: 2 },
        training: { total: 5, completed: 4, completion_pct: 80 },
      },
    });
    render(<UserAnalytics />);
    expect(screen.getByText("Session Activity")).toBeInTheDocument();
    expect(screen.getByText("Goals by Status")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("shows empty-state UI and toast when no data", () => {
    setHookState({
      isSuccess: true,
      data: {
        total_sessions: 0,
        session_trends: [],
        goals_by_status: {},
        training: { total: 0, completed: 0, completion_pct: 0 },
      },
    });
    render(<UserAnalytics />);
    expect(screen.getByText("No analytics yet")).toBeInTheDocument();
    expect(mockToastInfo).toHaveBeenCalledTimes(1);
    expect(mockToastInfo).toHaveBeenCalledWith(expect.stringContaining("No analytics yet"));
  });

  it("shows error message with retry on error", () => {
    setHookState({ error: new Error("fail") });
    render(<UserAnalytics />);
    expect(screen.getByText("Failed to load analytics.")).toBeInTheDocument();
  });
});
