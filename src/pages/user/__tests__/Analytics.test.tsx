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

/* ---- Mocks ---- */

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

jest.mock("@/components/dashboard/PlaceholderBanner", () => ({
  __esModule: true,
  default: () => <div data-testid="placeholder-banner" />,
}));

// Mock recharts to avoid SVG rendering issues in jsdom
jest.mock("recharts", () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => null,
}));

/* ---- Tests ---- */

describe("UserAnalytics Page", () => {
  it("renders inside UserLayout", () => {
    render(<UserAnalytics />);
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
  });

  it("renders page title", () => {
    render(<UserAnalytics />);
    expect(screen.getByText(/Your Analytics/)).toBeInTheDocument();
  });

  it("renders placeholder banner", () => {
    render(<UserAnalytics />);
    expect(screen.getByTestId("placeholder-banner")).toBeInTheDocument();
  });

  it("renders all chart cards", () => {
    render(<UserAnalytics />);
    expect(screen.getByText("Sessions Per Week")).toBeInTheDocument();
    expect(screen.getByText("Goals Progress")).toBeInTheDocument();
    expect(screen.getByText("Most-Used Agents")).toBeInTheDocument();
    expect(screen.getByText("Satisfaction Trend")).toBeInTheDocument();
    expect(screen.getByText("PRISM Growth Trajectory")).toBeInTheDocument();
  });

  it("renders chart components", () => {
    render(<UserAnalytics />);
    expect(screen.getAllByTestId("line-chart")).toHaveLength(2);
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});
