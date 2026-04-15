/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import Observability from "../Observability";

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}));

jest.mock("@/hooks/observability/useObservability", () => ({
  useDashboardMetrics: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

describe("SuperAdmin Observability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within SuperAdminLayout", () => {
    render(<Observability />);
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<Observability />);
    expect(screen.getByText("Agent Observability")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<Observability />);
    expect(
      screen.getByText(
        "Real-time transparency into AI agent decisions, costs, and performance"
      )
    ).toBeInTheDocument();
  });

  it("renders metric card titles", () => {
    render(<Observability />);
    expect(screen.getByText("Responses Today")).toBeInTheDocument();
    expect(screen.getByText("Avg Latency")).toBeInTheDocument();
    expect(screen.getByText("Total Cost")).toBeInTheDocument();
    expect(screen.getByText("Avg Confidence")).toBeInTheDocument();
    expect(screen.getByText("Unique Users")).toBeInTheDocument();
    expect(screen.getByText("Total Tokens")).toBeInTheDocument();
    expect(screen.getByText("Error Rate")).toBeInTheDocument();
  });

  it("renders Top Agents card", () => {
    render(<Observability />);
    expect(screen.getByText("Top Agents by Usage")).toBeInTheDocument();
  });

  it("renders Cost by Model Tier card", () => {
    render(<Observability />);
    expect(screen.getByText("Cost by Model Tier")).toBeInTheDocument();
  });

  it("renders time range selector", () => {
    render(<Observability />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("shows no data messages when metrics are empty", () => {
    render(<Observability />);
    expect(screen.getByText("No agent data available")).toBeInTheDocument();
    expect(screen.getByText("No cost data available")).toBeInTheDocument();
  });

  it("shows loading state when isLoading is true", () => {
    const { useDashboardMetrics } = require("@/hooks/observability/useObservability");
    (useDashboardMetrics as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    });

    render(<Observability />);
    const loadingTexts = screen.getAllByText("Loading...");
    expect(loadingTexts.length).toBeGreaterThan(0);
  });

  it("renders metric values when data is present", () => {
    const { useDashboardMetrics } = require("@/hooks/observability/useObservability");
    (useDashboardMetrics as jest.Mock).mockReturnValue({
      data: {
        total_responses_today: 100,
        avg_latency_ms: 180,
        total_cost_today: 2.3456,
        avg_confidence: 0.92,
        unique_users_today: 25,
        total_tokens_today: 50000,
        error_rate: 0.01,
        top_agents: [
          { agent: "Meridian", count: 50, avg_confidence: 0.95 },
          { agent: "Sage", count: 30, avg_confidence: 0.88 },
        ],
        cost_by_model: [
          { model_tier: "tier_1", cost: 1.2, count: 40 },
          { model_tier: "tier_2", cost: 1.1456, count: 60 },
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<Observability />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("180ms")).toBeInTheDocument();
    expect(screen.getByText("$2.3456")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("50,000")).toBeInTheDocument();
    expect(screen.getByText("Meridian")).toBeInTheDocument();
    expect(screen.getByText("Sage")).toBeInTheDocument();
  });

  it("renders Export button", () => {
    render(<Observability />);
    expect(screen.getByText("Export")).toBeInTheDocument();
  });
});
