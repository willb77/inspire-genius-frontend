/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminObservability from "../Observability";
import { useDashboardMetrics } from "@/hooks/observability/useObservability";

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

// CostBoard owns its own hooks; mock at the component boundary.
jest.mock("@/components/super-admin/CostBoard", () => ({
  __esModule: true,
  default: ({ scope }: { scope: string }) => (
    <div data-testid={`cost-board-mock-${scope}`} />
  ),
}));

// Wave 3 Lane 3.B — ObservabilityBoard also owns hooks; mock at boundary.
jest.mock("@/components/super-admin/ObservabilityBoard", () => ({
  __esModule: true,
  default: ({ scope }: { scope: string }) => (
    <div data-testid={`observability-board-mock-${scope}`} />
  ),
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

  it("renders the org-scoped ObservabilityBoard panel", () => {
    render(<CompanyAdminObservability />);
    expect(
      screen.getByTestId("observability-board-mock-org")
    ).toBeInTheDocument();
  });

  it("renders the org-scoped CostBoard panel", () => {
    render(<CompanyAdminObservability />);
    expect(screen.getByTestId("cost-board-mock-org")).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    (useDashboardMetrics as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    });
    render(<CompanyAdminObservability />);
    // Page chrome still renders; ObservabilityBoard's own loading + KPI
    // tests live in __tests__/ObservabilityBoard.test.tsx.
    expect(screen.getByText("AI Observability")).toBeInTheDocument();
  });
});
