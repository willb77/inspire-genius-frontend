/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerLeadership from "../Leadership";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, badge, children }: any) => (
    <div data-testid={`data-card-${title}`}>
      {badge != null && <span data-testid="badge">{badge}</span>}
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

const mockRefetch = jest.fn();

jest.mock("@/hooks/manager/useManagerTeam", () => ({
  useManagerLeadership: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("ManagerLeadership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerLeadership />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerLeadership />);
    expect(screen.getByText("Leadership")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track leadership development, potential assessments, and program progress."
      )
    ).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<ManagerLeadership />);
    expect(screen.getByText("Total Leaders")).toBeInTheDocument();
    expect(screen.getByText("Avg Score")).toBeInTheDocument();
    expect(screen.getByText("High Potential")).toBeInTheDocument();
    expect(screen.getByText("Programs Active")).toBeInTheDocument();
  });

  it("renders fallback leaders in table", () => {
    render(<ManagerLeadership />);
    expect(screen.getByText("James Wilson")).toBeInTheDocument();
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    expect(screen.getByText("Priya Patel")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<ManagerLeadership />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Leadership Score")).toBeInTheDocument();
    expect(screen.getByText("Potential")).toBeInTheDocument();
    expect(screen.getByText("Programs Completed")).toBeInTheDocument();
    expect(screen.getByText("Next Step")).toBeInTheDocument();
  });

  it("renders next step recommendations", () => {
    render(<ManagerLeadership />);
    expect(screen.getByText("Executive Coaching")).toBeInTheDocument();
    expect(screen.getByText("Tech Lead Certification")).toBeInTheDocument();
  });

  it("shows error message with retry", () => {
    const { useManagerLeadership } = require("@/hooks/manager/useManagerTeam");
    (useManagerLeadership as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerLeadership />);
    expect(
      screen.getByText("Failed to load leadership data.")
    ).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerLeadership } = require("@/hooks/manager/useManagerTeam");
    (useManagerLeadership as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerLeadership />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
