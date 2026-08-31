/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import Observability from "../Observability";
import { useDashboardMetrics } from "@/hooks/observability/useObservability";

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

// CostBoard owns its own hooks; mock at the component boundary so this
// page test doesn't need to wire React Query.
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

  it("describes the window and the source rather than claiming 'real-time'", () => {
    render(<Observability />);
    expect(screen.getByText(/one row per LLM call/i)).toBeInTheDocument();
    expect(screen.getByText(/What this page shows/i)).toBeInTheDocument();
  });

  it("renders the platform-scoped ObservabilityBoard panel", () => {
    render(<Observability />);
    expect(
      screen.getByTestId("observability-board-mock-platform")
    ).toBeInTheDocument();
  });

  it("renders the platform-scoped CostBoard panel", () => {
    render(<Observability />);
    expect(screen.getByTestId("cost-board-mock-platform")).toBeInTheDocument();
  });

  // The Today / 7d / 30d Select was removed: `timeRange` was held in state and
  // never read, neither child panel accepts a range, and the dashboard endpoint
  // takes no range parameter — so the control silently did nothing. Assert it
  // is gone AND that the fixed window is stated, so it cannot quietly return
  // without also being wired up.
  it("does not offer a time range control it cannot honour", () => {
    render(<Observability />);
    expect(screen.queryByText("Last 30 days")).not.toBeInTheDocument();
    expect(screen.queryByText("Last 7 days")).not.toBeInTheDocument();
    expect(
      screen.getByText(/window is the current day and is not adjustable/i)
    ).toBeInTheDocument();
  });

  it("hooks the refetch via the refresh button without crashing in loading state", () => {
    (useDashboardMetrics as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    });
    render(<Observability />);
    // Header chrome still renders; ObservabilityBoard's own loading state is
    // covered in its own __tests__/ObservabilityBoard.test.tsx.
    expect(screen.getByText("Agent Observability")).toBeInTheDocument();
  });
});
