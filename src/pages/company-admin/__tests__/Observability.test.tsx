/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminObservability from "../Observability";

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="company-admin-layout">{children}</div>
  ),
}));

jest.mock("@/hooks/observability/useObservability", () => ({
  useDashboardMetrics: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

describe("CompanyAdminObservability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminObservability />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<CompanyAdminObservability />);
    expect(screen.getByText("AI Observability")).toBeInTheDocument();
  });

  it("renders metric card titles", () => {
    render(<CompanyAdminObservability />);
    expect(screen.getByText("Responses Today")).toBeInTheDocument();
    expect(screen.getByText("Avg Latency")).toBeInTheDocument();
    expect(screen.getByText("Total Cost")).toBeInTheDocument();
    expect(screen.getByText("Avg Confidence")).toBeInTheDocument();
    expect(screen.getByText("Unique Users")).toBeInTheDocument();
    expect(screen.getByText("Error Rate")).toBeInTheDocument();
  });

  it("renders Agent Performance card", () => {
    render(<CompanyAdminObservability />);
    expect(screen.getByText("Agent Performance")).toBeInTheDocument();
  });

  it("renders Cost by Model Tier card", () => {
    render(<CompanyAdminObservability />);
    expect(screen.getByText("Cost by Model Tier")).toBeInTheDocument();
  });

  it("shows no data messages when metrics are empty", () => {
    render(<CompanyAdminObservability />);
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

    render(<CompanyAdminObservability />);
    const loadingTexts = screen.getAllByText("Loading...");
    expect(loadingTexts.length).toBeGreaterThan(0);
  });

  it("renders metric values when data is present", () => {
    const { useDashboardMetrics } = require("@/hooks/observability/useObservability");
    (useDashboardMetrics as jest.Mock).mockReturnValue({
      data: {
        total_responses_today: 42,
        avg_latency_ms: 250,
        total_cost_today: 1.5678,
        avg_confidence: 0.85,
        unique_users_today: 10,
        error_rate: 0.02,
        top_agents: [
          { agent: "Meridian", count: 20, avg_confidence: 0.9 },
        ],
        cost_by_model: [
          { model_tier: "tier_1", cost: 0.5, count: 10 },
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<CompanyAdminObservability />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("250ms")).toBeInTheDocument();
    expect(screen.getByText("$1.5678")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Meridian")).toBeInTheDocument();
  });
});
